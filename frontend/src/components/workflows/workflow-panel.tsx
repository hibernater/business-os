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
  ThumbsUp,
  ThumbsDown,
  FileText,
  UserCheck,
  Settings,
  Package,
  BarChart3,
  DollarSign,
  Search,
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
  getAuthData,
  fetchSkillRecommendations,
  type WorkflowInfo,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowExecutionInfo,
  type PendingInteraction,
  type SkillRecommendation,
} from "@/lib/api";
import { WorkflowBuilder } from "./workflow-builder";

type SubView = "list" | "create" | "build" | "edit" | "detail";

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
  // 新增预装
  anomaly_alert: { name: "异常检测与告警", keywords: ["异常", "告警", "预警", "数据异常"] },
  weekly_report: { name: "经营周报", keywords: ["周报", "本周", "一周"] },
  logistics_optimization: { name: "物流时效优化", keywords: ["物流", "发货", "签收", "配送"] },
  order_fulfillment_check: { name: "订单履约检查", keywords: ["待发货", "履约", "超时订单"] },
  retention_campaign: { name: "流失挽回活动策划", keywords: ["流失", "召回", "老客户", "挽回"] },
  supplier_evaluation: { name: "供应商评估", keywords: ["供应商", "采购", "选型"] },
  tax_preparation: { name: "税务筹备提醒", keywords: ["税务", "报税", "开票", "申报"] },
  training_plan: { name: "培训计划生成", keywords: ["培训", "客服培训", "员工培训"] },
  nps_survey: { name: "NPS满意度调研", keywords: ["NPS", "满意度", "调研"] },
  channel_performance: { name: "渠道效果分析", keywords: ["渠道", "平台", "ROI", "投入产出"] },
  traffic_analysis: { name: "流量分析", keywords: ["流量", "访客", "跳失", "转化漏斗"] },
  store_diagnosis: { name: "店铺健康诊断", keywords: ["店铺诊断", "健康度", "店铺评分"] },
  marketing_roi: { name: "营销ROI分析", keywords: ["营销ROI", "投放效果", "获客成本"] },
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
  const [createInitialPrompt, setCreateInitialPrompt] = useState<string | null>(null);
  const [skillRecs, setSkillRecs] = useState<SkillRecommendation[]>([]);

  const load = async () => {
    const token = getToken();
    const auth = getAuthData();
    if (!token) return;
    try {
      const [data, recs] = await Promise.all([
        fetchWorkflows(token),
        auth?.enterpriseId ? fetchSkillRecommendations(token, auth.enterpriseId) : Promise.resolve([]),
      ]);
      setWorkflows(data.workflows);
      setStats({ total: data.total, active: data.active });
      setSkillRecs(recs);
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
        initialPrompt={createInitialPrompt}
        onBack={() => {
          setCreateInitialPrompt(null);
          setSubView("list");
        }}
        onCreated={() => {
          setCreateInitialPrompt(null);
          load();
          setSubView("list");
        }}
      />
    );
  }

  if (subView === "build") {
    return (
      <WorkflowBuilder
        onBack={() => setSubView("list")}
        onSaved={() => {
          load();
          setSubView("list");
        }}
      />
    );
  }

  if (subView === "edit" && selected) {
    const editNodes: WorkflowNode[] = (() => {
      try { return JSON.parse(selected.nodesJson || "[]"); } catch { return []; }
    })();
    const editEdges: WorkflowEdge[] = (() => {
      try { return JSON.parse(selected.edgesJson || "[]"); } catch { return []; }
    })();
    return (
      <WorkflowBuilder
        workflowId={selected.id}
        initialNodes={editNodes}
        initialEdges={editEdges}
        initialName={selected.name}
        initialDescription={selected.description}
        initialTriggerType={selected.triggerType}
        initialCronExpr={selected.cronExpr || undefined}
        onBack={() => setSubView("detail")}
        onSaved={() => {
          load();
          setSubView("list");
          setSelected(null);
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
        onEdit={() => setSubView("edit")}
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
              混合 AI 执行、人工任务、审批、通知等节点，构建企业流程自动化引擎
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubView("build")}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <GitBranch className="h-4 w-4" />
              可视化构建
            </button>
            <button
              onClick={() => setSubView("create")}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              AI 创建
            </button>
          </div>
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

        {/* 为你推荐：基于资产推荐 Skill 和工作流 */}
        <RecommendSection
          skillRecs={skillRecs}
          onSkillClick={(desc) => {
            setCreateInitialPrompt(desc);
            setSubView("create");
          }}
          onWorkflowClick={(desc) => {
            setCreateInitialPrompt(desc);
            setSubView("create");
          }}
        />

        {/* List */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">加载中...</div>
        ) : workflows.length === 0 ? (
          <EmptyState
            onCreateClick={() => {
              setCreateInitialPrompt(null);
              setSubView("create");
            }}
            onBuildClick={() => setSubView("build")}
          />
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

const RECOMMENDED_WORKFLOWS = [
  { desc: "每天拉取数据分析经营状况，生成日报后推送到企微", label: "每日经营日报" },
  { desc: "监控竞品价格，如果有变动就通知运营，运营确认后调整定价", label: "竞品监控告警" },
  { desc: "分析客户数据生成方案，提交老板审批，通过后通知团队执行", label: "客户方案审批" },
];

const SKILL_ICON_MAP: Record<string, typeof Package> = {
  search: Search,
  "dollar-sign": DollarSign,
  users: Users,
  "bar-chart": BarChart3,
  package: Package,
  zap: Zap,
};

function getSkillIcon(icon: string) {
  return SKILL_ICON_MAP[icon] || Package;
}

function RecommendSection({
  skillRecs,
  onSkillClick,
  onWorkflowClick,
}: {
  skillRecs: SkillRecommendation[];
  onSkillClick: (desc: string) => void;
  onWorkflowClick: (desc: string) => void;
}) {
  const hasSkillRecs = skillRecs.length > 0;
  const hasWorkflowRecs = RECOMMENDED_WORKFLOWS.length > 0;
  if (!hasSkillRecs && !hasWorkflowRecs) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">为你推荐</h3>
        <span className="text-xs text-gray-400">基于商品、客户等资产分析</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {hasSkillRecs && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500">推荐执行的 Skill</h4>
            {skillRecs.slice(0, 3).map((rec) => {
              const Icon = getSkillIcon(rec.icon);
              const workflowDesc = `使用${rec.name}，${rec.reason}`;
              return (
                <button
                  key={rec.skill_id}
                  onClick={() => onSkillClick(workflowDesc)}
                  className="w-full text-left rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3 hover:shadow-sm transition-all hover:border-amber-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                      <Icon className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-gray-900">{rec.name}</span>
                      <p className="mt-0.5 text-[12px] text-amber-700 line-clamp-2">{rec.reason}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-amber-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {hasWorkflowRecs && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500">推荐工作流</h4>
            {RECOMMENDED_WORKFLOWS.map((item) => (
              <button
                key={item.label}
                onClick={() => onWorkflowClick(item.desc)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-gray-900">{item.label}</span>
                  <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-2">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onCreateClick,
  onBuildClick,
}: {
  onCreateClick: () => void;
  onBuildClick: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
        <GitBranch className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">还没有工作流</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        工作流是企业流程自动化引擎 — 混合 AI 执行、人工任务、审批、通知等节点。
        <br />
        用自然语言描述让 AI 编排，或用可视化编辑器手动构建。
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          AI 对话创建
        </button>
        <button
          onClick={onBuildClick}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          可视化构建
        </button>
      </div>
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
          {nodes.slice(0, 6).map((node, i) => {
            const st = NODE_STYLE[node.type] || NODE_STYLE.skill;
            const NIcon = st.icon;
            return (
              <div key={node.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />}
                <span className={`flex shrink-0 items-center gap-1 truncate rounded-md px-2 py-0.5 text-[11px] ${st.bg} ${st.text}`}>
                  <NIcon className="h-3 w-3 shrink-0" />
                  {node.label}
                </span>
              </div>
            );
          })}
          {nodes.length > 6 && (
            <span className="text-[11px] text-gray-400">+{nodes.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== Workflow Creator (Conversational) ==================== */

function WorkflowCreator({
  initialPrompt,
  onBack,
  onCreated,
}: {
  initialPrompt?: string | null;
  onBack: () => void;
  onCreated: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      content:
        "你好！我来帮你创建工作流。\n\n我支持多种节点类型，不只是 AI 分析——还能加入审批、人工任务、等待、通知等节点。\n\n试试描述你想自动化的业务流程，比如：\n• 「每天拉取数据分析经营状况，生成日报后推送到企微」\n• 「监控竞品价格，如果有变动就通知运营，运营确认后调整定价」\n• 「分析客户数据生成方案，提交老板审批，通过后通知团队执行」",
    },
  ]);
  const [input, setInput] = useState(initialPrompt || "");
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
    const TYPE_LABEL: Record<string, string> = {
      skill: "AI", condition: "条件", human_task: "人工", approval: "审批",
      notification: "通知", wait: "等待", api_call: "API", sub_workflow: "子流程", loop: "循环",
    };
    const flowDesc = wf.nodes
      .map((n) => `[${TYPE_LABEL[n.type] || n.type}] ${n.label}`)
      .join("\n→ ");
    const stats = Object.entries(
      wf.nodes.reduce<Record<string, number>>((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {})
    ).map(([t, c]) => `${TYPE_LABEL[t] || t} ×${c}`).join("、");
    setMessages((prev) => [
      ...prev.slice(0, -1),
      {
        role: "ai",
        content: `已为你生成工作流「${wf!.name}」（${wf!.nodes.length} 个节点：${stats}）：\n\n${flowDesc}\n\n${
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

/* ==================== Node Type Labels & Helpers ==================== */

const NODE_TYPE_LABEL: Record<string, string> = {
  skill: "AI 执行", condition: "条件判断", human_task: "人工任务",
  approval: "审批", notification: "通知", wait: "等待/延时",
  api_call: "API 调用", sub_workflow: "子流程", loop: "循环",
};

function nodeConfigSummary(node: WorkflowNode): string {
  const c = node.config || {};
  switch (node.type) {
    case "skill":
      return node.skill_id ? `Skill: ${node.skill_id}` : "AI 自动执行";
    case "condition":
      return `表达式: ${(c as { expression?: string }).expression || "—"}`;
    case "human_task":
      return `指派: ${(c as { assignee?: string }).assignee || "待定"}`;
    case "approval":
      return `审批人: ${(c as { approver?: string }).approver || "待定"}`;
    case "notification":
      return `渠道: ${(c as { channel?: string }).channel || "系统"}`;
    case "wait": {
      const wt = (c as { wait_type?: string }).wait_type;
      if (wt === "duration") return `等待 ${(c as { duration_minutes?: number }).duration_minutes || "?"} 分钟`;
      return (c as { reason?: string }).reason || "等待";
    }
    case "api_call":
      return `${((c as { method?: string }).method || "GET").toUpperCase()} ${(c as { url?: string }).url || "—"}`;
    case "sub_workflow":
      return `子流程: ${(c as { workflow_id?: string }).workflow_id || "—"}`;
    case "loop":
      return `循环: ${(c as { items_source?: string }).items_source || "—"}`;
    default:
      return "";
  }
}

/* ==================== NodeRow — per-node display in detail view ==================== */

function NodeRow({
  node,
  index,
  isCompleted,
  isCurrent,
  executionStatus,
  edge,
}: {
  node: WorkflowNode;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  executionStatus?: string;
  edge?: WorkflowEdge;
}) {
  const isWaiting = isCurrent && executionStatus === "waiting_input";
  const style = NODE_STYLE[node.type] || NODE_STYLE.skill;
  const Icon = style.icon;

  const statusColor = isWaiting
    ? "border-amber-300 bg-amber-50"
    : isCurrent
      ? "border-blue-300 bg-blue-50"
      : isCompleted
        ? "border-green-200 bg-green-50/50"
        : "border-gray-100 bg-white";

  return (
    <div>
      {edge?.condition && (
        <div className="ml-3 flex items-center gap-1 py-1 text-[11px] text-amber-600">
          <AlertCircle className="h-3 w-3" /> {edge.condition}
        </div>
      )}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${statusColor}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}>
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : isCurrent && executionStatus === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{node.label}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
              {NODE_TYPE_LABEL[node.type] || node.type}
            </span>
          </div>
          <div className="text-xs text-gray-400 truncate mt-0.5">{nodeConfigSummary(node)}</div>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${
          isCompleted
            ? "bg-green-100 text-green-600"
            : isWaiting
              ? "bg-amber-100 text-amber-600"
              : isCurrent
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-400"
        }`}>
          {isCompleted ? "已完成" : isWaiting ? "等待交互" : isCurrent ? "执行中" : "待执行"}
        </span>
      </div>
    </div>
  );
}

/* ==================== InteractionPanel — type-specific UI ==================== */

function InteractionPanel({
  interaction,
  currentNode,
  interactionInput,
  onInputChange,
  onSubmit,
}: {
  interaction: PendingInteraction;
  currentNode: WorkflowNode | null;
  interactionInput: string;
  onInputChange: (v: string) => void;
  onSubmit: (response: string) => void;
}) {
  const nodeType = currentNode?.type || "condition";
  const style = NODE_STYLE[nodeType] || NODE_STYLE.skill;
  const Icon = style.icon;

  if (nodeType === "approval") {
    return (
      <div className="mt-4 rounded-xl border border-rose-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
            <ShieldCheck className="h-5 w-5 text-rose-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900">审批确认</h4>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{interaction.message}</p>
            {currentNode?.config && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <UserCheck className="h-3.5 w-3.5" />
                审批人: {(currentNode.config as { approver?: string }).approver || "—"}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => onSubmit("approved")}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <ThumbsUp className="h-4 w-4" /> 批准
              </button>
              <button
                onClick={() => onSubmit("rejected")}
                className="flex items-center gap-2 rounded-xl bg-red-100 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
              >
                <ThumbsDown className="h-4 w-4" /> 驳回
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={interactionInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && interactionInput.trim() && onSubmit(interactionInput)}
                placeholder="可附审批意见..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (nodeType === "human_task") {
    return (
      <div className="mt-4 rounded-xl border border-violet-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900">人工任务</h4>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{interaction.message}</p>
            {currentNode?.config && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  指派: {(currentNode.config as { assignee?: string }).assignee || "未指定"}
                </span>
                {(currentNode.config as { description?: string }).description && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {(currentNode.config as { description?: string }).description}
                  </span>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                value={interactionInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && interactionInput.trim() && onSubmit(interactionInput)}
                placeholder="填写完成情况或备注..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300"
              />
              <button
                onClick={() => onSubmit(interactionInput.trim() || "done")}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" /> 完成任务
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // condition / wait / generic — amber style with options + free text
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <Icon className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">
            {NODE_TYPE_LABEL[nodeType] || "等待你的回复"}
          </h4>
          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{interaction.message}</p>
          {interaction.options && interaction.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {interaction.options.map((opt) => (
                <button
                  key={opt.edge_id}
                  onClick={() => onSubmit(opt.label)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
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
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && interactionInput.trim() && onSubmit(interactionInput)}
              placeholder="输入你的回复..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
            />
            <button
              onClick={() => interactionInput.trim() && onSubmit(interactionInput)}
              disabled={!interactionInput.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== Workflow Detail (with Live Execution) ==================== */

function WorkflowDetail({
  workflow,
  onBack,
  onRefresh,
  onEdit,
}: {
  workflow: WorkflowInfo;
  onBack: () => void;
  onRefresh: () => void;
  onEdit?: () => void;
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
              {onEdit && !isLive && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  编辑
                </button>
              )}
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

          {/* Interaction Panel — type-specific */}
          {pendingInteraction && execution?.status === "waiting_input" && (
            <InteractionPanel
              interaction={pendingInteraction}
              currentNode={nodes.find((n) => n.id === execution.currentNodeId) || null}
              interactionInput={interactionInput}
              onInputChange={setInteractionInput}
              onSubmit={handleInteract}
            />
          )}

          {/* Flow with live status */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">流程编排</h3>
            <div className="space-y-2">
              {orderNodes(nodes, edges).map((node, i) => (
                <NodeRow
                  key={node.id}
                  node={node}
                  index={i}
                  isCompleted={completedNodes.includes(node.id)}
                  isCurrent={execution?.currentNodeId === node.id}
                  executionStatus={execution?.status}
                  edge={i > 0 ? edges.find((e) => e.to === node.id) : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
