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
} from "lucide-react";
import {
  fetchDigitalTwin,
  getToken,
  type DigitalTwinData,
  type DigitalTwinDimension,
} from "@/lib/api";

const DIMENSION_META: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  product: { label: "商品", icon: <Package className="h-5 w-5" />, color: "text-blue-600", bgColor: "bg-blue-50" },
  customer: { label: "客户", icon: <Users className="h-5 w-5" />, color: "text-green-600", bgColor: "bg-green-50" },
  operation: { label: "运营", icon: <Cog className="h-5 w-5" />, color: "text-purple-600", bgColor: "bg-purple-50" },
  team: { label: "团队", icon: <Building2 className="h-5 w-5" />, color: "text-orange-600", bgColor: "bg-orange-50" },
  financial: { label: "财务", icon: <DollarSign className="h-5 w-5" />, color: "text-rose-600", bgColor: "bg-rose-50" },
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
  const meta = DIMENSION_META[name] || { label: name, icon: <Cog className="h-5 w-5" />, color: "text-gray-600", bgColor: "bg-gray-50" };
  const stateKeys = Object.keys(dim.state);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.bgColor} ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{meta.label}</h3>
            <p className="text-xs text-gray-400">{dim.relatedAssets} 关联资产</p>
          </div>
        </div>
        <span className="text-sm font-semibold text-gray-700">{dim.completeness}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            dim.completeness >= 70 ? "bg-green-500" : dim.completeness >= 40 ? "bg-amber-500" : "bg-red-400"
          }`}
          style={{ width: `${dim.completeness}%` }}
        />
      </div>
      {stateKeys.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {stateKeys.slice(0, 5).map((k) => (
            <span key={k} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{k}</span>
          ))}
          {stateKeys.length > 5 && (
            <span className="text-xs text-gray-400">+{stateKeys.length - 5}</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">暂无状态数据，运行相关 Skill 自动积累</p>
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
    } catch {}
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
    return <div className="p-6 text-center text-gray-500">加载失败</div>;
  }

  const dims = data.dimensions || {};

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-indigo-500" />
          <h1 className="text-xl font-bold text-gray-900">企业数字孪生</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-500">
          <RefreshCw className="h-4 w-4" /> 刷新
        </button>
      </div>

      {/* 概览卡片 */}
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <HealthRing value={data.health} />
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="总资产" value={data.totalAssets} icon={<Package className="h-4 w-4 text-blue-500" />} />
          <MetricCard label="Skill 执行" value={data.totalExecutions} icon={<Activity className="h-4 w-4 text-green-500" />} />
          <MetricCard label="近 7 天活跃" value={data.recentActivityCount} icon={<TrendingUp className="h-4 w-4 text-purple-500" />} />
        </div>
      </div>

      {/* 五维度 */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">五维状态模型</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["product", "customer", "operation", "team", "financial"].map((name) => {
            const dim = dims[name];
            return dim ? <DimensionCard key={name} dim={dim} name={name} /> : null;
          })}
        </div>
      </div>

      {/* 提示 */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
        <p className="font-medium">如何提升健康度？</p>
        <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5 text-indigo-600">
          <li>添加更多企业资产（商品、客户、供应商数据）</li>
          <li>运行 Skill 分析你的经营数据，让系统积累决策记忆</li>
          <li>设置定时任务，保持自动化运行</li>
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
