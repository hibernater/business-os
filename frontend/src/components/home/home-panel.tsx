"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Users,
  Cog,
  Building2,
  DollarSign,
  Loader2,
  Play,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  AlertCircle,
  CircleCheck,
  Send,
} from "lucide-react";
import {
  getToken,
  fetchDigitalTwin,
  fetchTasks,
  createTask,
  streamChat,
  type DigitalTwinData,
  type DigitalTwinDimension,
  type TaskInfo,
} from "@/lib/api";

/* ── 五维度元信息 ─────────────────────────────── */

const DIMENSIONS = [
  { key: "product", label: "商品", desc: "选品、定价、SKU", icon: Package, color: "blue" },
  { key: "customer", label: "客户", desc: "画像、分群、复购", icon: Users, color: "emerald" },
  { key: "operation", label: "运营", desc: "日报、转化、退款", icon: Cog, color: "violet" },
  { key: "team", label: "团队", desc: "人员、考核、协作", icon: Building2, color: "amber" },
  { key: "financial", label: "财务", desc: "营收、成本、利润", icon: DollarSign, color: "rose" },
] as const;

/* ── 维度 → Skill 映射 ───────────────────────── */

const DIMENSION_SKILLS: Record<string, { skill_id: string; skill_name: string } | null> = {
  product: { skill_id: "pricing_strategy", skill_name: "智能定价策略" },
  customer: { skill_id: "customer_analysis", skill_name: "客户分群分析" },
  operation: { skill_id: "daily_operations_report", skill_name: "每日经营日报" },
  team: null,
  financial: { skill_id: "pricing_strategy", skill_name: "智能定价策略" },
};

/* ── 颜色工具 ─────────────────────────────────── */

const C: Record<string, { bg: string; text: string; bar: string }> = {
  blue:    { bg: "bg-blue-100",    text: "text-blue-600",    bar: "bg-blue-500" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", bar: "bg-emerald-500" },
  violet:  { bg: "bg-violet-100",  text: "text-violet-600",  bar: "bg-violet-500" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-600",   bar: "bg-amber-500" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-600",    bar: "bg-rose-500" },
};

/* ── 维度业务洞察生成 ─────────────────────────── */

interface Insight {
  text: string;
  actionLabel: string;
  level: "empty" | "weak" | "growing" | "strong";
}

function getInsight(key: string, dim: DigitalTwinDimension | undefined): Insight {
  const pct = dim?.completeness ?? 0;
  const s = (dim?.state ?? {}) as Record<string, unknown>;
  const empty = pct === 0 || Object.keys(s).length === 0;

  if (empty) {
    const map: Record<string, string> = {
      product:   "商品数据还是空的，AI 不了解你卖什么、怎么定价",
      customer:  "客户画像为零，不知道谁在买、谁是高价值客户",
      operation: "每天的经营数据没有被追踪，运营全凭感觉",
      team:      "团队协作数据未录入",
      financial: "财务状况不清晰，利润结构是个谜",
    };
    return { text: map[key] || "暂无数据", actionLabel: "去补全", level: "empty" };
  }

  if (pct < 30) {
    const map: Record<string, string> = {
      product:   s.active_products ? `有 ${s.active_products} 个商品，但分析还很初步` : "商品数据刚开始积累",
      customer:  s.total_customers ? `记录了 ${s.total_customers} 个客户，但还没做深度分析` : "客户数据刚起步",
      operation: s.daily_revenue ? `日营收 ${s.daily_revenue}，但数据维度不够全` : "经营数据刚起步",
      team:      s.team_size ? `团队 ${s.team_size} 人，协作数据很少` : "团队数据刚开始",
      financial: s.overall_margin ? `毛利 ${s.overall_margin}，但还看不清完整成本结构` : "财务数据不完整",
    };
    return { text: map[key] || "数据较少", actionLabel: "去补全", level: "weak" };
  }

  if (pct < 70) {
    const map: Record<string, string> = {
      product: [s.active_products && `${s.active_products} 个在售`, s.top_seller && `爆款「${s.top_seller}」`].filter(Boolean).join("，") || "商品分析进行中",
      customer: [s.vip_customers && `${s.vip_customers} 个 VIP`, s.repeat_purchase_rate && `复购率 ${s.repeat_purchase_rate}`].filter(Boolean).join("，") || "客户分析进行中",
      operation: [s.daily_revenue && `日营收 ${s.daily_revenue}`, s.conversion_rate && `转化率 ${s.conversion_rate}`].filter(Boolean).join("，") || "运营数据积累中",
      team: s.team_size ? `${s.team_size} 人团队，数据逐步完善中` : "团队数据积累中",
      financial: [s.overall_margin && `综合毛利 ${s.overall_margin}`, s.monthly_cost && `月成本 ${s.monthly_cost}`].filter(Boolean).join("，") || "财务分析进行中",
    };
    return { text: map[key] || "持续积累中", actionLabel: "继续优化", level: "growing" };
  }

  const map: Record<string, string> = {
    product: [s.active_products && `${s.active_products} 个商品全面掌握`, s.top_seller && `爆款「${s.top_seller}」`].filter(Boolean).join("，") || "商品维度数据丰富",
    customer: [s.vip_customers && `${s.vip_customers} 个 VIP 已识别`, s.repeat_purchase_rate && `复购率 ${s.repeat_purchase_rate}`].filter(Boolean).join("，") || "客户画像清晰",
    operation: [s.daily_revenue && `日营收 ${s.daily_revenue}`, s.conversion_rate && `转化率 ${s.conversion_rate}`].filter(Boolean).join("，") || "运营维度完善",
    team: s.cs_satisfaction ? `客服满意度 ${s.cs_satisfaction}，团队运转良好` : "团队维度完善",
    financial: s.overall_margin ? `综合毛利 ${s.overall_margin}，财务清晰可控` : "财务维度完善",
  };
  return { text: map[key] || "数据丰富", actionLabel: "持续优化", level: "strong" };
}

/* ── 健康度圆环 ───────────────────────────────── */

function HealthRing({ value }: { value: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const stroke =
    value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : value > 0 ? "#3b82f6" : "#d1d5db";

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={stroke} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-[10px] text-gray-400">健康度</span>
      </div>
    </div>
  );
}

/* ── AI 工作简报 ──────────────────────────────── */

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

  if (todayDone.length === 1) {
    briefs.push({
      id: "done",
      text: `「${todayDone[0].skillName}」已完成${todayDone[0].outputSummary ? `——${todayDone[0].outputSummary.slice(0, 40)}` : ""}`,
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
        text: `已经 ${daysSince} 天没执行任务了，孪生数据可能在变旧`,
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
    });
  }

  return briefs.slice(0, 3);
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
];

