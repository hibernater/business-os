"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Zap,
  Send,
  Bot,
  Clock,
  GitBranch,
  Sparkles,
  MoreVertical,
  AlertCircle,
  MessageCircle,
  Activity,
  Loader2,
  CheckCircle2,
  Bell,
  Timer,
  Globe,
  Users,
  ShieldCheck,
  Repeat,
  Workflow,
} from "lucide-react";
import {
  fetchWorkflows,
  createWorkflow,
  deleteWorkflow,
  activateWorkflow,
  updateWorkflow,
  decomposeWorkflow,
  startWorkflowExecution,
  fetchWorkflowExecutions,
  interactWithExecution,
  pauseWorkflowExecution,
  resumeWorkflowExecution,
  getToken,
  type WorkflowInfo,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowExecutionInfo,
  type PendingInteraction,
} from "@/lib/api";

type SubView = "list" | "create" | "detail";

/* ── 本地规则兜底：API 不可用时前端自行拆解 ── */

const SKILL_CATALOG: Record<string, { name: string; keywords: string[] }> = {
  // 商品
  pricing_strategy: { name: "智能定价策略", keywords: ["定价", "价格", "调价", "定价策略"] },
  new_product_plan: { name: "新品开发方案", keywords: ["新品开发", "新品方案", "新款"] },
  product_selection: { name: "爆款选品分析", keywords: ["选品", "爆款", "蓝海", "什么品好卖"] },
  competitor_monitor: { name: "竞品监控分析", keywords: ["竞品", "竞争", "对手", "竞品监控"] },
  inventory_check: { name: "库存健康检查", keywords: ["库存", "缺货", "补货", "滞销"] },
  // 客户
  customer_segmentation: { name: "客户分群运营", keywords: ["客户分群", "rfm", "分群运营"] },
  customer_lifecycle: { name: "客户生命周期管理", keywords: ["留存", "流失", "复购", "老客户", "生命周期"] },
  review_analysis: { name: "评价口碑分析", keywords: ["评价", "口碑", "差评", "好评", "评论"] },
  // 运营
  inquiry_daily: { name: "每日经营看板", keywords: ["日报", "每天", "经营", "昨天", "看板"] },
  refund_analysis: { name: "退款退货分析", keywords: ["退款", "退货", "售后"] },
  conversion_optimization: { name: "转化率诊断优化", keywords: ["转化率", "转化", "漏斗", "不下单"] },
  promotion_planner: { name: "营销活动策划", keywords: ["促销", "活动", "大促", "双11", "618", "营销"] },
  listing_optimization: { name: "商品详情页优化", keywords: ["详情页", "标题", "主图", "listing"] },
  // 团队
  team_performance: { name: "团队绩效看板", keywords: ["团队", "绩效", "员工", "人效", "考核"] },
  customer_service_qa: { name: "客服质检分析", keywords: ["客服", "质检", "服务质量", "响应"] },
  // 财务
  profit_analysis: { name: "利润分析报表", keywords: ["利润", "盈亏", "毛利", "净利", "赚钱"] },
  cost_optimization: { name: "成本结构优化", keywords: ["成本", "省钱", "费用", "开支"] },
  cash_flow_forecast: { name: "现金流预测", keywords: ["现金流", "资金", "周转", "备货资金"] },
  // 基础
  fetch_platform_data: { name: "平台数据同步", keywords: ["拉取", "数据", "平台", "同步", "导入"] },
  generate_summary: { name: "智能汇总报告", keywords: ["汇总", "报告", "总结"] },
};

