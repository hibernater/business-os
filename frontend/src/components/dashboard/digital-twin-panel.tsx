"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Activity,
  Package,
  Users,
  Cog,
  Building2,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
  Star,
} from "lucide-react";
import {
  fetchDigitalTwin,
  getToken,
  type DigitalTwinData,
  type DigitalTwinDimension,
} from "@/lib/api";

/* ── 维度元信息 ─────────────────────────────── */
const DIMENSION_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; gradient: string; desc: string }
> = {
  product: {
    label: "商品",
    icon: <Package className="h-5 w-5" />,
    color: "text-blue-600",
    gradient: "from-blue-500 to-blue-600",
    desc: "选品、品质、SKU 管理",
  },
  customer: {
    label: "客户",
    icon: <Users className="h-5 w-5" />,
    color: "text-emerald-600",
    gradient: "from-emerald-500 to-emerald-600",
    desc: "分群、复购、客户画像",
  },
  operation: {
    label: "运营",
    icon: <Cog className="h-5 w-5" />,
    color: "text-violet-600",
    gradient: "from-violet-500 to-violet-600",
    desc: "日常经营、退款、转化",
  },
  team: {
    label: "团队",
    icon: <Building2 className="h-5 w-5" />,
    color: "text-amber-600",
    gradient: "from-amber-500 to-amber-600",
    desc: "人员、考核、协作",
  },
  financial: {
    label: "财务",
    icon: <DollarSign className="h-5 w-5" />,
    color: "text-rose-600",
    gradient: "from-rose-500 to-rose-600",
    desc: "营收、成本、利润",
  },
};

/* ── Key → 中文标签 ─────────────────────────── */
const KEY_LABELS: Record<string, string> = {
  active_products: "在售商品",
  pipeline_products: "开发中",
  total_skus: "SKU 总数",
  top_seller: "爆款",
  category_breakdown: "品类分布",
  new_product_direction: "新品方向",
  refund_rate: "退款率",
  quality_issue: "品质问题",
  recommendation_count: "推荐方案数",
  total_customers: "客户总数",
  vip_customers: "VIP 客户",
  vip_names: "VIP 名单",
  vip_revenue_share: "VIP 营收占比",
  at_risk_customer: "流失预警",
  new_inquiries_weekly: "本周询盘",
  customer_growth: "客户增长",
  repeat_purchase_rate: "复购率",
  daily_revenue: "日营收",
  weekly_revenue: "周营收",
  monthly_revenue: "月营收",
  inquiry_count: "询盘数",
  conversion_rate: "转化率",
  platform_breakdown: "平台占比",
  highlight: "今日亮点",
  week_trend: "周环比",
  execution_count: "累计执行",
  team_size: "团队人数",
  roles: "岗位配置",
  cs_response_rate: "客服响应率",
  cs_satisfaction: "客服满意度",
  task_completion_rate: "任务完成率",
  overall_margin: "综合毛利",
  best_margin_product: "最高毛利品",
  worst_margin_product: "最低毛利品",
  monthly_cost: "月成本",
  pricing_model: "定价模型",
  new_product_price: "新品定价",
  last_skill_run: "数据来源",
  last_run_at: "更新时间",
};

/* ── 每个维度的核心指标（大号展示） ───────────── */
const HERO_KEYS: Record<string, string[]> = {
  product: ["active_products", "refund_rate", "top_seller"],
  customer: ["vip_customers", "repeat_purchase_rate", "at_risk_customer"],
  operation: ["daily_revenue", "conversion_rate", "week_trend"],
  team: ["team_size", "cs_satisfaction", "task_completion_rate"],
  financial: ["overall_margin", "monthly_cost", "best_margin_product"],
};

/* ── 值格式化 ────────────────────────────────── */
function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => `${k} ${v}`)
      .join("、");
  }
  return String(value);
}

function isWarning(key: string, value: unknown): boolean {
  const s = String(value);
  return (
    key === "at_risk_customer" ||
    key === "quality_issue" ||
    s.includes("预警") ||
    s.includes("下滑") ||
    s.includes("问题")
  );
}

