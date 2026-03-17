"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Settings,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Zap,
  AlertCircle,
  Users,
  ShieldCheck,
  Bell,
  Timer,
  Globe,
  Workflow,
  Repeat,
  Play,
  Check,
} from "lucide-react";
import { createWorkflow, updateWorkflow, getToken, type WorkflowNode, type WorkflowEdge } from "@/lib/api";

/* ==================== Node Type Definitions ==================== */

interface NodeTypeDef {
  type: WorkflowNode["type"];
  label: string;
  desc: string;
  icon: typeof Zap;
  category: "ai" | "human" | "integration" | "control";
  border: string;
  bg: string;
  text: string;
  defaultConfig: Record<string, unknown>;
}

const NODE_TYPES: NodeTypeDef[] = [
  {
    type: "skill", label: "AI 执行", desc: "调用 AI Skill 自动分析",
    icon: Zap, category: "ai",
    border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700",
    defaultConfig: {},
  },
  {
    type: "condition", label: "条件判断", desc: "根据条件分支执行",
    icon: AlertCircle, category: "control",
    border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700",
    defaultConfig: { expression: "" },
  },
  {
    type: "human_task", label: "人工任务", desc: "指派任务给人执行",
    icon: Users, category: "human",
    border: "border-violet-200", bg: "bg-violet-50", text: "text-violet-700",
    defaultConfig: { assignee: "", description: "" },
  },
  {
    type: "approval", label: "审批", desc: "需要人审批通过才继续",
    icon: ShieldCheck, category: "human",
    border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-700",
    defaultConfig: { approver: "", subject: "" },
  },
  {
    type: "notification", label: "通知", desc: "发送消息通知（不阻塞）",
    icon: Bell, category: "integration",
    border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700",
    defaultConfig: { channel: "system", message_template: "", recipients: [] },
  },
  {
    type: "wait", label: "等待/延时", desc: "暂停一段时间后继续",
    icon: Timer, category: "control",
    border: "border-gray-200", bg: "bg-gray-50", text: "text-gray-600",
    defaultConfig: { wait_type: "duration", duration_minutes: 60, reason: "" },
  },
  {
    type: "api_call", label: "API 调用", desc: "调用外部 HTTP 接口",
    icon: Globe, category: "integration",
    border: "border-cyan-200", bg: "bg-cyan-50", text: "text-cyan-700",
    defaultConfig: { method: "GET", url: "", headers: {}, body: null },
  },
  {
    type: "sub_workflow", label: "子流程", desc: "触发另一个工作流",
    icon: Workflow, category: "control",
    border: "border-indigo-200", bg: "bg-indigo-50", text: "text-indigo-700",
    defaultConfig: { workflow_id: "" },
  },
  {
    type: "loop", label: "循环", desc: "对列表逐项处理",
    icon: Repeat, category: "control",
    border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-700",
    defaultConfig: { items: "[]", loop_var: "item" },
  },
];

const CATEGORIES: { key: string; label: string }[] = [
  { key: "ai", label: "AI 能力" },
  { key: "human", label: "人工协作" },
  { key: "integration", label: "外部集成" },
  { key: "control", label: "控制逻辑" },
];