function localDecompose(desc: string): GeneratedWorkflow {
  const d = desc;
  const matched: { id: string; name: string }[] = [];
  for (const [id, info] of Object.entries(SKILL_CATALOG)) {
    if (id === "generate_summary") continue;
    if (info.keywords.some((kw) => d.includes(kw))) {
      matched.push({ id, name: info.name });
    }
  }
  if (matched.length === 0) matched.push({ id: "inquiry_daily", name: "每日经营看板" });

  const hasCondition = ["如果", "当", "超过", "低于", "变动"].some((kw) => d.includes(kw));
  const hasApproval = ["审批", "批准", "审核", "老板确认"].some((kw) => d.includes(kw));
  const hasNotify = ["通知", "推送", "告知", "发给", "企微", "钉钉"].some((kw) => d.includes(kw));
  const hasWait = ["等到", "等待", "隔一段时间", "小时后"].some((kw) => d.includes(kw));
  const hasHuman = ["让人", "手动", "人工", "安排人", "分配给"].some((kw) => d.includes(kw));

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let eid = 0;

  matched.forEach((s, i) => {
    const nid = `node_${i + 1}`;
    nodes.push({ id: nid, type: "skill", label: s.name, skill_id: s.id, config: {} });
    if (hasCondition && i === 0 && matched.length > 1) {
      const cid = `cond_1`;
      nodes.push({ id: cid, type: "condition", label: "检查指标是否异常", skill_id: null, config: { expression: "根据上一步结果判断" } });
      edges.push({ id: `e${++eid}`, from: nid, to: cid, condition: null });
      edges.push({ id: `e${++eid}`, from: cid, to: `node_${i + 2}`, condition: "异常时" });
    } else if (i > 0) {
      const prevNode = nodes.length >= 3 && hasCondition && i === 1 ? `cond_1` : `node_${i}`;
      edges.push({ id: `e${++eid}`, from: prevNode, to: nid, condition: null });
    }
  });

  let lastId = nodes[nodes.length - 1].id;

  if (hasApproval) {
    const aid = `approval_${nodes.length + 1}`;
    nodes.push({ id: aid, type: "approval", label: "审批确认", skill_id: null, config: { approver: "负责人", subject: "工作流结果需要审批" } });
    edges.push({ id: `e${++eid}`, from: lastId, to: aid, condition: null });
    lastId = aid;
  }

  if (hasHuman) {
    const hid = `human_${nodes.length + 1}`;
    nodes.push({ id: hid, type: "human_task", label: "人工处理", skill_id: null, config: { assignee: "负责人", description: "请根据分析结果执行后续操作" } });
    edges.push({ id: `e${++eid}`, from: lastId, to: hid, condition: null });
    lastId = hid;
  }

  if (hasWait) {
    const wid = `wait_${nodes.length + 1}`;
    nodes.push({ id: wid, type: "wait", label: "等待执行窗口", skill_id: null, config: { wait_type: "duration", duration_minutes: 60, reason: "等待合适时机" } });
    edges.push({ id: `e${++eid}`, from: lastId, to: wid, condition: null });
    lastId = wid;
  }

  const summaryId = `node_${nodes.length + 1}`;
  nodes.push({ id: summaryId, type: "skill", label: "智能汇总报告", skill_id: "generate_summary", config: {} });
  edges.push({ id: `e${++eid}`, from: lastId, to: summaryId, condition: null });
  lastId = summaryId;

  if (hasNotify) {
    const nid = `notify_${nodes.length + 1}`;
    const channel = d.includes("企微") ? "企微" : d.includes("钉钉") ? "钉钉" : "system";
    nodes.push({ id: nid, type: "notification", label: "发送通知", skill_id: null, config: { channel, message_template: "工作流执行完毕", recipients: [] } });
    edges.push({ id: `e${++eid}`, from: lastId, to: nid, condition: null });
  }

  const isScheduled = ["每天", "每周", "每月", "定时", "自动"].some((kw) => d.includes(kw));
  const nameParts = matched.slice(0, 2).map((s) => s.name);

  return {
    name: nameParts.join(" + ") || "自定义工作流",
    description: desc,
    trigger_type: isScheduled ? "scheduled" : "manual",
    cron_expr: d.includes("每天") ? "0 9 * * *" : d.includes("每周") ? "0 9 * * 1" : null,
    nodes,
    edges,
  };
}