function isPositive(key: string, value: unknown): boolean {
  const s = String(value);
  return (
    key === "highlight" ||
    key === "week_trend" ||
    s.includes("爆") ||
    s.startsWith("+")
  );
}

/* ── 健康度圆环 ──────────────────────────────── */
function HealthRing({ value }: { value: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex h-32 w-32 items-center justify-center shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-[11px] text-gray-400">健康度</span>
      </div>
    </div>
  );
}

/* ── 核心指标卡片 ─────────────────────────────── */
function HeroMetric({ label, value, warning, positive }: {
  label: string; value: string; warning?: boolean; positive?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${
      warning ? "bg-amber-50 border border-amber-200" :
      positive ? "bg-emerald-50 border border-emerald-200" :
      "bg-gray-50"
    }`}>
      <div className="text-[11px] text-gray-400 mb-0.5">{label}</div>
      <div className={`text-[15px] font-semibold leading-snug ${
        warning ? "text-amber-700" : positive ? "text-emerald-700" : "text-gray-900"
      }`}>
        {warning && <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
        {positive && <ArrowUpRight className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
        {value}
      </div>
    </div>
  );
}

/* ── 维度卡片 ─────────────────────────────────── */
function DimensionCard({ dim, name }: { dim: DigitalTwinDimension; name: string }) {
  const meta = DIMENSION_META[name] || {
    label: name, icon: <Cog className="h-5 w-5" />, color: "text-gray-600", gradient: "from-gray-500 to-gray-600", desc: "",
  };

  const state = dim.state as Record<string, unknown>;
  const heroKeys = HERO_KEYS[name] || [];
  const lastRun = state.last_skill_run as string | undefined;
  const lastRunAt = state.last_run_at as string | undefined;

  const skipKeys = new Set(["last_skill_run", "last_run_at", "data_richness", "execution_count", ...heroKeys]);
  const detailEntries = Object.entries(state).filter(([k]) => !skipKeys.has(k));

  const isEmpty = Object.keys(state).length === 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* 头部 */}
      <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${meta.gradient} text-white`}>
        <div className="flex items-center gap-2.5">
          {meta.icon}
          <div>
            <h3 className="font-semibold text-[15px]">{meta.label}</h3>
            <p className="text-[11px] text-white/70">{meta.desc}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold">{dim.completeness}%</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 数据来源 */}
        {lastRun && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Clock className="h-3 w-3" />
            <span>由「{lastRun}」更新</span>
            {lastRunAt && (
              <span>
                · {lastRunAt.match(/^\d{4}-\d{2}-\d{2}$/)
                    ? lastRunAt.slice(5).replace("-", "/")
                    : new Date(lastRunAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric" })}
              </span>
            )}
          </div>
        )}

        {isEmpty ? (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-4">
            <Sparkles className="h-4 w-4 text-gray-300" />
            <p className="text-[13px] text-gray-400">运行相关 Skill 后数据会自动积累</p>
          </div>
        ) : (
          <>
            {/* 核心指标（大号） */}
            {heroKeys.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {heroKeys.map((k) => {
                  if (!(k in state)) return null;
                  const v = formatValue(k, state[k]);
                  return (
                    <HeroMetric
                      key={k}
                      label={KEY_LABELS[k] || k}
                      value={v}
                      warning={isWarning(k, state[k])}
                      positive={isPositive(k, state[k])}
                    />
                  );
                })}
              </div>
            )}

            {/* 详细指标 */}
            {detailEntries.length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-2">
                {detailEntries.map(([key, value]) => {
                  const label = KEY_LABELS[key] || key.replace(/_/g, " ");
                  const v = formatValue(key, value);
                  const warn = isWarning(key, value);
                  const pos = isPositive(key, value);
                  return (
                    <div key={key} className="flex items-start justify-between gap-2">
                      <span className="text-[12px] text-gray-400 shrink-0">{label}</span>
                      <span className={`text-[12px] text-right leading-relaxed ${
                        warn ? "text-amber-600 font-medium" :
                        pos ? "text-emerald-600 font-medium" :
                        "text-gray-700"
                      }`}>
                        {warn && <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
                        {v}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── 概览指标 ─────────────────────────────────── */
function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-[12px] text-gray-400">{icon}{label}</div>
      <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

/* ── 主面板 ───────────────────────────────────── */
export function DigitalTwinPanel() {
  const [data, setData] = useState<DigitalTwinData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setData(await fetchDigitalTwin(token));
    } catch (e) {
      console.error("数字孪生加载失败:", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <Brain className="h-10 w-10 text-gray-300" />
        <p className="text-[15px] text-gray-500">数字孪生数据加载失败</p>
        <button onClick={load}
          className="rounded-lg bg-blue-600 px-4 py-2 text-[14px] text-white hover:bg-blue-700 transition-colors"
        >重试</button>
      </div>
    );
  }

  const dims = data.dimensions || {};
  const hasAnyData = Object.values(dims).some((d) => Object.keys(d.state).length > 0);

  return (
    <div className="flex-1 overflow-auto scrollbar-thin p-4 sm:p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">企业数字孪生</h1>
            <p className="text-[13px] text-gray-500">每次 Skill 执行都在丰富你的企业画像</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 刷新
        </button>
      </div>

      {/* 概览 */}
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <HealthRing value={data.health} />
        <div className="grid flex-1 grid-cols-3 gap-3">
          <MetricCard label="企业资产" value={data.totalAssets} icon={<Package className="h-4 w-4 text-blue-500" />} />
          <MetricCard label="Skill 执行" value={data.totalExecutions} icon={<Activity className="h-4 w-4 text-green-500" />} />
          <MetricCard label="近 7 天活跃" value={data.recentActivityCount} icon={<TrendingUp className="h-4 w-4 text-purple-500" />} />
        </div>
      </div>

      {/* 飞轮说明（仅空状态显示） */}
      {!hasAnyData && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-blue-800">数字孪生还是空的，让它转起来</p>
              <p className="mt-1.5 text-[13px] text-blue-600 leading-relaxed">
                每次执行 Skill，AI 会自动提取关键经营指标，写入对应维度。执行越多，企业画像越完整。
              </p>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-blue-500">
                <span className="rounded-full bg-blue-100 px-2.5 py-1">执行 Skill</span>
                <span>→</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-1">提取指标</span>
                <span>→</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-1">更新孪生</span>
                <span>→</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-1">更懂你</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 五维状态 */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-gray-800">
          <Star className="h-4 w-4 text-amber-500" />
          五维经营状态
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {["product", "customer", "operation", "team", "financial"].map((name) => {
            const dim = dims[name];
            return dim ? <DimensionCard key={name} dim={dim} name={name} /> : null;
          })}
        </div>
      </div>

      {/* 飞轮提示（有数据时也展示） */}
      {hasAnyData && (
        <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-gray-800">持续执行 Skill，产品会越来越懂你的生意</p>
              <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">
                每次执行 Skill 都会自动提取经营指标写入数字孪生。Skill 执行得越多，数据越丰富，AI 给出的分析和建议就越精准。
                设置定时任务让日报、退款分析等 Skill 每天自动跑，你只看结果和异常。
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full bg-white border border-indigo-200 text-indigo-600 px-2.5 py-1">沉淀 Skill</span>
                <span className="text-gray-300">→</span>
                <span className="rounded-full bg-white border border-blue-200 text-blue-600 px-2.5 py-1">自动执行</span>
                <span className="text-gray-300">→</span>
                <span className="rounded-full bg-white border border-emerald-200 text-emerald-600 px-2.5 py-1">积累数据</span>
                <span className="text-gray-300">→</span>
                <span className="rounded-full bg-white border border-amber-200 text-amber-600 px-2.5 py-1">越来越懂你</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

