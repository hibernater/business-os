"use client";

import { useEffect, useState, useRef } from "react";
import {
  Users,
  Cog,
  Loader2,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Zap,
  AlertCircle,
  CircleCheck,
  Send,
  BarChart3,
  Paperclip,
  Link2,
  X,
} from "lucide-react";
import {
  getToken,
  fetchDigitalTwin,
  fetchTasks,
  uploadFile,
  type DigitalTwinData,
  type DigitalTwinDimension,
  type TaskInfo,
} from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";

/* ── 问候语 ───────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

/* ── 今日一眼：核心经营指标 ───────────────────── */

function TodayGlance({
  dims,
  onRunDaily,
}: {
  dims: Record<string, DigitalTwinDimension>;
  onRunDaily: () => void;
}) {
  const op = (dims.operation?.state ?? {}) as Record<string, unknown>;
  const dailyRevenue = op.daily_revenue as string | undefined;
  const inquiryCount = op.inquiry_count as number | string | undefined;
  const conversionRate = op.conversion_rate as string | undefined;
  const hasData = dailyRevenue || inquiryCount || conversionRate;

  const metrics = [
    { label: "日营收", value: dailyRevenue ?? "—", sub: op.week_trend ? `周${op.week_trend}` : "" },
    { label: "今日询盘", value: inquiryCount != null ? String(inquiryCount) : "—", sub: "" },
    { label: "转化率", value: conversionRate ?? "—", sub: "" },
  ];

  if (!hasData) {
    return (
      <div className="mb-6">
        <h2 className="mb-3 text-[14px] font-semibold text-gray-700">今日一眼</h2>
        <div
          onClick={onRunDaily}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 py-8 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <BarChart3 className="mb-2 h-10 w-10 text-blue-400" />
          <p className="text-[14px] font-medium text-blue-700">暂无经营数据</p>
          <p className="mt-1 text-[12px] text-blue-600">跑个经营日报，让 AI 帮你汇总</p>
          <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700">
            去跑日报
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-[14px] font-semibold text-gray-700">今日一眼</h2>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <div className="text-[11px] text-gray-500">{m.label}</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{m.value}</div>
            {m.sub && <div className="mt-0.5 text-[11px] text-emerald-600">{m.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 需要关注：预警区块 ───────────────────────── */

function AlertsSection({
  dims,
  onNavigate,
}: {
  dims: Record<string, DigitalTwinDimension>;
  onNavigate: (v: string) => void;
}) {
  const product = (dims.product?.state ?? {}) as Record<string, unknown>;
  const customer = (dims.customer?.state ?? {}) as Record<string, unknown>;
  const alerts: { text: string; action: string; target: string }[] = [];

  const qualityIssue = product.quality_issue as string | undefined;
  if (qualityIssue) {
    alerts.push({
      text: `质量问题：${qualityIssue}`,
      action: "分析退款",
      target: "skills",
    });
  }

  const refundRate = product.refund_rate as string | undefined;
  if (refundRate && parseFloat(refundRate) >= 2) {
    alerts.push({
      text: `退款率 ${refundRate}，建议关注售后`,
      action: "去分析",
      target: "skills",
    });
  }

  const atRisk = customer.at_risk as string | undefined;
  if (atRisk) {
    alerts.push({
      text: `客户「${atRisk}」有流失风险，建议联系`,
      action: "去处理",
      target: "skills",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-amber-700">
        <AlertCircle className="h-4 w-4" />
        需要关注
      </h2>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3"
          >
            <p className="text-[13px] text-amber-800">{a.text}</p>
            <button
              onClick={() => onNavigate(a.target)}
              className="shrink-0 text-[12px] font-medium text-amber-600 hover:text-amber-700"
            >
              {a.action} →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI 工作台 ────────────────────────────────── */

interface Brief {
  id: string;
  text: string;
  action?: { label: string; target: string };
  tone: "info" | "warn" | "good" | "hint";
}

function buildBriefs(tasks: TaskInfo[]): Brief[] {
  const briefs: Brief[] = [];
  const running = tasks.filter((t) => t.status === "running");
  const failed = tasks.filter((t) => t.status === "failed");
  const todayDone = tasks.filter((t) => {
    if (t.status !== "completed" || !t.completedAt) return false;
    return new Date(t.completedAt).toDateString() === new Date().toDateString();
  });
  const lastCompleted = tasks.filter((t) => t.status === "completed").sort(
    (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime(),
  )[0];

  if (running.length === 1) {
    briefs.push({
      id: "run",
      text: `「${running[0].skillName}」正在运行，稍等就有结果`,
      action: { label: "查看", target: "tasks" },
      tone: "info",
    });
  } else if (running.length > 1) {
    const names = [...new Set(running.map((t) => t.skillName))];
    const label = names.length <= 2 ? names.map((n) => `「${n}」`).join("、") : `「${names[0]}」等 ${names.length} 个 Skill`;
    briefs.push({
      id: "run",
      text: `${label} 正在运行中`,
      action: { label: "查看", target: "tasks" },
      tone: "info",
    });
  }

  if (failed.length === 1) {
    briefs.push({
      id: "fail",
      text: `「${failed[0].skillName}」执行失败了${failed[0].errorMessage ? `：${failed[0].errorMessage.slice(0, 30)}` : ""}`,
      action: { label: "去处理", target: "tasks" },
      tone: "warn",
    });
  } else if (failed.length > 1) {
    briefs.push({
      id: "fail",
      text: `有 ${failed.length} 个任务执行失败，需要看一下`,
      action: { label: "去处理", target: "tasks" },
      tone: "warn",
    });
  }

  if (todayDone.length === 1 && todayDone[0].outputSummary) {
    const summary = todayDone[0].outputSummary.slice(0, 50);
    briefs.push({
      id: "done",
      text: `「${todayDone[0].skillName}」已完成——${summary}${summary.length >= 50 ? "…" : ""}`,
      action: { label: "看结果", target: "tasks" },
      tone: "good",
    });
  } else if (todayDone.length > 1) {
    briefs.push({
      id: "done",
      text: `今天已完成 ${todayDone.length} 个任务，数据已写入孪生`,
      action: { label: "看结果", target: "tasks" },
      tone: "good",
    });
  }

  if (briefs.length === 0 && tasks.length > 0 && lastCompleted) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastCompleted.completedAt ?? 0).getTime()) / 86400000,
    );
    if (daysSince >= 2) {
      briefs.push({
        id: "idle",
        text: `已经 ${daysSince} 天没执行任务了，数据可能在变旧`,
        action: { label: "去执行", target: "skills" },
        tone: "hint",
      });
    }
  }

  if (briefs.length === 0) {
    const h = new Date().getHours();
    briefs.push({
      id: "suggest",
      text: h < 12
        ? "新的一天，跑个经营日报看看昨天的数据？"
        : h < 18
          ? "下午了，检查一下客户和运营数据？"
          : "今天辛苦了，让 AI 帮你做个复盘？",
      tone: "hint",
      action: { label: "去试试", target: "skills" },
    });
  }

  return briefs.slice(0, 3);
}

interface Suggest { text: string; action: string; target: string }

function buildSuggestions(
  dims: Record<string, DigitalTwinDimension>,
  tasks: TaskInfo[],
): Suggest[] {
  const sugg: Suggest[] = [];
  const product = (dims.product?.state ?? {}) as Record<string, unknown>;
  const customer = (dims.customer?.state ?? {}) as Record<string, unknown>;
  const op = (dims.operation?.state ?? {}) as Record<string, unknown>;

  if (product.quality_issue) {
    sugg.push({ text: "有质量问题，建议分析退款与售后", action: "去分析", target: "skills" });
  }
  const refundRate = product.refund_rate as string | undefined;
  if (refundRate && parseFloat(refundRate) >= 2) {
    sugg.push({ text: "退款率偏高，建议关注售后数据", action: "去分析", target: "skills" });
  }
  if (customer.at_risk) {
    sugg.push({ text: "有客户流失风险，建议执行客户分群", action: "去执行", target: "skills" });
  }

  const custPct = dims.customer?.completeness ?? 0;
  if (custPct === 0 && !sugg.some((s) => s.text.includes("客户"))) {
    sugg.push({ text: "客户数据未覆盖，建议跑客户分群或录入", action: "去执行", target: "skills" });
  }
  const opPct = dims.operation?.completeness ?? 0;
  const hasOpData = op.daily_revenue || op.inquiry_count || op.conversion_rate;
  if (opPct === 0 && !hasOpData && !sugg.some((s) => s.text.includes("日报"))) {
    sugg.push({ text: "经营数据缺失，建议跑经营日报", action: "去执行", target: "skills" });
  }

  const running = tasks.filter((t) => t.status === "running");
  const failed = tasks.filter((t) => t.status === "failed");
  const lastCompleted = tasks.filter((t) => t.status === "completed").sort(
    (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime(),
  )[0];
  if (sugg.length === 0 && !running.length && !failed.length) {
    const daysSince = lastCompleted
      ? Math.floor((Date.now() - new Date(lastCompleted.completedAt ?? 0).getTime()) / 86400000)
      : 7;
    if (daysSince >= 2) {
      sugg.push({ text: "数据可能变旧，建议跑经营日报", action: "去执行", target: "skills" });
    } else {
      const h = new Date().getHours();
      sugg.push({
        text: h < 12 ? "早上好，跑个经营日报？" : h < 18 ? "下午了，检查客户与运营数据？" : "今天辛苦，让 AI 帮你复盘？",
        action: "去试试",
        target: "skills",
      });
    }
  }
  return sugg.slice(0, 2);
}

const TONE_ICON: Record<Brief["tone"], React.ReactNode> = {
  info: <Loader2 className="inline h-3.5 w-3.5 animate-spin text-blue-500 mr-1 align-[-2px]" />,
  warn: <AlertCircle className="inline h-3.5 w-3.5 text-amber-500 mr-1 align-[-2px]" />,
  good: <CircleCheck className="inline h-3.5 w-3.5 text-emerald-500 mr-1 align-[-2px]" />,
  hint: null,
};

const CAPSULES = [
  { label: "跑个经营日报", icon: Cog, target: "skills" },
  { label: "分析客户数据", icon: Users, target: "skills" },
  { label: "创建工作流", icon: Sparkles, target: "workflows" },
  { label: "查看任务", icon: BarChart3, target: "tasks" },
];

/* ── AI 工作简报（内含建议执行）────────────────── */

function AIBriefs({
  tasks,
  dims,
  onNavigate,
}: {
  tasks: TaskInfo[];
  dims: Record<string, DigitalTwinDimension>;
  onNavigate: (v: string) => void;
}) {
  const briefs = buildBriefs(tasks);
  const suggestions = buildSuggestions(dims, tasks);
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-1 px-4 pt-4 pb-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-[12px] font-medium text-gray-400">AI 工作简报</span>
        </div>
        {briefs.map((b) => (
          <p key={b.id} className="text-[13px] leading-relaxed text-gray-700">
            {TONE_ICON[b.tone]}
            {b.text}
            {b.action && (
              <button onClick={() => onNavigate(b.action!.target)} className="ml-1 text-blue-600 hover:underline">
                {b.action.label} →
              </button>
            )}
          </p>
        ))}
        {suggestions.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">建议执行</span>
            <div className="mt-1.5 space-y-1">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-violet-50/80 px-3 py-2">
                  <span className="text-[12px] text-gray-700">{s.text}</span>
                  <button
                    onClick={() => onNavigate(s.target)}
                    className="shrink-0 text-[11px] font-medium text-violet-600 hover:text-violet-700"
                  >
                    {s.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI 对话框 + 任务创建引导 ───────────────────── */

function AIDialogWithGuides({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; contentPreview?: string }[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const token = getToken();
    if (!token) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await uploadFile(token, file, "document");
        setAttachedFiles((prev) => [...prev, { name: file.name, contentPreview: res.contentPreview }]);
      }
    } catch { /* ignore */ }
    setUploading(false);
    e.target.value = "";
  };

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    setAttachedLinks((prev) => [...prev, withProtocol]);
    setLinkInput("");
    setShowLinkInput(false);
  };

  const handleSubmitWithAttachments = () => {
    const text = input.trim();
    const parts: string[] = [];
    if (text) parts.push(text);
    if (attachedFiles.length) {
      parts.push(attachedFiles.map((f) => `[附件] ${f.name}${f.contentPreview ? `\n${f.contentPreview.slice(0, 500)}` : ""}`).join("\n\n"));
    }
    if (attachedLinks.length) {
      parts.push("[参考链接]\n" + attachedLinks.join("\n"));
    }
    const fullContent = parts.join("\n\n");
    if (!fullContent) return;
    setInput("");
    setAttachedFiles([]);
    setAttachedLinks([]);
    useChatStore.getState().setPendingMessage(fullContent);
    onNavigate("chat");
  };

  const hasContent = input.trim() || attachedFiles.length || attachedLinks.length;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 transition-colors focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-400/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSubmitWithAttachments())}
              placeholder="有什么想问的？支持粘贴链接、上传文件..."
              rows={3}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] text-gray-800 placeholder:text-gray-400 outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
              {/* 附件/链接 chips */}
              {attachedFiles.map((f, i) => (
                <span key={`f-${i}`} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[12px] text-blue-700">
                  <Paperclip className="h-3 w-3" />
                  {f.name}
                  <button type="button" onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))} className="hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {attachedLinks.map((url, i) => (
                <span key={`l-${i}`} className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-lg bg-emerald-50 px-2 py-1 text-[12px] text-emerald-700">
                  <Link2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{url.length > 35 ? url.slice(0, 35) + "…" : url}</span>
                  <button type="button" onClick={() => setAttachedLinks((p) => p.filter((_, j) => j !== i))} className="shrink-0 hover:text-emerald-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {showLinkInput && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLink()}
                    placeholder="粘贴链接"
                    className="w-32 text-[12px] outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={addLink} className="text-blue-600 text-[12px]">添加</button>
                  <button type="button" onClick={() => { setShowLinkInput(false); setLinkInput(""); }}><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  title="上传文件"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </button>
                <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.xls,.txt,.md,.pdf,.jpg,.jpeg,.png,.gif" className="hidden" onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="添加链接"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleSubmitWithAttachments}
                disabled={!hasContent}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CAPSULES.map((c) => (
            <button
              key={c.label}
              onClick={() => onNavigate(c.target)}
              className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-[12px] text-gray-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <c.icon className="h-3 w-3" />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 企业数据覆盖（弱化、可折叠）────────────────── */

const DIM_LABELS: Record<string, string> = {
  product: "商品",
  customer: "客户",
  operation: "运营",
  team: "团队",
  financial: "财务",
};

function DataCoverage({
  dims,
  health,
  onViewTwin,
}: {
  dims: Record<string, DigitalTwinDimension>;
  health: number;
  onViewTwin: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const keys = ["product", "customer", "operation", "team", "financial"];

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50/30 px-3 py-2 text-left transition-colors hover:bg-gray-50/50"
      >
        <span className="text-[12px] font-medium text-gray-400">企业数据覆盖</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-400">
            {keys.map((k) => `${DIM_LABELS[k]} ${dims[k]?.completeness ?? 0}%`).join(" · ")}
          </span>
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </button>
      {!collapsed && (
        <div className="mt-1.5 rounded-lg border border-gray-100 bg-gray-50/30 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {keys.map((k) => {
              const pct = dims[k]?.completeness ?? 0;
              return (
                <span key={k} className="text-[11px] text-gray-500">
                  {DIM_LABELS[k]} <span className="font-medium text-gray-600">{pct}%</span>
                </span>
              );
            })}
            <span className="ml-auto text-[11px] text-gray-400">健康度 {health}</span>
          </div>
          <button
            onClick={onViewTwin}
            className="mt-2 text-[11px] text-blue-500 hover:text-blue-600"
          >
            查看完整孪生 <ArrowRight className="inline h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 主组件 ───────────────────────────────────── */

interface HomePanelProps {
  onNavigate: (view: string) => void;
}

export function HomePanel({ onNavigate }: HomePanelProps) {
  const [twin, setTwin] = useState<DigitalTwinData | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchDigitalTwin(token).catch(() => null),
      fetchTasks(token).then((r) => r.tasks ?? []).catch(() => [] as TaskInfo[]),
    ])
      .then(([t, tk]) => {
        setTwin(t);
        setTasks(tk);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const dims = twin?.dimensions ?? {};
  const health = twin?.health ?? 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* 问候 + Logo */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-gray-900">{getGreeting()}</h1>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-gray-700">Business OS</span>
          </div>
        </div>

        {/* 1. 今日一眼 */}
        <TodayGlance dims={dims} onRunDaily={() => onNavigate("skills")} />

        {/* 2. AI 对话框（提前，首屏可见） */}
        <AIDialogWithGuides onNavigate={onNavigate} />

        {/* 3. AI 工作简报（内含建议执行） */}
        <AIBriefs tasks={tasks} dims={dims} onNavigate={onNavigate} />

        {/* 4. 需要关注 */}
        <AlertsSection dims={dims} onNavigate={onNavigate} />

        {/* 5. 企业数据覆盖（弱化、可折叠） */}
        <DataCoverage dims={dims} health={health} onViewTwin={() => onNavigate("twin")} />

        {/* 底部导航 */}
        <div className="mt-4 flex items-center justify-center gap-6 text-[12px] text-gray-400">
          <button onClick={() => onNavigate("twin")} className="hover:text-gray-600">
            数字孪生
          </button>
          <button onClick={() => onNavigate("workflows")} className="hover:text-gray-600">
            工作流
          </button>
          <button onClick={() => onNavigate("skills")} className="hover:text-gray-600">
            Skill 库
          </button>
          <button onClick={() => onNavigate("tasks")} className="hover:text-gray-600">
            任务
          </button>
        </div>
      </div>
    </div>
  );
}