function MyWorkSection({ tasks, onNavigate }: { tasks: TaskInfo[]; onNavigate: (v: string) => void }) {
  const briefs = buildBriefs(tasks);
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onNavigate("chat");
  };

  return (
    <div className="mb-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* AI messages area */}
        <div className="space-y-1 px-4 pt-4 pb-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-[12px] font-medium text-gray-400">AI 助手</span>
          </div>
          {briefs.map((b) => (
            <p key={b.id} className="text-[13px] leading-relaxed text-gray-700">
              {TONE_ICON[b.tone]}
              {b.text}
              {b.action && (
                <button
                  onClick={() => onNavigate(b.action!.target)}
                  className="ml-1 text-blue-600 hover:underline"
                >
                  {b.action.label} →
                </button>
              )}
            </p>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-gray-100" />

        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="描述你想解决的问题..."
            className="flex-1 bg-transparent text-[14px] text-gray-800 outline-none placeholder:text-gray-300"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Capsule suggestions */}
        <div className="flex flex-wrap gap-2 px-4 pb-4">
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

/* ── 主组件 ───────────────────────────────────── */

interface HomePanelProps {
  onNavigate: (view: string) => void;
}

export function HomePanel({ onNavigate }: HomePanelProps) {
  const [twin, setTwin] = useState<DigitalTwinData | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSkill, setRunningSkill] = useState<string | null>(null);
  const [completedSkills, setCompletedSkills] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchDigitalTwin(token).catch(() => null),
      fetchTasks(token).then((r) => r.tasks ?? []).catch(() => [] as TaskInfo[]),
    ])
      .then(([t, tk]) => { setTwin(t); setTasks(tk); })
      .finally(() => setLoading(false));
  }, []);

  const handleRunSkill = async (skillId: string, skillName: string) => {
    const token = getToken();
    if (!token || runningSkill) return;
    setRunningSkill(skillId);
    try {
      const result = await createTask(token, {
        skillId, skillName, triggerType: "manual", totalSteps: 3,
      });
      if (result.status === "ok" && result.task?.id) {
        setCompletedSkills((prev) => new Set(prev).add(skillId));
        streamChat(skillName, null, token, {
          autoExecute: true, taskId: result.task.id,
        }).catch(() => {});
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

  const dims = twin?.dimensions ?? {};
  const health = twin?.health ?? 0;
  const totalAssets = twin?.totalAssets ?? 0;
  const totalExec = twin?.totalExecutions ?? 0;
  const hasData = Object.values(dims).some((d) => Object.keys(d.state).length > 0);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* ── 产品内核 + 健康度 ── */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Business OS</span>
          </div>

          <HealthRing value={health} />

          <h1 className="mt-4 text-[22px] font-bold text-gray-900">
            你的企业数字孪生
          </h1>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-gray-400">
            {hasData
              ? `${totalAssets} 项资产 · ${totalExec} 次分析 · AI 正在理解你的生意`
              : "让 AI 帮你看清生意全貌，找到每一个增长机会"}
          </p>
        </div>

        {/* ── 我的工作 ── */}
        <MyWorkSection tasks={tasks} onNavigate={onNavigate} />

        {/* ── 企业全景：五维度卡片 ── */}
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-gray-500">
          企业全景
        </h2>
        <div className="space-y-3">
          {DIMENSIONS.map(({ key, label, desc, icon: Icon, color }) => {
            const dim = dims[key];
            const pct = dim?.completeness ?? 0;
            const { text, actionLabel, level } = getInsight(key, dim);
            const skill = DIMENSION_SKILLS[key];
            const colors = C[color];
            const done = skill && completedSkills.has(skill.skill_id);
            const spinning = skill && runningSkill === skill.skill_id;

            return (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
              >
                <div className="flex items-start gap-4">
                  {/* 图标 */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>

                  {/* 内容 */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-3">
                      <span className="text-[15px] font-semibold text-gray-900">{label}</span>
                      <span className="text-[11px] text-gray-400">{desc}</span>
                      <span
                        className={`ml-auto text-[13px] font-semibold ${
                          pct >= 70
                            ? "text-emerald-600"
                            : pct >= 30
                              ? colors.text
                              : pct > 0
                                ? "text-gray-400"
                                : "text-gray-300"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pct >= 70 ? "bg-emerald-500" : pct > 0 ? colors.bar : "bg-gray-200"
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>

                    {/* 洞察 */}
                    <p
                      className={`text-[13px] leading-relaxed ${
                        level === "empty"
                          ? "text-gray-400"
                          : level === "weak"
                            ? "text-gray-500"
                            : "text-gray-600"
                      }`}
                    >
                      {text}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="ml-2 shrink-0 self-center">
                    {done ? (
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 已执行
                      </span>
                    ) : skill ? (
                      <button
                        onClick={() => handleRunSkill(skill.skill_id, skill.skill_name)}
                        disabled={!!runningSkill}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                          level === "empty" || level === "weak"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {spinning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {actionLabel}
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate("skills")}
                        className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-[12px] text-gray-500 transition-colors hover:bg-gray-200"
                      >
                        去创建 <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 飞轮提示 ── */}
        <div className="mt-8">
          {!hasData ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="mb-1.5 text-[14px] font-medium text-blue-800">
                    从任意一个维度开始
                  </p>
                  <p className="text-[13px] leading-relaxed text-blue-600">
                    点击「去补全」执行你的第一个 Skill。AI 会自动分析并把数据写入对应维度，你的数字孪生就开始成长了。
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-blue-500">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1">执行 Skill</span>
                    <span>→</span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1">沉淀数据</span>
                    <span>→</span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1">孪生成长</span>
                    <span>→</span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1">AI 更懂你</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-[12px] text-gray-300">
              <span className="h-px flex-1 bg-gray-100" />
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                每次执行 Skill → 沉淀数据 → 孪生更完整 → AI 更懂你
              </span>
              <span className="h-px flex-1 bg-gray-100" />
            </div>
          )}
        </div>

        {/* ── 底部导航 ── */}
        <div className="mt-6 flex items-center justify-center gap-5 text-[12px] text-gray-300">
          <button
            onClick={() => onNavigate("twin")}
            className="flex items-center gap-1 transition-colors hover:text-gray-500"
          >
            查看完整孪生数据 <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={() => onNavigate("workflows")}
            className="flex items-center gap-1 transition-colors hover:text-gray-500"
          >
            工作流 <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={() => onNavigate("skills")}
            className="flex items-center gap-1 transition-colors hover:text-gray-500"
          >
            Skill 库 <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