const SKILL_OPTIONS: { id: string; name: string }[] = [
  { id: "inquiry_daily", name: "每日经营看板" },
  { id: "weekly_report", name: "经营周报" },
  { id: "pricing_strategy", name: "智能定价策略" },
  { id: "customer_segmentation", name: "客户分群运营" },
  { id: "refund_analysis", name: "退款退货分析" },
  { id: "new_product_plan", name: "新品开发方案" },
  { id: "product_selection", name: "爆款选品分析" },
  { id: "competitor_monitor", name: "竞品监控分析" },
  { id: "inventory_check", name: "库存健康检查" },
  { id: "supplier_evaluation", name: "供应商评估" },
  { id: "customer_lifecycle", name: "客户生命周期管理" },
  { id: "review_analysis", name: "评价口碑分析" },
  { id: "retention_campaign", name: "流失挽回活动策划" },
  { id: "nps_survey", name: "NPS满意度调研" },
  { id: "conversion_optimization", name: "转化率诊断优化" },
  { id: "promotion_planner", name: "营销活动策划" },
  { id: "listing_optimization", name: "商品详情页优化" },
  { id: "channel_performance", name: "渠道效果分析" },
  { id: "anomaly_alert", name: "异常检测与告警" },
  { id: "order_fulfillment_check", name: "订单履约检查" },
  { id: "logistics_optimization", name: "物流时效优化" },
  { id: "team_performance", name: "团队绩效看板" },
  { id: "customer_service_qa", name: "客服质检分析" },
  { id: "training_plan", name: "培训计划生成" },
  { id: "profit_analysis", name: "利润分析报表" },
  { id: "cost_optimization", name: "成本结构优化" },
  { id: "cash_flow_forecast", name: "现金流预测" },
  { id: "tax_preparation", name: "税务筹备提醒" },
  { id: "fetch_platform_data", name: "平台数据同步" },
  { id: "generate_summary", name: "智能汇总报告" },
];

/* ==================== Main Builder Component ==================== */

