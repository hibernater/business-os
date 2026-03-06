"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Timer,
  Calendar,
} from "lucide-react";
import {
  fetchSchedules,
  createSchedule,
  deleteSchedule,
  toggleSchedule,
  fetchSkills,
  getToken,
  type ScheduleInfo,
  type SkillInfo,
} from "@/lib/api";

export function SchedulePanel() {
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [s, sk] = await Promise.all([fetchSchedules(token), fetchSkills(token)]);
      setSchedules(s);
      setSkills(sk);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token) return;
    await deleteSchedule(token, id);
    setSchedules((prev) => prev.filter((s) => s.scheduleId !== id));
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const token = getToken();
    if (!token) return;
    await toggleSchedule(token, id, !enabled);
    setSchedules((prev) =>
      prev.map((s) => (s.scheduleId === id ? { ...s, enabled: !enabled } : s))
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const getSkillName = (skillId: string) =>
    skills.find((s) => s.skill_id === skillId)?.name ?? skillId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">定时任务</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {schedules.length} 个
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          新建定时
        </button>
      </div>

      {showCreate && (
        <CreateScheduleDialog
          skills={skills}
          onCreated={(s) => {
            setSchedules((prev) => [s, ...prev]);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {schedules.length === 0 && !showCreate && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">暂无定时任务</p>
          <p className="mt-1 text-xs text-gray-400">
            设置定时任务后，Skill 会按计划自动执行
          </p>
        </div>
      )}

      <div className="space-y-2">
        {schedules.map((s) => (
          <div
            key={s.scheduleId}
            className={`rounded-xl border bg-white p-4 transition-colors ${
              s.enabled ? "border-gray-200" : "border-gray-100 opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  s.enabled ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                {s.enabled ? (
                  <Play className="h-4 w-4 text-green-500" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{getSkillName(s.skillId)}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {s.cronExpr
                      ? `Cron: ${s.cronExpr}`
                      : `每 ${s.intervalMinutes} 分钟`}
                  </span>
                  {s.lastRunAt && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {s.lastStatus === "success" ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400" />
                      )}
                      上次: {new Date(s.lastRunAt).toLocaleString("zh-CN")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(s.scheduleId, s.enabled)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title={s.enabled ? "暂停" : "启用"}
                >
                  {s.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(s.scheduleId)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateScheduleDialog({
  skills,
  onCreated,
  onCancel,
}: {
  skills: SkillInfo[];
  onCreated: (s: ScheduleInfo) => void;
  onCancel: () => void;
}) {
  const [skillId, setSkillId] = useState(skills[0]?.skill_id ?? "");
  const [mode, setMode] = useState<"cron" | "interval">("interval");
  const [cronExpr, setCronExpr] = useState("0 8 * * *");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const cronPresets = [
    { label: "每天 8:00", value: "0 8 * * *" },
    { label: "每天 9:00", value: "0 9 * * *" },
    { label: "工作日 9:00", value: "0 9 * * 1-5" },
    { label: "每周一 9:00", value: "0 9 * * 1" },
  ];

  const handleSubmit = async () => {
    const token = getToken();
    if (!token || !skillId) return;
    setSubmitting(true);
    setError("");
    try {
      const s = await createSchedule(
        token,
        skillId,
        mode === "cron" ? cronExpr : "",
        mode === "interval" ? intervalMinutes : 0,
      );
      onCreated(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">新建定时任务</h3>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">选择 Skill</label>
        <select
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        >
          {skills.map((s) => (
            <option key={s.skill_id} value={s.skill_id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">调度方式</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("interval")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === "interval"
                ? "bg-indigo-500 text-white"
                : "bg-white border border-gray-300 text-gray-600"
            }`}
          >
            固定间隔
          </button>
          <button
            onClick={() => setMode("cron")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === "cron"
                ? "bg-indigo-500 text-white"
                : "bg-white border border-gray-300 text-gray-600"
            }`}
          >
            定时执行
          </button>
        </div>
      </div>

      {mode === "interval" ? (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            执行间隔（分钟）
          </label>
          <input
            type="number"
            min={1}
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            每 {intervalMinutes} 分钟自动执行一次
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cron 表达式</label>
          <input
            type="text"
            value={cronExpr}
            onChange={(e) => setCronExpr(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cronPresets.map((p) => (
              <button
                key={p.value}
                onClick={() => setCronExpr(p.value)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  cronExpr === p.value
                    ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !skillId}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          创建
        </button>
      </div>
    </div>
  );
}
