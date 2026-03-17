"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Timer,
  ChevronDown,
  ChevronRight,
  Trash2,
  Ban,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Package,
  Users,
  Cog,
  Building2,
  DollarSign,
  GitBranch,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  fetchTasks,
  fetchWorkflowExecutions,
  cancelTask,
  deleteTask,
  getToken,
  type TaskInfo,
  type TaskListResponse,
  type WorkflowExecutionInfo,
} from "@/lib/api";

/* ── Skill → 数字孪生维度映射 ── */

const SKILL_DIMENSION: Record<string, string> = {
  // 商品
  pricing_strategy: "product",
  new_product_plan: "product",
  product_selection: "product",
  competitor_monitor: "product",
  inventory_check: "product",
  supplier_evaluation: "product",
  // 客户
  customer_segmentation: "customer",
  customer_lifecycle: "customer",
  review_analysis: "customer",
  retention_campaign: "customer",
  nps_survey: "customer",
  // 运营
  inquiry_daily: "operation",
  weekly_report: "operation",
  refund_analysis: "operation",
  conversion_optimization: "operation",
  promotion_planner: "operation",
  listing_optimization: "operation",
  channel_performance: "operation",
  anomaly_alert: "operation",
  order_fulfillment_check: "operation",
  logistics_optimization: "operation",
  fetch_platform_data: "operation",
  generate_summary: "operation",
  // 团队
  team_performance: "team",
  customer_service_qa: "team",
  training_plan: "team",
  // 财务
  profit_analysis: "financial",
  cost_optimization: "financial",
  cash_flow_forecast: "financial",
  tax_preparation: "financial",
};

function getTaskDimension(task: TaskInfo): string {
  return SKILL_DIMENSION[task.skillId] || "operation";
}

/* ── 维度配置 ── */

interface DimConfig {
  key: string;
  label: string;
  desc: string;
  icon: typeof Package;
  bg: string;
  text: string;
  border: string;
  barBg: string;
  lightBg: string;
}

