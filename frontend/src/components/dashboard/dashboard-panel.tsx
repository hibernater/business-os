"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Database,
  Play,
  MessageSquare,
  Settings,
  TrendingUp,
  Clock,
  Loader2,
  ShoppingBag,
  Users,
  FileText,
  Truck,
} from "lucide-react";
import { fetchDashboard, getToken, type DashboardData } from "@/lib/api";

const assetTypeLabels: Record<string, { label: string; icon: typeof Database; color: string }> = {
  product: { label: "商品", icon: ShoppingBag, color: "bg-blue-100 text-blue-600" },
  customer: { label: "客户", icon: Users, color: "bg-emerald-100 text-emerald-600" },
  supplier: { label: "供应商", icon: Truck, color: "bg-orange-100 text-orange-600" },
  document: { label: "文档", icon: FileText, color: "bg-purple-100 text-purple-600" },
  preference: { label: "偏好", icon: Settings, color: "bg-gray-100 text-gray-600" },
};

export function DashboardPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchDashboard(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-gray-400">加载看板数据失败</div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">经营看板</h1>
            <p className="text-sm text-gray-500">企业经营数据概览</p>
          </div>
        </div>

        {/* 核心指标 */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Database} label="企业资产" value={data.totalAssets} color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={Play} label="Skill 执行" value={data.totalExecutions} color="bg-blue-100 text-blue-600" />
          <StatCard icon={MessageSquare} label="对话数" value={data.conversationCount} color="bg-purple-100 text-purple-600" />
          <StatCard icon={Settings} label="偏好设置" value={data.preferenceCount} color="bg-amber-100 text-amber-600" />
        </div>

        {/* 资产分布 */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Database className="h-4 w-4 text-gray-400" />
            资产分布
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(data.assetCounts)
              .filter(([type]) => type !== "execution_record")
              .map(([type, count]) => {
                const cfg = assetTypeLabels[type] ?? { label: type, icon: FileText, color: "bg-gray-100 text-gray-600" };
                const Icon = cfg.icon;
                return (
                  <div key={type} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500">{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Skill 执行排行 */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              Skill 执行排行
            </h2>
            {Object.keys(data.skillExecCounts).length === 0 ? (
              <p className="text-sm text-gray-400">暂无执行记录</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.skillExecCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([skillId, count]) => {
                    const maxCount = Math.max(...Object.values(data.skillExecCounts));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={skillId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 truncate">{skillId}</span>
                          <span className="text-sm font-medium text-gray-900">{count} 次</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 最近执行 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock className="h-4 w-4 text-gray-400" />
              最近执行
            </h2>
            {data.recentExecutions.length === 0 ? (
              <p className="text-sm text-gray-400">暂无执行记录</p>
            ) : (
              <div className="space-y-2">
                {data.recentExecutions.map((exec) => (
                  <div key={exec.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-100">
                      <Play className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{exec.name}</p>
                      <p className="text-xs text-gray-400">
                        {exec.createdAt ? new Date(exec.createdAt).toLocaleString("zh-CN") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Database;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
