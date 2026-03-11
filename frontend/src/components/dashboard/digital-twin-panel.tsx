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
} from "lucide-react";
import {
  fetchDigitalTwin,
  getToken,
  type DigitalTwinData,
  type DigitalTwinDimension,
} from "@/lib/api";

const DIMENSION_META: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; desc: string }> = {
  product: { label: "商品", icon: <Package className="h-5 w-5" />, color: "text-blue-600", bgColor: "bg-blue-50", desc: "产品分析、选品策略、定价数据" },
  customer: { label: "客户", icon: <Users className="h-5 w-5" />, color: "text-green-600", bgColor: "bg-green-50", desc: "客户分群、复购分析、画像数据" },
  operation: { label: "运营", icon: <Cog className="h-5 w-5" />, color: "text-purple-600", bgColor: "bg-purple-50", desc: "日常经营、退款监控、数据看板" },
  team: { label: "团队", icon: <Building2 className="h-5 w-5" />, color: "text-orange-600", bgColor: "bg-orange-50", desc: "团队协作、流程文档" },
  financial: { label: "财务", icon: <DollarSign className="h-5 w-5" />, color: "text-rose-600", bgColor: "bg-rose-50", desc: "营收、成本、利润分析" },
};

const FRIENDLY_KEYS: Record<string, string> = {
  last_skill_run: "最近执行",
  last_run_at: "执行时间",
  refund_rate: "退款率",
  daily_revenue: "日营收",
  daily_orders: "日订单",
  conversion_rate: "转化率",
  total_customers: "客户总数",
  repeat_purchase_rate: "复购率",
  recommended_price: "建议价",
  margin_rate: "毛利率",
  daily_score: "经营评分",
  market_size: "市场规模",
  competitor_count: "竞品数量",
  opportunity_score: "机会评分",
  data_richness: "数据丰度",
  problem_products_count: "问题商品数",
  segments_count: "分群数量",
  vip_ratio: "VIP占比",
  cost_structure: "成本结构",
  breakeven_units: "盈亏平衡量",
  expected_margin: "预期利润率",
};

function HealthRing({ value }: { value: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-gray-500">健康度</span>
      </div>
    </div>
  );
}

function DimensionCard({ dim, name }: { dim: DigitalTwinDimension; name: string }) {
  const meta = DIMENSION_META[name] || { label: name, icon: <Cog className="h-5 w-5" />, color: "text-gray-600", bgColor: "bg-gray-50", desc: "" };
  const stateEntries = Object.entries(dim.state).filter(
    ([k]) => !k.endsWith("_run_count") && k !== "last_skill_id" && k !== "last_run_steps_total" && k !== "last_run_steps_completed"
  );
  const lastRun = dim.state.last_skill_run as string | undefined;
  const lastRunAt = dim.state.last_run_at as string | undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.bgColor} ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{meta.label}</h3>
            <p className="text-[11px] text-gray-400">{meta.desc}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold text-gray-700">{dim.completeness}%</span>
          <p className="text-[11px] text-gray-400">{dim.relatedAssets} 关联资产</p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            dim.completeness >= 70 ? "bg-green-500" : dim.completeness >= 40 ? "bg-amber-500" : "bg-red-400"
          }`}
          style={{ width: `${dim.completeness}%` }}
        />
      </div>

      {stateEntries.length > 0 ? (
        <div className="space-y-1.5">
          {lastRun && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
              <Clock className="h-3 w-3" />
              <span>由「{lastRun}」更新</span>
              {lastRunAt && <span>· {new Date(lastRunAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {stateEntries
              .filter(([k]) => k !== "last_skill_run" && k !== "last_run_at" && k !== "data_richness")
              .slice(0, 8)
              .map(([key, value]) => {
                const label = FRIENDLY_KEYS[key] || key.replace(/_/g, " ");
                const displayVal = value === null ? "-" : typeof value === "object" ? JSON.stringify(value).slice(0, 30) : String(value);
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500 truncate">{label}</span>
                    <span className="text-[12px] font-medium text-gray-800 tabular-nums">{displayVal}</span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
          <Sparkles className="h-4 w-4 text-gray-300" />
          <p className="text-[12px] text-gray-400">运行相关 Skill 后数据会自动积累到这里</p>
        </div>
      )}
    </div>
  );
}

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
        <button
          onClick={load}
          className="rounded-lg bg-blue-600 px-4 py-2 text-[14px] text-white hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  const dims = data.dimensions || {};
  const hasAnyData = Object.values(dims).some(d => Object.keys(d.state).length > 0);

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
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> 刷新
        </button>
      </div>

      {/* 概览 */}
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <HealthRing value={data.health} />
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="总资产" value={data.totalAssets} icon={<Package className="h-4 w-4 text-blue-500" />} />
          <MetricCard label="Skill 执行" value={data.totalExecutions} icon={<Activity className="h-4 w-4 text-green-500" />} />
          <MetricCard label="近 7 天活跃" value={data.recentActivityCount} icon={<TrendingUp className="h-4 w-4 text-purple-500" />} />
        </div>
      </div>

      {/* 飞轮说明 */}
      {!hasAnyData && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-blue-800">数字孪生还是空的，让它转起来</p>
              <p className="mt-1.5 text-[13px] text-blue-600 leading-relaxed">
                每次执行 Skill（如退款分析、客户分群、每日经营看板），AI 会从执行结果中提取关键指标，
                自动回写到对应维度。执行越多，企业画像越完整，AI 的建议也越精准。
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

      {/* 五维度 */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-gray-700">五维状态模型</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["product", "customer", "operation", "team", "financial"].map((name) => {
            const dim = dims[name];
            return dim ? <DimensionCard key={name} dim={dim} name={name} /> : null;
          })}
        </div>
      </div>

      {/* 提示 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-[13px] text-gray-600">
        <p className="font-medium text-gray-800 mb-2">如何提升健康度？</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-500">
          <li>去 <strong>Skill 工作台</strong> 执行「退款分析」→ 自动更新运营和商品维度</li>
          <li>执行「客户分群」→ 自动更新客户维度</li>
          <li>执行「每日经营看板」→ 自动更新运营和财务维度</li>
          <li>设置定时任务，让 Skill 每天自动执行，数据持续积累</li>
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[12px] text-gray-500">{icon}{label}</div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