const DIMENSIONS: DimConfig[] = [
  { key: "product", label: "商品", desc: "选品·定价·竞品", icon: Package, bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200", barBg: "bg-blue-500", lightBg: "bg-blue-50/50" },
  { key: "customer", label: "客户", desc: "画像·分群·复购", icon: Users, bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200", barBg: "bg-emerald-500", lightBg: "bg-emerald-50/50" },
  { key: "operation", label: "运营", desc: "日报·转化·退款", icon: Cog, bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200", barBg: "bg-violet-500", lightBg: "bg-violet-50/50" },
  { key: "team", label: "团队", desc: "人员·考核·协作", icon: Building2, bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200", barBg: "bg-amber-500", lightBg: "bg-amber-50/50" },
  { key: "financial", label: "财务", desc: "营收·成本·利润", icon: DollarSign, bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200", barBg: "bg-rose-500", lightBg: "bg-rose-50/50" },
];

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  running: { label: "执行中", dot: "bg-blue-500 animate-pulse" },
  completed: { label: "已完成", dot: "bg-green-500" },
  failed: { label: "失败", dot: "bg-red-500" },
  pending: { label: "待执行", dot: "bg-gray-300" },
  cancelled: { label: "已取消", dot: "bg-gray-300" },
};

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

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/* ── 主组件 ── */

export function TaskPanel() {
  const [data, setData] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wfExecs, setWfExecs] = useState<WorkflowExecutionInfo[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab, setTab] = useState<"skill" | "workflow">("skill");

  const loadTasks = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const filters: { status?: string } = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      const result = await fetchTasks(token, filters);
      setData(result);
      fetchWorkflowExecutions(token).then((r) => setWfExecs(r.executions)).catch(() => {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { setLoading(true); loadTasks(); }, [loadTasks]);
  useEffect(() => { const i = setInterval(loadTasks, 10000); return () => clearInterval(i); }, [loadTasks]);

  const handleRefresh = () => { setRefreshing(true); loadTasks(); };
  const handleCancel = async (id: string) => { const t = getToken(); if (t) { await cancelTask(t, id); loadTasks(); } };
  const handleDelete = async (id: string) => { const t = getToken(); if (t) { await deleteTask(t, id); loadTasks(); } };

  if (loading && !data) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }
  if (error && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <p className="text-red-500">{error}</p>
          <button onClick={handleRefresh} className="mt-3 text-sm text-blue-500 hover:text-blue-700">重试</button>
        </div>
      </div>
    );
  }

  const tasks = data?.tasks ?? [];
  const stats = { running: data?.running ?? 0, todayCompleted: data?.todayCompleted ?? 0, failed: data?.failed ?? 0, pending: data?.pending ?? 0 };

  const tasksByDim = new Map<string, TaskInfo[]>();
  const wfTasks: TaskInfo[] = [];
  for (const t of tasks) {
    if (t.workflowExecutionId) {
      wfTasks.push(t);
    } else {
      const dim = getTaskDimension(t);
      const arr = tasksByDim.get(dim) || [];
      arr.push(t);
      tasksByDim.set(dim, arr);
    }
  }

  const wfExecMap = new Map<string, WorkflowExecutionInfo>();
  for (const ex of wfExecs) wfExecMap.set(ex.id, ex);
  const wfGroups = new Map<string, TaskInfo[]>();
  for (const t of wfTasks) {
    const g = wfGroups.get(t.workflowExecutionId!) || [];
    g.push(t);
    wfGroups.set(t.workflowExecutionId!, g);
  }

  const standaloneTasks = tasks.filter((t) => !t.workflowExecutionId);
  const standaloneCount = standaloneTasks.length;
  const wfCount = wfTasks.length;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">任务管理</h1>
            <p className="mt-0.5 text-sm text-gray-400">按数字孪生维度查看所有任务执行状态</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>

        {/* Tab: 独立任务 / 工作流 */}
        <div className="mb-5 flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setTab("skill")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "skill"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Zap className="h-4 w-4" />
            独立任务
            {standaloneCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                tab === "skill" ? "bg-gray-100 text-gray-600" : "bg-gray-200/60 text-gray-400"
              }`}>
                {standaloneCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("workflow")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "workflow"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <GitBranch className="h-4 w-4" />
            工作流
            {wfGroups.size > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                tab === "workflow" ? "bg-gray-100 text-gray-600" : "bg-gray-200/60 text-gray-400"
              }`}>
                {wfGroups.size}
              </span>
            )}
          </button>
        </div>

        {/* Overview strip */}
        <div className="mb-5 flex gap-2">
          {[
            { key: "all", label: "全部", count: tab === "skill" ? standaloneCount : wfCount, dot: "bg-gray-400" },
            { key: "running", label: "执行中", count: stats.running, dot: "bg-blue-500 animate-pulse" },
            { key: "completed", label: "已完成", count: stats.todayCompleted, dot: "bg-green-500" },
            { key: "failed", label: "失败", count: stats.failed, dot: "bg-red-500" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                statusFilter === s.key
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === s.key ? "bg-white" : s.dot}`} />
              {s.label}
              <span className={`font-semibold ${statusFilter === s.key ? "text-white" : "text-gray-800"}`}>{s.count}</span>
            </button>
          ))}
        </div>

        {/* ─── Tab: 独立任务（按维度） ─── */}
        {tab === "skill" && (
          <div className="space-y-4">
            {DIMENSIONS.map((dim) => {
              const dimTasks = tasksByDim.get(dim.key) || [];
              if (dimTasks.length === 0 && statusFilter !== "all") return null;
              return (
                <DimensionLane
                  key={dim.key}
                  dim={dim}
                  tasks={dimTasks}
                  expandedId={expandedId}
                  onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              );
            })}
            {standaloneCount === 0 && (
              <EmptyState icon={Zap} text="暂无独立任务" hint="在 Skill 库中启动 Skill 执行" />
            )}
          </div>
        )}

        {/* ─── Tab: 工作流 ─── */}
        {tab === "workflow" && (
          <div className="space-y-3">
            {[...wfGroups.entries()].map(([execId, groupTasks]) => {
              const wfExec = wfExecMap.get(execId);
              const completed = groupTasks.filter((t) => t.status === "completed").length;
              const running = groupTasks.filter((t) => t.status === "running").length;
              return (
                <WorkflowGroup
                  key={execId}
                  name={wfExec?.workflowName || "工作流"}
                  status={wfExec?.status || "running"}
                  tasks={groupTasks}
                  completed={completed}
                  running={running}
                  expandedId={expandedId}
                  onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              );
            })}
            {wfGroups.size === 0 && (
              <EmptyState icon={GitBranch} text="暂无工作流任务" hint="在工作流页面创建并启动工作流" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 空状态 ── */

function EmptyState({ icon: Icon, text, hint }: { icon: typeof Zap; text: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <Icon className="h-6 w-6 text-gray-300" />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

/* ── 维度泳道 ── */

function DimensionLane({
  dim,
  tasks,
  expandedId,
  onToggle,
  onCancel,
  onDelete,
}: {
  dim: DimConfig;
  tasks: TaskInfo[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon = dim.icon;

  const running = tasks.filter((t) => t.status === "running").length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const failed = tasks.filter((t) => t.status === "failed").length;

  return (
    <div className={`rounded-2xl border ${tasks.length > 0 ? dim.border : "border-gray-100"} bg-white overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-5 py-3.5"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${dim.bg}`}>
          <Icon className={`h-4.5 w-4.5 ${dim.text}`} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-gray-900">{dim.label}</span>
            <span className="text-xs text-gray-400">{dim.desc}</span>
          </div>
        </div>
        {/* Mini status dots */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {running > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              {running} 执行中
            </span>
          )}
          {completed > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {completed}
            </span>
          )}
          {failed > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {failed}
            </span>
          )}
          {tasks.length === 0 && <span className="text-gray-300">暂无任务</span>}
        </div>
        {tasks.length > 0 && (
          expanded
            ? <ChevronDown className="h-4 w-4 text-gray-300" />
            : <ChevronRight className="h-4 w-4 text-gray-300" />
        )}
      </button>

      {/* Task list */}
      {expanded && tasks.length > 0 && (
        <div className={`border-t ${dim.border} ${dim.lightBg}`}>
          <div className="space-y-0">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                dimColor={dim.text}
                expanded={expandedId === task.id}
                onToggle={() => onToggle(task.id)}
                onCancel={() => onCancel(task.id)}
                onDelete={() => onDelete(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 工作流分组 ── */

function WorkflowGroup({
  name,
  status,
  tasks,
  completed,
  running,
  expandedId,
  onToggle,
  onCancel,
  onDelete,
}: {
  name: string;
  status: string;
  tasks: TaskInfo[];
  completed: number;
  running: number;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const statusText = status === "waiting_input" ? "等待交互" : status === "running" ? "执行中" : status === "completed" ? "已完成" : status;
  const statusColor = status === "waiting_input" ? "text-amber-600 bg-amber-50" : status === "running" ? "text-blue-600 bg-blue-50" : status === "completed" ? "text-green-600 bg-green-50" : "text-gray-500 bg-gray-100";

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <GitBranch className="h-4 w-4 text-gray-500" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>{statusText}</span>
          </div>
          <div className="text-xs text-gray-400">{completed}/{tasks.length} 完成{running > 0 ? ` · ${running} 执行中` : ""}</div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-gray-300" /> : <ChevronRight className="h-4 w-4 text-gray-300" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              dimColor="text-gray-600"
              expanded={expandedId === task.id}
              onToggle={() => onToggle(task.id)}
              onCancel={() => onCancel(task.id)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 单个任务行（紧凑） ── */

function TaskRow({
  task,
  dimColor,
  expanded,
  onToggle,
  onCancel,
  onDelete,
}: {
  task: TaskInfo;
  dimColor: string;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const st = STATUS_MAP[task.status] ?? STATUS_MAP.pending;
  const progress = task.totalSteps > 0 ? Math.round((task.currentStep / task.totalSteps) * 100) : null;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 px-5 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{task.skillName || "任务"}</span>
            <span className="text-[11px] text-gray-400">{st.label}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>{formatTime(task.startedAt)}</span>
            {task.durationMs != null && (
              <span className="flex items-center gap-0.5"><Timer className="h-3 w-3" />{formatDuration(task.durationMs)}</span>
            )}
            {task.totalSteps > 0 && <span>{task.currentStep}/{task.totalSteps} 步</span>}
          </div>
        </div>

        {/* Progress mini bar */}
        {task.status === "running" && progress !== null && (
          <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {(task.status === "running" || task.status === "pending") && (
            <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-400" title="取消">
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}
          {(task.status === "completed" || task.status === "failed" || task.status === "cancelled") && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-400" title="删除">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onToggle} className="flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-500">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="bg-white px-5 pb-4 pt-1 ml-5 space-y-2">
          {task.outputSummary && (
            <div className="prose prose-sm prose-gray max-w-none text-[13px] leading-relaxed rounded-lg border border-gray-100 bg-gray-50 p-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.outputSummary}</ReactMarkdown>
            </div>
          )}
          {task.errorMessage && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{task.errorMessage}</div>
          )}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
            <div>Skill: <span className="font-mono text-gray-500">{task.skillId}</span></div>
            <div>ID: <span className="font-mono text-gray-500">{task.id?.substring(0, 8)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