export function WorkflowBuilder({
  onBack,
  onSaved,
  workflowId,
  initialNodes,
  initialEdges,
  initialName,
  initialDescription,
  initialTriggerType,
  initialCronExpr,
}: {
  onBack: () => void;
  onSaved: () => void;
  workflowId?: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  initialName?: string;
  initialDescription?: string;
  initialTriggerType?: string;
  initialCronExpr?: string;
}) {
  const isEditMode = !!workflowId;
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges || []);
  const [name, setName] = useState(initialName || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [triggerType, setTriggerType] = useState<"manual" | "scheduled">(
    (initialTriggerType as "manual" | "scheduled") || "manual"
  );
  const [cronExpr, setCronExpr] = useState(initialCronExpr || "0 9 * * *");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number>(-1);

  const edgeCounter = useRef(0);
  const nodeCounter = useRef(0);

  useEffect(() => {
    if (nodes.length > 0) {
      nodeCounter.current = Math.max(...nodes.map((_, i) => i + 1));
    }
    if (edges.length > 0) {
      edgeCounter.current = edges.length;
    }
  }, []);

  const addNode = useCallback((typeDef: NodeTypeDef, afterIndex: number) => {
    const id = `node_${++nodeCounter.current}`;
    const newNode: WorkflowNode = {
      id,
      type: typeDef.type,
      label: typeDef.label,
      skill_id: typeDef.type === "skill" ? "" : null,
      config: { ...typeDef.defaultConfig },
    };

    const newNodes = [...nodes];
    const newEdges = [...edges];

    if (afterIndex < 0) {
      newNodes.splice(0, 0, newNode);
      if (newNodes.length > 1) {
        newEdges.push({ id: `e${++edgeCounter.current}`, from: id, to: newNodes[1].id, condition: null });
      }
    } else if (afterIndex >= nodes.length) {
      newNodes.push(newNode);
      if (newNodes.length > 1) {
        newEdges.push({ id: `e${++edgeCounter.current}`, from: newNodes[newNodes.length - 2].id, to: id, condition: null });
      }
    } else {
      newNodes.splice(afterIndex + 1, 0, newNode);
      const prevNode = newNodes[afterIndex];
      const nextNode = newNodes[afterIndex + 2];

      const existingEdgeIdx = newEdges.findIndex(
        (e) => e.from === prevNode.id && nextNode && e.to === nextNode.id
      );
      if (existingEdgeIdx >= 0) {
        newEdges.splice(existingEdgeIdx, 1);
      }

      newEdges.push({ id: `e${++edgeCounter.current}`, from: prevNode.id, to: id, condition: null });
      if (nextNode) {
        newEdges.push({ id: `e${++edgeCounter.current}`, from: id, to: nextNode.id, condition: null });
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeId(id);
    setShowPalette(false);
  }, [nodes, edges]);

  const removeNode = useCallback((nodeId: string) => {
    const idx = nodes.findIndex((n) => n.id === nodeId);
    if (idx < 0) return;

    const newNodes = nodes.filter((n) => n.id !== nodeId);
    let newEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId);

    const prev = idx > 0 ? nodes[idx - 1] : null;
    const next = idx < nodes.length - 1 ? nodes[idx + 1] : null;
    if (prev && next) {
      newEdges.push({ id: `e${++edgeCounter.current}`, from: prev.id, to: next.id, condition: null });
    }

    setNodes(newNodes);
    setEdges(newEdges);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [nodes, edges, selectedNodeId]);

  const moveNode = useCallback((nodeId: string, direction: "up" | "down") => {
    const idx = nodes.findIndex((n) => n.id === nodeId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === nodes.length - 1) return;

    const newNodes = [...nodes];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newNodes[idx], newNodes[swapIdx]] = [newNodes[swapIdx], newNodes[idx]];

    const newEdges: WorkflowEdge[] = [];
    edgeCounter.current = 0;
    for (let i = 0; i < newNodes.length - 1; i++) {
      newEdges.push({
        id: `e${++edgeCounter.current}`,
        from: newNodes[i].id,
        to: newNodes[i + 1].id,
        condition: null,
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [nodes]);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
    );
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (nodes.length === 0) return;
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error("未登录");
      const payload = {
        name: name.trim(),
        description: description.trim(),
        triggerType,
        cronExpr: triggerType === "scheduled" ? cronExpr : undefined,
        nodesJson: JSON.stringify(nodes),
        edgesJson: JSON.stringify(edges),
      };
      if (isEditMode && workflowId) {
        await updateWorkflow(token, workflowId, payload);
      } else {
        await createWorkflow(token, payload);
      }
      onSaved();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="工作流名称..."
            className="w-full text-[15px] font-semibold text-gray-900 outline-none placeholder:text-gray-300"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要描述..."
            className="w-full text-xs text-gray-400 outline-none placeholder:text-gray-300 mt-0.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as "manual" | "scheduled")}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 outline-none"
          >
            <option value="manual">手动触发</option>
            <option value="scheduled">定时触发</option>
          </select>
          {triggerType === "scheduled" && (
            <input
              type="text"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 outline-none"
              placeholder="cron 表达式"
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || nodes.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "保存中..." : isEditMode ? "更新" : "保存"}
          </button>
        </div>
      </div>

      {/* Main area: canvas + config */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Canvas ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          <div className="mx-auto max-w-xl">
            {/* Add at start */}
            <InsertButton
              onClick={() => { setInsertAfterIdx(-1); setShowPalette(true); }}
              label={nodes.length === 0 ? "添加第一个节点" : undefined}
            />

            {nodes.map((node, i) => {
              const typeDef = NODE_TYPES.find((t) => t.type === node.type) || NODE_TYPES[0];
              const Icon = typeDef.icon;
              const isSelected = selectedNodeId === node.id;

              return (
                <div key={node.id}>
                  {/* Node */}
                  <div
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`group relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all cursor-pointer ${
                      isSelected
                        ? `${typeDef.border} ${typeDef.bg} shadow-md ring-2 ring-blue-200`
                        : `border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm`
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-40 cursor-grab">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>

                    {/* Icon */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeDef.bg} ${typeDef.text}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">{node.label}</span>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeDef.bg} ${typeDef.text}`}>
                          {typeDef.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {node.type === "skill" && node.skill_id
                          ? SKILL_OPTIONS.find((s) => s.id === node.skill_id)?.name || node.skill_id
                          : typeDef.desc}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveNode(node.id, "up"); }}
                        disabled={i === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveNode(node.id, "down"); }}
                        disabled={i === nodes.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Connector + insert between */}
                  {i < nodes.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-px bg-gray-300" />
                        <InsertButton onClick={() => { setInsertAfterIdx(i); setShowPalette(true); }} />
                        <div className="h-3 w-px bg-gray-300" />
                      </div>
                    </div>
                  )}

                  {/* Insert at end */}
                  {i === nodes.length - 1 && (
                    <InsertButton
                      onClick={() => { setInsertAfterIdx(i); setShowPalette(true); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel: node config or palette ── */}
        <div className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {showPalette ? (
            <NodePalette
              onSelect={(typeDef) => addNode(typeDef, insertAfterIdx)}
              onClose={() => setShowPalette(false)}
            />
          ) : selectedNode ? (
            <NodeConfig
              node={selectedNode}
              onUpdate={(updates) => updateNode(selectedNode.id, updates)}
              onClose={() => setSelectedNodeId(null)}
              onDelete={() => removeNode(selectedNode.id)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Settings className="h-8 w-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">点击节点查看配置</p>
              <p className="text-xs text-gray-300 mt-1">或点击 + 添加新节点</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Insert Button ==================== */

function InsertButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <div className="flex justify-center py-2">
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500 transition-colors ${
          label ? "px-4 py-3" : "px-2.5 py-1.5"
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        {label && <span className="text-sm">{label}</span>}
      </button>
    </div>
  );
}

/* ==================== Node Palette ==================== */

function NodePalette({
  onSelect,
  onClose,
}: {
  onSelect: (typeDef: NodeTypeDef) => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">添加节点</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {CATEGORIES.map((cat) => {
        const types = NODE_TYPES.filter((t) => t.category === cat.key);
        if (types.length === 0) return null;
        return (
          <div key={cat.key} className="mb-4">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              {cat.label}
            </div>
            <div className="space-y-1.5">
              {types.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    onClick={() => onSelect(t)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:shadow-sm ${t.border} hover:${t.bg}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{t.label}</div>
                      <div className="text-[11px] text-gray-400">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==================== Node Configuration Panel ==================== */

function NodeConfig({
  node,
  onUpdate,
  onClose,
  onDelete,
}: {
  node: WorkflowNode;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const typeDef = NODE_TYPES.find((t) => t.type === node.type) || NODE_TYPES[0];
  const Icon = typeDef.icon;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ config: { ...node.config, [key]: value } });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${typeDef.bg} ${typeDef.text}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${typeDef.bg} ${typeDef.text}`}>
            {typeDef.label}
          </span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Label */}
        <Field label="节点名称">
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
          />
        </Field>

        {/* Type-specific config */}
        {node.type === "skill" && (
          <Field label="选择 Skill">
            <select
              value={node.skill_id || ""}
              onChange={(e) => onUpdate({ skill_id: e.target.value || null })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
            >
              <option value="">请选择...</option>
              {SKILL_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}

        {node.type === "condition" && (
          <Field label="条件表达式">
            <input
              type="text"
              value={(node.config as { expression?: string }).expression || ""}
              onChange={(e) => updateConfig("expression", e.target.value)}
              placeholder="例：上一步结果中销售额 > 10000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
            />
          </Field>
        )}

        {node.type === "human_task" && (
          <>
            <Field label="指派人">
              <input
                type="text"
                value={(node.config as { assignee?: string }).assignee || ""}
                onChange={(e) => updateConfig("assignee", e.target.value)}
                placeholder="负责人姓名/角色"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
            <Field label="任务描述">
              <textarea
                value={(node.config as { description?: string }).description || ""}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="描述需要完成的工作..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 resize-none"
              />
            </Field>
            <Field label="截止时间（可选）">
              <input
                type="text"
                value={(node.config as { deadline?: string }).deadline || ""}
                onChange={(e) => updateConfig("deadline", e.target.value)}
                placeholder="例：2 小时内"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
          </>
        )}

        {node.type === "approval" && (
          <>
            <Field label="审批人">
              <input
                type="text"
                value={(node.config as { approver?: string }).approver || ""}
                onChange={(e) => updateConfig("approver", e.target.value)}
                placeholder="审批人姓名/角色"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
            <Field label="审批事项">
              <input
                type="text"
                value={(node.config as { subject?: string }).subject || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="例：定价方案审批"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
          </>
        )}

        {node.type === "notification" && (
          <>
            <Field label="通知渠道">
              <select
                value={(node.config as { channel?: string }).channel || "system"}
                onChange={(e) => updateConfig("channel", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              >
                <option value="system">系统通知</option>
                <option value="企微">企业微信</option>
                <option value="钉钉">钉钉</option>
                <option value="email">邮件</option>
                <option value="webhook">Webhook</option>
              </select>
            </Field>
            <Field label="消息模板">
              <textarea
                value={(node.config as { message_template?: string }).message_template || ""}
                onChange={(e) => updateConfig("message_template", e.target.value)}
                placeholder="通知内容，可用 {prev_result} 引用前一步结果"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 resize-none"
              />
            </Field>
          </>
        )}

        {node.type === "wait" && (
          <>
            <Field label="等待类型">
              <select
                value={(node.config as { wait_type?: string }).wait_type || "duration"}
                onChange={(e) => updateConfig("wait_type", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              >
                <option value="duration">等待时长</option>
                <option value="until">等到指定时间</option>
              </select>
            </Field>
            {(node.config as { wait_type?: string }).wait_type !== "until" ? (
              <Field label="等待时长（分钟）">
                <input
                  type="number"
                  value={(node.config as { duration_minutes?: number }).duration_minutes ?? 60}
                  onChange={(e) => updateConfig("duration_minutes", parseInt(e.target.value) || 0)}
                  min={1}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                />
              </Field>
            ) : (
              <Field label="目标时间">
                <input
                  type="text"
                  value={(node.config as { until_time?: string }).until_time || ""}
                  onChange={(e) => updateConfig("until_time", e.target.value)}
                  placeholder="ISO 格式：2026-03-01T09:00:00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                />
              </Field>
            )}
            <Field label="等待原因">
              <input
                type="text"
                value={(node.config as { reason?: string }).reason || ""}
                onChange={(e) => updateConfig("reason", e.target.value)}
                placeholder="例：等待库存更新"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
          </>
        )}

        {node.type === "api_call" && (
          <>
            <Field label="请求方法">
              <select
                value={(node.config as { method?: string }).method || "GET"}
                onChange={(e) => updateConfig("method", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </Field>
            <Field label="URL">
              <input
                type="text"
                value={(node.config as { url?: string }).url || ""}
                onChange={(e) => updateConfig("url", e.target.value)}
                placeholder="https://api.example.com/data"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
            <Field label="请求体（JSON，可选）">
              <textarea
                value={typeof (node.config as { body?: unknown }).body === "string"
                  ? (node.config as { body: string }).body
                  : JSON.stringify((node.config as { body?: unknown }).body || "", null, 2)}
                onChange={(e) => {
                  try { updateConfig("body", JSON.parse(e.target.value)); }
                  catch { updateConfig("body", e.target.value); }
                }}
                rows={3}
                placeholder='{"key": "value"}'
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300 resize-none"
              />
            </Field>
          </>
        )}

        {node.type === "sub_workflow" && (
          <Field label="子工作流 ID">
            <input
              type="text"
              value={(node.config as { workflow_id?: string }).workflow_id || ""}
              onChange={(e) => updateConfig("workflow_id", e.target.value)}
              placeholder="输入要触发的工作流 ID"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
            />
          </Field>
        )}

        {node.type === "loop" && (
          <>
            <Field label="循环变量名">
              <input
                type="text"
                value={(node.config as { loop_var?: string }).loop_var || "item"}
                onChange={(e) => updateConfig("loop_var", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </Field>
            <Field label="数据源（JSON 数组）">
              <textarea
                value={typeof (node.config as { items?: unknown }).items === "string"
                  ? (node.config as { items: string }).items
                  : JSON.stringify((node.config as { items?: unknown }).items || "[]")}
                onChange={(e) => updateConfig("items", e.target.value)}
                rows={3}
                placeholder='["item1", "item2", "item3"]'
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300 resize-none"
              />
            </Field>
          </>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除节点
        </button>
      </div>
    </div>
  );
}

/* ==================== Field wrapper ==================== */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}
