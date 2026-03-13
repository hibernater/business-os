"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  Package,
  Upload,
  MessageSquare,
  Sparkles,
  Play,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Heart,
  Search,
  DollarSign,
  Users,
  RotateCcw,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Briefcase,
  UserCheck,
  Wallet,
} from "lucide-react";
import {
  getToken,
  getAuthData,
  fetchSkillRecommendations,
  fetchTasks,
  fetchDigitalTwin,
  createTask,
  streamChat,
  type SkillRecommendation,
  type TaskInfo,
  type DigitalTwinData,
} from "@/lib/api";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  "dollar-sign": DollarSign,
  users: Users,
  "rotate-ccw": RotateCcw,
  "bar-chart": BarChart3,
};

const DIM_META: Record<string, { label: string; icon: typeof ShoppingBag }> = {
  product: { label: "商品", icon: ShoppingBag },
  customer: { label: "客户", icon: UserCheck },
  operation: { label: "运营", icon: TrendingUp },
  team: { label: "团队", icon: Briefcase },
  financial: { label: "财务", icon: Wallet },
};

interface HomePanelProps {
  onNavigate: (view: string) => void;
}

export function HomePanel({ onNavigate }: HomePanelProps) {
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>([]);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [twin, setTwin] = useState<DigitalTwinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningSkill, setRunningSkill] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const auth = getAuthData();
    if (!token) return;

    setLoading(true);
    Promise.all([
      auth?.enterpriseId ? fetchSkillRecommendations(token, auth.enterpriseId) : Promise.resolve([]),
      fetchTasks(token).catch(() => ({ tasks: [], total: 0, running: 0, failed: 0, pending: 0, todayCompleted: 0 })),
      fetchDigitalTwin(token).catch(() => null),
    ]).then(([recs, taskData, twinData]) => {
      setRecommendations(recs);
      const allTasks = taskData.tasks || [];
      const running = allTasks.filter((t: TaskInfo) => t.status === "running");
      const recent = allTasks.filter((t: TaskInfo) => t.status === "completed").slice(0, 3);
      setTasks([...running, ...recent].slice(0, 5));
      setTwin(twinData);
    }).finally(() => setLoading(false));
  }, []);

  const handleRunSkill = async (rec: SkillRecommendation) => {
    const token = getToken();
    if (!token) return;
    setRunningSkill(rec.skill_id);
    try {
      const result = await createTask(token, {
        skillId: rec.skill_id,
        skillName: rec.name,
        triggerType: "manual",
        totalSteps: 3,
      });
      if (result.status === "ok" && result.task?.id) {
        setTaskCreated(rec.skill_id);
        streamChat(rec.name, null, token, { autoExecute: true, taskId: result.task.id }).catch(() => {});
        setTimeout(() => setTaskCreated(null), 4000);
      }
    } catch { /* ignore */ }
    setRunningSkill(null);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* 欢迎 + 快捷操作 */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-900 mb-1">工作台</h1>
          <p className="text-[13px] text-gray-500 mb-5">AI 帮你管理生意，越用越懂你</p>

          <div className="grid grid-cols-3 gap-3">
            <QuickAction
              icon={Package} color="indigo"
              label="执行 Skill" desc="选一个 Skill 开始分析"
              onClick={() => onNavigate("skills")}
            />
            <QuickAction
              icon={Upload} color="emerald"
              label="上传文档" desc="传文件，AI 自动识别"
              onClick={() => onNavigate("skills")}
            />
            <QuickAction
              icon={MessageSquare} color="blue"
              label="问 AI" desc="自由对话，随便问"
              onClick={() => onNavigate("chat")}
            />
          </div>
        </div>

        {/* 为你推荐 */}
        {recommendations.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-[14px] font-semibold text-gray-900">为你推荐</h2>
              </div>
              <button onClick={() => onNavigate("skills")}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600"
              >
                查看全部 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(recommendations.length, 3)}, 1fr)` }}>
              {recommendations.map((rec) => {
                const Icon = ICON_MAP[rec.icon] || Package;
                const isCreated = taskCreated === rec.skill_id;
                const isRunning = runningSkill === rec.skill_id;
                return (
                  <div key={rec.skill_id}
                    className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                        <Icon className="h-4 w-4 text-amber-600" />
                      </div>
                      <h3 className="text-[13px] font-semibold text-gray-900">{rec.name}</h3>
                    </div>
                    <p className="text-[12px] text-amber-700 leading-relaxed mb-3">{rec.reason}</p>
                    {isCreated ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> 任务已创建
                      </span>
                    ) : (
                      <button onClick={() => handleRunSkill(rec)} disabled={isRunning}
                        className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                      >
                        {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        立即使用
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 进行中的任务 */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold text-gray-900">任务动态</h2>
              <button onClick={() => onNavigate("tasks")}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600"
              >
                全部任务 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onClick={() => onNavigate("tasks")} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                <p className="text-[12px] text-gray-400">暂无任务</p>
                <p className="text-[11px] text-gray-300 mt-1">执行 Skill 后这里会显示进度</p>
              </div>
            )}
          </section>

          {/* 经营概览 */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold text-gray-900">经营概览</h2>
              <button onClick={() => onNavigate("twin")}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600"
              >
                详情 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {twin ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={twin.health >= 70 ? "#22c55e" : twin.health >= 40 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="3" strokeDasharray={`${twin.health}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[14px] font-bold text-gray-900">{twin.health}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-gray-900">健康度 {twin.health} 分</div>
                    <div className="text-[11px] text-gray-400">
                      {twin.totalAssets} 项资产 · {twin.totalExecutions} 次分析
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {Object.entries(twin.dimensions || {}).map(([key, dim]) => {
                    const meta = DIM_META[key];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <div key={key} className="rounded-lg bg-gray-50 p-2 text-center">
                        <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-gray-400" />
                        <div className="text-[10px] text-gray-500">{meta.label}</div>
                        <div className="text-[12px] font-semibold text-gray-800">{dim.completeness}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <Heart className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                <p className="text-[12px] text-gray-400">暂无经营数据</p>
                <p className="text-[11px] text-gray-300 mt-1">执行 Skill 后数据会自动沉淀</p>
              </div>
            )}
          </section>
        </div>

        {/* 飞轮 */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] text-gray-600 font-medium">越用越懂你的生意</p>
              <p className="mt-1 text-[12px] text-gray-400">
                每次执行 Skill 的结果都会自动沉淀到企业资产和数字孪生，AI 下次分析更精准。
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">获取 Skill</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">执行分析</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">沉淀数据</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">越来越懂你</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 快捷操作卡片 ───── */
function QuickAction({ icon: Icon, color, label, desc, onClick }: {
  icon: typeof Package; color: string; label: string; desc: string; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    indigo: "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/50",
    emerald: "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50",
    blue: "border-blue-200 hover:border-blue-300 hover:bg-blue-50/50",
  };
  const iconColors: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-100",
    emerald: "text-emerald-600 bg-emerald-100",
    blue: "text-blue-600 bg-blue-100",
  };
  return (
    <button onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left transition-all ${colors[color]}`}
    >
      <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg ${iconColors[color]}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="text-[14px] font-semibold text-gray-900">{label}</div>
      <div className="mt-0.5 text-[12px] text-gray-500">{desc}</div>
    </button>
  );
}

/* ── 任务行 ───── */
function TaskRow({ task, onClick }: { task: TaskInfo; onClick: () => void }) {
  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
    running: { color: "text-blue-600 bg-blue-50", icon: Loader2, label: "运行中" },
    completed: { color: "text-green-600 bg-green-50", icon: CheckCircle2, label: "已完成" },
    failed: { color: "text-red-600 bg-red-50", icon: AlertCircle, label: "失败" },
    pending: { color: "text-gray-600 bg-gray-50", icon: Clock, label: "等待中" },
  };
  const config = statusConfig[task.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50 transition-colors"
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
        <Icon className={`h-3.5 w-3.5 ${task.status === "running" ? "animate-spin" : ""}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-800 truncate">{task.skillName}</div>
        <div className="text-[11px] text-gray-400">
          {config.label}
          {task.totalSteps > 0 && task.status === "running" && ` · 步骤 ${task.currentStep}/${task.totalSteps}`}
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
    </button>
  );
}
