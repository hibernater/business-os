"use client";

import { useEffect, useState } from "react";
import {
  Store,
  Search,
  Download,
  Star,
  Loader2,
  Tag,
  CheckCircle,
} from "lucide-react";
import {
  fetchMarketplace,
  installMarketplaceSkill,
  getToken,
  type MarketplaceSkill,
} from "@/lib/api";

const CATEGORIES = ["全部", "选品分析", "客户运营", "数据分析", "供应链", "定价策略", "通用"];

export function MarketplacePanel() {
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const load = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchMarketplace(
        token,
        searchQuery || undefined,
        category || undefined,
      );
      setSkills(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const handleSearch = () => { load(); };

  const handleInstall = async (id: string) => {
    const token = getToken();
    if (!token) return;
    const result = await installMarketplaceSkill(token, id);
    if (result.status === "ok") {
      setInstalledIds((prev) => new Set([...prev, id]));
      setSkills((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, installCount: s.installCount + 1 } : s
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900">Skill 市场</h2>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索 Skill..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === "全部" ? "" : c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (c === "全部" && !category) || category === c
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <Store className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">暂无 Skill</p>
          <p className="mt-1 text-xs text-gray-400">发布你创建的 Skill 到市场，与其他企业共享</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => {
            const installed = installedIds.has(skill.id);
            return (
              <div key={skill.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{skill.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{skill.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {skill.authorName && <span>by {skill.authorName}</span>}
                  {skill.category && (
                    <span className="flex items-center gap-0.5">
                      <Tag className="h-3 w-3" />
                      {skill.category}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Download className="h-3 w-3" />
                    {skill.installCount}
                  </span>
                  {skill.rating != null && skill.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-amber-400" />
                      {skill.rating}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => !installed && handleInstall(skill.id)}
                  disabled={installed}
                  className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                    installed
                      ? "bg-green-50 text-green-600 cursor-default"
                      : "bg-indigo-500 text-white hover:bg-indigo-600"
                  }`}
                >
                  {installed ? (
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> 已安装
                    </span>
                  ) : (
                    "安装"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