interface ChatMsg {
  role: "ai" | "user";
  content: string;
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  trigger_type: string;
  cron_expr: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function WorkflowPanel() {
  const [subView, setSubView] = useState<SubView>("list");
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkflowInfo | null>(null);

  const load = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await fetchWorkflows(token);
      setWorkflows(data.workflows);
      setStats({ total: data.total, active: data.active });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (subView === "create") {
    return (
      <WorkflowCreator
        onBack={() => setSubView("list")}
        onCreated={() => {
          load();
          setSubView("list");
        }}
      />
    );
  }

  if (subView === "detail" && selected) {
    return (
      <WorkflowDetail
        workflow={selected}
        onBack={() => {
          setSubView("list");
          setSelected(null);
        }}
        onRefresh={load}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">工作流</h2>
            <p className="mt-1 text-sm text-gray-500">
              用自然语言描述业务流程，AI 自动编排 Skill 构建工作流
            </p>
          </div>
          <button
            onClick={() => setSubView("create")}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            创建工作流
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">全部工作流</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-500">运行中</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-400">
              {stats.total - stats.active}
            </div>
            <div className="text-sm text-gray-500">草稿</div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">加载中...</div>
        ) : workflows.length === 0 ? (
          <EmptyState onCreateClick={() => setSubView("create")} />
        ) : (
          <div className="space-y-3">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onClick={() => {
                  setSelected(wf);
                  setSubView("detail");
                }}
                onDelete={async () => {
                  const token = getToken();
                  if (token) {
                    await deleteWorkflow(token, wf.id);
                    load();
                  }
                }}
                onToggle={async () => {
                  const token = getToken();
                  if (!token) return;
                  if (wf.status === "active") {
                    await updateWorkflow(token, wf.id, { status: "paused" });
                  } else {
                    await activateWorkflow(token, wf.id);
                  }
                  load();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
        <GitBranch className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">还没有工作流</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        工作流是多个 Skill 按业务逻辑串联的自动化流程。
        <br />
        用自然语言描述你的业务流程，AI 会帮你自动编排。
      </p>
      <button
        onClick={onCreateClick}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        用对话创建第一个工作流
      </button>
    </div>
  );
}

function WorkflowCard({
  workflow,
  onClick,
  onDelete,
  onToggle,
}: {
  workflow: WorkflowInfo;
  onClick: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nodes: WorkflowNode[] = (() => {
    try {
      return JSON.parse(workflow.nodesJson || "[]");
    } catch {
      return [];
    }
  })();
  const skillCount = nodes.filter((n) => n.type === "skill").length;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-gray-900">
              {workflow.name}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                workflow.status === "active"
                  ? "bg-green-50 text-green-600"
                  : workflow.status === "paused"
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {workflow.status === "active"
                ? "运行中"
                : workflow.status === "paused"
                  ? "已暂停"
                  : "草稿"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-gray-500">
            {workflow.description || "暂无描述"}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {skillCount} 个 Skill
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {workflow.triggerType === "scheduled" ? "定时触发" : "手动触发"}
            </span>
            <span>已运行 {workflow.runCount} 次</span>
          </div>
        </div>

        <div className="relative ml-3 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={workflow.status === "active" ? "暂停" : "启动"}
          >
            {workflow.status === "active" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mini flow preview */}
      {nodes.length > 0 && (
        <div className="mt-3 flex items-center gap-1 overflow-hidden">
          {nodes.slice(0, 5).map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />}
              <span
                className={`shrink-0 truncate rounded-md px-2 py-0.5 text-[11px] ${
                  node.type === "condition"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {node.label}
              </span>
            </div>
          ))}
          {nodes.length > 5 && (
            <span className="text-[11px] text-gray-400">+{nodes.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== Workflow Creator (Conversational) ==================== */

function WorkflowCreator({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      content:
        "你好！我来帮你创建工作流。\n\n请用自然语言描述你想自动化的业务流程，比如：\n• 「每天早上拉取平台数据，分析经营状况，生成日报」\n• 「监控竞品价格，如果有变动就分析影响并通知」\n• 「分析客户数据，识别高价值客户，制定定价策略」",
    },
  ]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedWorkflow | null>(null);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    setGenerating(true);
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: "正在分析你的业务流程，拆解为工作流..." },
    ]);

    let wf: GeneratedWorkflow | null = null;

    try {
      const token = getToken();
      if (!token) throw new Error("未登录");
      const result = await decomposeWorkflow(token, text);
      if (result.status === "ok" && result.workflow) {
        wf = result.workflow;
      }
    } catch {
      // API unavailable — fall back to local rule-based decomposition
    }

    if (!wf) {
      wf = localDecompose(text);
    }

    setGenerated(wf);
    const nodeNames = wf.nodes
      .filter((n) => n.type === "skill")
      .map((n) => `「${n.label}」`)
      .join(" → ");
    setMessages((prev) => [
      ...prev.slice(0, -1),
      {
        role: "ai",
        content: `已为你生成工作流「${wf!.name}」：\n\n${nodeNames}\n\n${
          wf!.trigger_type === "scheduled"
            ? `触发方式：定时（${wf!.cron_expr}）`
            : "触发方式：手动"
        }\n\n你可以确认保存，或描述想要调整的地方。`,
      },
    ]);
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error("未登录");
      await createWorkflow(token, {
        name: generated.name,
        description: generated.description,
        triggerType: generated.trigger_type,
        cronExpr: generated.cron_expr || undefined,
        nodesJson: JSON.stringify(generated.nodes),
        edgesJson: JSON.stringify(generated.edges),
      });
      onCreated();
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "保存失败，请稍后重试。" }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">创建工作流</h2>
          <p className="text-xs text-gray-400">用自然语言描述，AI 自动编排</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "ai" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Flow Preview */}
          {generated && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
              <h4 className="mb-3 text-sm font-semibold text-gray-900">
                工作流预览
              </h4>
              <FlowPreview nodes={generated.nodes} edges={generated.edges} />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "保存中..." : "确认保存"}
                </button>
                <button
                  onClick={() => setGenerated(null)}
                  className="rounded-xl border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  重新描述
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="描述你想自动化的业务流程..."
            disabled={generating}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || generating}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== Flow Preview ==================== */

const NODE_STYLE: Record<string, { icon: typeof Zap; border: string; bg: string; text: string }> = {
  skill:        { icon: Zap,          border: "border-blue-200",   bg: "bg-blue-50",    text: "text-blue-700" },
  condition:    { icon: AlertCircle,  border: "border-amber-200",  bg: "bg-amber-50",   text: "text-amber-700" },
  human_task:   { icon: Users,        border: "border-violet-200", bg: "bg-violet-50",  text: "text-violet-700" },
  approval:     { icon: ShieldCheck,  border: "border-rose-200",   bg: "bg-rose-50",    text: "text-rose-700" },
  notification: { icon: Bell,         border: "border-emerald-200",bg: "bg-emerald-50", text: "text-emerald-700" },
  wait:         { icon: Timer,        border: "border-gray-200",   bg: "bg-gray-50",    text: "text-gray-600" },
  api_call:     { icon: Globe,        border: "border-cyan-200",   bg: "bg-cyan-50",    text: "text-cyan-700" },
  sub_workflow: { icon: Workflow,     border: "border-indigo-200", bg: "bg-indigo-50",  text: "text-indigo-700" },
  loop:         { icon: Repeat,       border: "border-orange-200", bg: "bg-orange-50",  text: "text-orange-700" },
};

function FlowPreview({
  nodes,
  edges,
}: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}) {
  if (nodes.length === 0) return null;

  const orderedNodes = orderNodes(nodes, edges);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {orderedNodes.map((node, i) => {
        const edge = i > 0
          ? edges.find((e) => e.to === node.id)
          : null;
        const style = NODE_STYLE[node.type] || NODE_STYLE.skill;
        const Icon = style.icon;
        return (
          <div key={node.id} className="flex items-center gap-2">
            {i > 0 && (
              <div className="flex flex-col items-center">
                <ChevronRight className="h-4 w-4 text-gray-300" />
                {edge?.condition && (
                  <span className="text-[10px] text-amber-500">{edge.condition}</span>
                )}
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${style.border} ${style.bg} ${style.text}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[120px]">{node.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function orderNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (nodes.length <= 1) return nodes;
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    adj.get(e.from)?.push(e.to);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const ordered: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) ordered.push(node);
    for (const next of adj.get(id) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }
  // Append any unvisited nodes
  for (const n of nodes) {
    if (!ordered.find((o) => o.id === n.id)) ordered.push(n);
  }
  return ordered;
}

/* ==================== Workflow Detail (with Live Execution) ==================== */

function WorkflowDetail({
  workflow,
  onBack,
  onRefresh,
}: {
  workflow: WorkflowInfo;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [execution, setExecution] = useState<WorkflowExecutionInfo | null>(null);
  const [interactionInput, setInteractionInput] = useState("");
  const [starting, setStarting] = useState(false);

  const nodes: WorkflowNode[] = (() => {
    try { return JSON.parse(workflow.nodesJson || "[]"); } catch { return []; }
  })();
  const edges: WorkflowEdge[] = (() => {
    try { return JSON.parse(workflow.edgesJson || "[]"); } catch { return []; }
  })();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchWorkflowExecutions(token).then((r) => {
      const latest = r.executions.find((e) => e.workflowId === workflow.id);
      if (latest) setExecution(latest);
    }).catch(() => {});
  }, [workflow.id]);

  useEffect(() => {
    if (!execution || execution.status === "completed" || execution.status === "failed") return;
    const interval = setInterval(() => {
      const token = getToken();
      if (!token) return;
      fetchWorkflowExecutions(token).then((r) => {
        const latest = r.executions.find((e) => e.id === execution.id);
        if (latest) setExecution(latest);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [execution]);

  const completedNodes: string[] = (() => {
    try { return JSON.parse(execution?.completedNodesJson || "[]"); } catch { return []; }
  })();

  const pendingInteraction: PendingInteraction | null = (() => {
    try { return execution?.pendingInteraction ? JSON.parse(execution.pendingInteraction) : null; } catch { return null; }
  })();

  const handleStart = async () => {
    const token = getToken();
    if (!token) return;
    setStarting(true);
    try {
      const result = await startWorkflowExecution(token, workflow.id);
      setExecution(result.execution);
      onRefresh();
    } catch { /* ignore */ }
    setStarting(false);
  };

  const handleInteract = async (response: string) => {
    if (!execution) return;
    const token = getToken();
    if (!token) return;
    try {
      const result = await interactWithExecution(token, execution.id, response);
      setExecution(result.execution);
      setInteractionInput("");
    } catch { /* ignore */ }
  };

  const handlePauseResume = async () => {
    if (!execution) return;
    const token = getToken();
    if (!token) return;
    try {
      if (execution.status === "paused") {
        await resumeWorkflowExecution(token, execution.id);
      } else {
        await pauseWorkflowExecution(token, execution.id);
      }
      const r = await fetchWorkflowExecutions(token);
      const latest = r.executions.find((e) => e.id === execution.id);
      if (latest) setExecution(latest);
    } catch { /* ignore */ }
  };

  const isLive = execution && !["completed", "failed"].includes(execution.status);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{workflow.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{workflow.description}</p>
            </div>
            <div className="flex gap-2">
              {isLive && (
                <button
                  onClick={handlePauseResume}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {execution.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {execution.status === "paused" ? "继续" : "暂停"}
                </button>
              )}
              {!isLive && (
                <button
                  onClick={handleStart}
                  disabled={starting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {execution ? "重新启动" : "启动执行"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {workflow.triggerType === "scheduled" ? `定时: ${workflow.cronExpr}` : "手动触发"}
            </span>
            <span>已运行 {workflow.runCount} 次</span>
          </div>

          {/* Live Execution Status */}
          {execution && (
            <div className={`mt-6 rounded-xl border p-4 ${
              execution.status === "waiting_input"
                ? "border-amber-200 bg-amber-50/50"
                : execution.status === "running"
                  ? "border-blue-200 bg-blue-50/50"
                  : execution.status === "completed"
                    ? "border-green-200 bg-green-50/50"
                    : "border-gray-200 bg-gray-50"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className={`h-4 w-4 ${
                  execution.status === "running" ? "text-blue-500 animate-pulse" : "text-gray-400"
                }`} />
                <span className="text-sm font-semibold text-gray-700">执行状态</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  execution.status === "waiting_input"
                    ? "bg-amber-100 text-amber-700"
                    : execution.status === "running"
                      ? "bg-blue-100 text-blue-700"
                      : execution.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                }`}>
                  {execution.status === "waiting_input" ? "等待你的回复" : execution.status === "running" ? "执行中" : execution.status === "completed" ? "已完成" : execution.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                已完成 {completedNodes.length}/{nodes.length} 个节点
                {execution.lastHeartbeatAt && ` · 上次心跳 ${new Date(execution.lastHeartbeatAt).toLocaleTimeString("zh-CN")}`}
              </div>
              {execution.errorMessage && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{execution.errorMessage}</div>
              )}
            </div>
          )}

          {/* Interaction Panel */}
          {pendingInteraction && execution?.status === "waiting_input" && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <MessageCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{pendingInteraction.message}</p>
                  {pendingInteraction.options && pendingInteraction.options.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pendingInteraction.options.map((opt) => (
                        <button
                          key={opt.edge_id}
                          onClick={() => handleInteract(opt.label)}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={interactionInput}
                      onChange={(e) => setInteractionInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && interactionInput.trim() && handleInteract(interactionInput)}
                      placeholder="输入你的回复..."
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
                    />
                    <button
                      onClick={() => interactionInput.trim() && handleInteract(interactionInput)}
                      disabled={!interactionInput.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Flow with live status */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">流程编排</h3>
            <div className="space-y-2">
              {orderNodes(nodes, edges).map((node, i) => {
                const isCompleted = completedNodes.includes(node.id);
                const isCurrent = execution?.currentNodeId === node.id;
                const isWaiting = isCurrent && execution?.status === "waiting_input";

                return (
                  <div
                    key={node.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                      isWaiting
                        ? "border-amber-300 bg-amber-50"
                        : isCurrent
                          ? "border-blue-300 bg-blue-50"
                          : isCompleted
                            ? "border-green-200 bg-green-50/50"
                            : "border-gray-100 bg-white"
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isCompleted
                        ? "bg-green-100 text-green-600"
                        : isCurrent
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : isCurrent && execution?.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{node.label}</div>
                      <div className="text-xs text-gray-400">
                        {node.type === "skill"
                          ? `Skill: ${node.skill_id}`
                          : `条件: ${(node.config as { expression?: string })?.expression || "—"}`}
                      </div>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] ${
                      isCompleted
                        ? "bg-green-100 text-green-600"
                        : isWaiting
                          ? "bg-amber-100 text-amber-600"
                          : isCurrent
                            ? "bg-blue-100 text-blue-600"
                            : node.type === "condition"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-gray-100 text-gray-500"
                    }`}>
                      {isCompleted ? "已完成" : isWaiting ? "等待交互" : isCurrent ? "执行中" : node.type === "condition" ? "条件" : "待执行"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
