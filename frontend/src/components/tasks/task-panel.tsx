"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Timer,
  Zap,
  Calendar,
  ChevronDown,
  ChevronRight,
  Trash2,
  Ban,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  fetchTasks,
  cancelTask,
  deleteTask,
  getToken,
  type TaskInfo,
  type TaskListResponse,
} from "@/lib/api";

type StatusFilter = "all" | "running" | "completed" | "failed" | "pending" | "cancelled";
type TriggerFilter = "all" | "manual" | "scheduled" | "event";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Play; bgColor: string }> = {
  pending: { label: "待执行", color: "text-gray-500", icon: Clock, bgColor: "bg-gray-100" },
  running: { label: "执行中", color: "text-blue-600", icon: Loader2, bgColor: "bg-blue-50" },
  completed: { label: "已完成", color: "text-green-600", icon: CheckCircle2, bgColor: "bg-green-50" },
  failed: { label: "失败", color: "text-red-600", icon: XCircle, bgColor: "bg-red-50" },
  cancelled: { label: "已取消", color: "text-gray-400", icon: Ban, bgColor: "bg-gray-50" },
};

const TRIGGER_CONFIG: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  manual: { label: "手动", icon: Play, color: "text-indigo-600 bg-indigo-50" },
  scheduled: { label: "定时", icon: Calendar, color: "text-amber-600 bg-amber-50" },
  event: { label: "事件", icon: Zap, color: "text-purple-600 bg-purple-50" },
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function TaskPanel() {
  const [data, setData] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const filters: { status?: string; triggerType?: string } = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (triggerFilter !== "all") filters.triggerType = triggerFilter;
      const result = await fetchTasks(token, filters);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, triggerFilter]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleCancel = async (taskId: string) => {
    const token = getToken();
    if (!token) return;
    await cancelTask(token, taskId);
    loadTasks();
  };

  const handleDelete = async (taskId: string) => {
    const token = getToken();
    if (!token) return;
    await deleteTask(token, taskId);
    loadTasks();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <p className="text-red-500">{error}</p>
          <button onClick={handleRefresh} className="mt-3 text-sm text-blue-500 hover:text-blue-700">
            重试
          </button>
        </div>
      </div>
    );
  }

  const tasks = data?.tasks ?? [];
  const stats = {
    running: data?.running ?? 0,
    todayCompleted: data?.todayCompleted ?? 0,
    failed: data?.failed ?? 0,
    pending: data?.pending ?? 0,
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <ListTodo className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">任务管理</h1>
              <p className="text-sm text-gray-500">查看和管理所有工作流执行任务</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          <StatCard
            icon={Loader2}
            label="运行中"
            value={stats.running}
            color="blue"
            onClick={() => setStatusFilter(statusFilter === "running" ? "all" : "running")}
            active={statusFilter === "running"}
          />
          <StatCard
            icon={CheckCircle2}
            label="今日完成"
            value={stats.todayCompleted}
            color="green"
            onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
            active={statusFilter === "completed"}
          />
          <StatCard
            icon={XCircle}
            label="失败"
            value={stats.failed}
            color="red"
            onClick={() => setStatusFilter(statusFilter === "failed" ? "all" : "failed")}
            active={statusFilter === "failed"}
          />
          <StatCard
            icon={Clock}
            label="待执行"
            value={stats.pending}
            color="gray"
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
            active={statusFilter === "pending"}
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["all", "running", "completed", "failed", "pending", "cancelled"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s === "all" ? "全部" : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex gap-1">
            {(["all", "manual", "scheduled", "event"] as TriggerFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTriggerFilter(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  triggerFilter === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {t === "all" ? "全部类型" : TRIGGER_CONFIG[t]?.label ?? t}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedId === task.id}
              onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
              onCancel={() => handleCancel(task.id)}
              onDelete={() => handleDelete(task.id)}
              onRerun={() => {/* TODO: re-run from skill */}}
            />
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <ListTodo className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">暂无任务</p>
            <p className="mt-1 text-xs text-gray-400">
              在 Skill 工作台点击「执行」创建任务，或设置定时执行
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
  active,
}: {
  icon: typeof Play;
  label: string;
  value: number;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-200" },
    green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-200" },
    red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-200" },
    gray: { bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-200" },
  };
  const c = colorMap[color] ?? colorMap.gray;

  return (
    <button
      onClick={onClick}
      className={`rounded-xl border bg-white p-3.5 text-left transition-all hover:shadow-sm ${
        active ? `ring-2 ${c.ring} border-transparent` : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${c.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${c.text}`} />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </button>
  );
}

function TaskCard({
  task,
  expanded,
  onToggle,
  onCancel,
  onDelete,
  onRerun,
}: {
  task: TaskInfo;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onRerun: () => void;
}) {
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const triggerCfg = TRIGGER_CONFIG[task.triggerType] ?? TRIGGER_CONFIG.manual;
  const StatusIcon = statusCfg.icon;
  const TriggerIcon = triggerCfg.icon;

  const progress =
    task.totalSteps > 0
      ? Math.round((task.currentStep / task.totalSteps) * 100)
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 p-4">
        {/* Status icon */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${statusCfg.bgColor}`}>
          <StatusIcon className={`h-4 w-4 ${statusCfg.color} ${task.status === "running" ? "animate-spin" : ""}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{task.skillName || "未命名任务"}</h3>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${triggerCfg.color}`}>
              <TriggerIcon className="h-3 w-3" />
              {triggerCfg.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            <span>{formatTime(task.startedAt)}</span>
            {task.durationMs != null && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {formatDuration(task.durationMs)}
                </span>
              </>
            )}
            {task.totalSteps > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span>{task.currentStep}/{task.totalSteps} 步</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(task.status === "running" || task.status === "pending") && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="取消"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
          {(task.status === "completed" || task.status === "failed" || task.status === "cancelled") && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onRerun(); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                title="重新执行"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {task.status === "running" && progress !== null && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
          {task.outputSummary && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">执行摘要</div>
              <div className="prose prose-sm prose-gray max-w-none text-[13px] leading-relaxed bg-white rounded-lg p-3 border border-gray-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {task.outputSummary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {task.errorMessage && (
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <div className="text-xs font-medium text-red-600 mb-1">错误信息</div>
              <p className="text-sm text-red-500">{task.errorMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <span className="text-gray-400">Skill ID:</span>{" "}
              <span className="font-mono text-gray-600">{task.skillId}</span>
            </div>
            <div>
              <span className="text-gray-400">任务 ID:</span>{" "}
              <span className="font-mono text-gray-600">{task.id?.substring(0, 8)}...</span>
            </div>
            <div>
              <span className="text-gray-400">开始时间:</span>{" "}
              <span className="text-gray-600">{task.startedAt || "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">完成时间:</span>{" "}
              <span className="text-gray-600">{task.completedAt || "-"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
