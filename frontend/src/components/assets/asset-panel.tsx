"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Plus,
  Trash2,
  ShoppingBag,
  Users,
  Truck,
  FileText,
  Settings,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Upload,
  Bot,
  UserPlus,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { fetchAssets, createAsset, deleteAsset, uploadFile, getToken, type AssetInfo } from "@/lib/api";

/* ── 资产类型配置 ─────────────────────────────── */
const ASSET_TYPES = [
  { value: "product", label: "商品", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", borderColor: "border-blue-200" },
  { value: "customer", label: "客户", icon: Users, color: "text-emerald-600 bg-emerald-50", borderColor: "border-emerald-200" },
  { value: "supplier", label: "供应商", icon: Truck, color: "text-orange-600 bg-orange-50", borderColor: "border-orange-200" },
  { value: "document", label: "文档", icon: FileText, color: "text-purple-600 bg-purple-50", borderColor: "border-purple-200" },
  { value: "preference", label: "偏好设置", icon: Settings, color: "text-gray-600 bg-gray-100", borderColor: "border-gray-200" },
  { value: "execution_record", label: "执行记录", icon: ClipboardList, color: "text-indigo-600 bg-indigo-50", borderColor: "border-indigo-200" },
] as const;

function getTypeConfig(type: string) {
  return ASSET_TYPES.find((t) => t.value === type) ?? ASSET_TYPES[3];
}

/* ── 来源标签 ─────────────────────────────────── */
const SOURCE_MAP: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  user_upload: { label: "手动录入", icon: <UserPlus className="h-3 w-3" />, className: "text-blue-600 bg-blue-50 border-blue-200" },
  skill_execution: { label: "Skill 沉淀", icon: <Bot className="h-3 w-3" />, className: "text-violet-600 bg-violet-50 border-violet-200" },
  auto_extracted: { label: "AI 提取", icon: <Sparkles className="h-3 w-3" />, className: "text-amber-600 bg-amber-50 border-amber-200" },
  file_upload: { label: "文件上传", icon: <Upload className="h-3 w-3" />, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

function SourceBadge({ source, skillId }: { source?: string; skillId?: string }) {
  const config = SOURCE_MAP[source || ""] || SOURCE_MAP.user_upload;
  const SKILL_NAMES: Record<string, string> = {
    new_product_plan: "爆款选品分析",
    inquiry_daily: "每日经营复盘",
    refund_analysis: "退款退货分析",
    customer_segmentation: "客户分群运营",
    pricing_strategy: "智能定价策略",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.className}`}>
      {config.icon}
      {config.label}
      {skillId && SKILL_NAMES[skillId] && <span className="text-gray-400">· {SKILL_NAMES[skillId]}</span>}
    </span>
  );
}

/* ── JSON → 可读内容 ──────────────────────────── */
const FIELD_LABELS: Record<string, string> = {
  sku: "SKU", price: "售价", cost: "成本", monthly_sales: "月销量",
  status: "状态", category: "品类", platforms: "平台", margin_rate: "毛利率",
  rating: "评分", launch_date: "上架日期", level: "等级", type: "类型",
  monthly_order: "月采购额", products: "采购品", contact: "联系人",
  last_order: "最近下单", cooperation_months: "合作月数", trend: "趋势",
  risk: "风险提示", lead_time: "交期", moq: "最小起订量",
  quality_score: "质量评分", cooperation_years: "合作年数",
  preferred_categories: "偏好品类", price_range: "价格带", style: "风格偏好",
  process: "工艺限制", avoid: "规避", target_margin: "目标毛利",
  pricing_model: "定价模型", discount_policy: "折扣策略", platform_diff: "平台差异",
  vip_threshold: "VIP 门槛", follow_frequency: "跟进频率", risk_alert: "预警规则",
  preferred_channel: "沟通渠道", skill: "来源 Skill", date: "日期",
  result: "分析结果", chosen: "选择方案", reason: "选择原因",
  action: "建议动作", highlight: "亮点", benchmark: "竞品参考",
};

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join("、");
  }
  return String(value);
}

function ReadableContent({ content, assetType }: { content: string; assetType: string }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    return <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{content}</p>;
  }
  if (!parsed || typeof parsed !== "object") {
    return <p className="text-[13px] text-gray-600 leading-relaxed">{content}</p>;
  }

  const entries = Object.entries(parsed);

  if (assetType === "product") {
    const p = parsed as Record<string, unknown>;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {p.status && <Tag color="blue">{String(p.status)}</Tag>}
          {p.category && <Tag color="gray">{String(p.category)}</Tag>}
          {p.sku && <Tag color="gray">SKU: {String(p.sku)}</Tag>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {p.price != null && <MiniMetric label="售价" value={`¥${p.price}`} />}
          {p.cost != null && <MiniMetric label="成本" value={`¥${p.cost}`} />}
          {p.margin_rate && <MiniMetric label="毛利率" value={String(p.margin_rate)} />}
          {p.monthly_sales != null && <MiniMetric label="月销量" value={String(p.monthly_sales)} />}
        </div>
        {p.platforms && <div className="text-[12px] text-gray-400">平台：{Array.isArray(p.platforms) ? (p.platforms as string[]).join("、") : String(p.platforms)}</div>}
        {p.rating && <div className="text-[12px] text-gray-400">评分：{String(p.rating)} ⭐</div>}
      </div>
    );
  }

  if (assetType === "customer") {
    const c = parsed as Record<string, unknown>;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {c.level && <Tag color={c.level === "A" ? "emerald" : "gray"}>{String(c.level)} 级客户</Tag>}
          {c.type && <Tag color="gray">{String(c.type)}</Tag>}
          {c.trend && <Tag color={String(c.trend).includes("下滑") ? "amber" : "emerald"}>{String(c.trend)}</Tag>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {c.monthly_order && <MiniMetric label="月采购" value={String(c.monthly_order)} />}
          {c.contact && <MiniMetric label="联系人" value={String(c.contact)} />}
          {c.cooperation_months && <MiniMetric label="合作" value={`${c.cooperation_months}个月`} />}
        </div>
        {c.products && <div className="text-[12px] text-gray-400">采购品：{Array.isArray(c.products) ? (c.products as string[]).join("、") : String(c.products)}</div>}
        {c.risk && <div className="text-[12px] text-amber-600 font-medium">⚠ {String(c.risk)}</div>}
      </div>
    );
  }

  if (assetType === "execution_record") {
    const e = parsed as Record<string, unknown>;
    return (
      <div className="space-y-2">
        {e.result && <p className="text-[13px] text-gray-700 leading-relaxed">{String(e.result)}</p>}
        {e.chosen && <div className="text-[12px] text-emerald-600">✅ 选择方案：{String(e.chosen)}</div>}
        {e.reason && <div className="text-[12px] text-gray-400">原因：{String(e.reason)}</div>}
        {e.action && <div className="text-[12px] text-blue-600">→ {String(e.action)}</div>}
        {e.highlight && <div className="text-[12px] text-violet-600">🔥 {String(e.highlight)}</div>}
        {e.benchmark && <div className="text-[12px] text-gray-400">参考：{String(e.benchmark)}</div>}
      </div>
    );
  }

  if (assetType === "preference") {
    return (
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-[12px] text-gray-400 shrink-0 min-w-[72px]">{FIELD_LABELS[key] || key}</span>
            <span className="text-[12px] text-gray-700">{formatFieldValue(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2">
          <span className="text-[12px] text-gray-400 shrink-0 min-w-[72px]">{FIELD_LABELS[key] || key}</span>
          <span className="text-[12px] text-gray-700">{formatFieldValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${colors[color] || colors.gray}`}>{children}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-[13px] font-semibold text-gray-800">{value}</div>
    </div>
  );
}

/* ── 资产卡片 ─────────────────────────────────── */
function AssetCard({ asset, onDelete }: { asset: AssetInfo; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = getTypeConfig(asset.assetType);
  const Icon = typeConfig.icon;

  return (
    <div className={`rounded-xl border bg-white overflow-hidden transition-shadow hover:shadow-sm ${typeConfig.borderColor}`}>
      <div className="p-4">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeConfig.color}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[14px] text-gray-900">{asset.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{typeConfig.label}</span>
                <SourceBadge source={(asset as Record<string, unknown>).source as string} skillId={(asset as Record<string, unknown>).sourceSkillId as string} />
                <span className="text-[11px] text-gray-400">
                  {new Date(asset.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded(!expanded)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 内容摘要（始终显示） */}
        {asset.content && !expanded && (
          <div className="mt-3 ml-12">
            <ContentPreview content={asset.content} assetType={asset.assetType} />
          </div>
        )}

        {/* 展开详情 */}
        {asset.content && expanded && (
          <div className="mt-3 ml-12 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <ReadableContent content={asset.content} assetType={asset.assetType} />
          </div>
        )}
      </div>
    </div>
  );
}

function ContentPreview({ content, assetType }: { content: string; assetType: string }) {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (assetType === "product") {
      const parts: string[] = [];
      if (parsed.status) parts.push(String(parsed.status));
      if (parsed.price) parts.push(`¥${parsed.price}`);
      if (parsed.monthly_sales) parts.push(`月销${parsed.monthly_sales}`);
      if (parsed.margin_rate) parts.push(`毛利${parsed.margin_rate}`);
      return <p className="text-[12px] text-gray-500">{parts.join(" · ") || content.slice(0, 60)}</p>;
    }
    if (assetType === "customer") {
      const parts: string[] = [];
      if (parsed.level) parts.push(`${parsed.level}级`);
      if (parsed.type) parts.push(String(parsed.type));
      if (parsed.monthly_order) parts.push(`月采购${parsed.monthly_order}`);
      if (parsed.trend) parts.push(String(parsed.trend));
      return <p className="text-[12px] text-gray-500">{parts.join(" · ")}</p>;
    }
    if (assetType === "execution_record") {
      return <p className="text-[12px] text-gray-500 line-clamp-2">{String(parsed.result || content).slice(0, 80)}</p>;
    }
    if (assetType === "preference") {
      const keys = Object.keys(parsed).slice(0, 3);
      return <p className="text-[12px] text-gray-500">{keys.map(k => `${FIELD_LABELS[k] || k}: ${formatFieldValue(parsed[k])}`).join(" · ").slice(0, 80)}</p>;
    }
    if (assetType === "supplier") {
      const parts: string[] = [];
      if (parsed.type) parts.push(String(parsed.type));
      if (parsed.quality_score) parts.push(`质量${parsed.quality_score}分`);
      if (parsed.lead_time) parts.push(`交期${parsed.lead_time}`);
      return <p className="text-[12px] text-gray-500">{parts.join(" · ")}</p>;
    }
  } catch { /* not JSON */ }
  return <p className="text-[12px] text-gray-500 truncate">{content}</p>;
}

/* ── 类型引导说明 ─────────────────────────────── */
const TYPE_GUIDANCE: Record<string, { tip: string; actions: string[] }> = {
  "": {
    tip: "企业资产是 AI 理解你的生意的基础。资产越丰富，Skill 分析越精准。",
    actions: ["添加商品和客户信息", "执行 Skill 自动沉淀分析结果和偏好", "上传经营文档和数据表"],
  },
  product: {
    tip: "商品数据帮助 AI 做选品分析、竞品对比、定价策略。",
    actions: ["添加你在售的核心 SKU", "执行「爆款选品分析」发现新品机会", "执行「退款分析」定位品质问题"],
  },
  customer: {
    tip: "客户数据帮助 AI 做客户分群、流失预警、精准运营。",
    actions: ["录入核心客户信息", "执行「客户分群运营」识别 VIP 和风险客户", "定期更新客户采购数据"],
  },
  supplier: {
    tip: "供应商数据帮助 AI 在选品和定价时考虑供应链约束。",
    actions: ["录入核心供应商和他们的能力", "记录交期、MOQ、质量评分", "用于选品时评估工艺可行性"],
  },
  preference: {
    tip: "偏好由 Skill 执行自动沉淀，AI 下次分析时会参考这些偏好。",
    actions: ["执行 Skill 时选择「保存偏好」", "偏好越多，AI 建议越贴合你的实际情况", "可手动修改纠正 AI 记住的偏好"],
  },
  execution_record: {
    tip: "执行记录是 Skill 每次运行的成果摘要，也是数字孪生的数据来源。",
    actions: ["多执行 Skill 积累更多分析结果", "这些数据会自动汇入数字孪生", "可以回看历史分析做决策参考"],
  },
  document: {
    tip: "文档资产可以是表格、报告等文件，Skill 执行时可以引用。",
    actions: ["上传 CSV / Excel 数据文件", "上传经营相关文档", "Skill 执行时自动读取相关文档"],
  },
};

/* ── 主面板 ───────────────────────────────────── */
export function AssetPanel() {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAssets = () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetchAssets(token, filterType || undefined)
      .then(setAssets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadAssets, [filterType]);

  const handleCreate = async (data: { assetType: string; name: string; content: string }) => {
    const token = getToken();
    if (!token) return;
    await createAsset(token, data);
    setShowCreate(false);
    loadAssets();
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token) return;
    await deleteAsset(token, id);
    loadAssets();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const token = getToken();
    if (!token) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadFile(token, file, "document");
      }
      loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
    setUploading(false);
    e.target.value = "";
  };

  const guidance = TYPE_GUIDANCE[filterType] || TYPE_GUIDANCE[""];
  const typeCounts = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.assetType] = (acc[a.assetType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-4 sm:p-6 space-y-0">
        {/* 标题 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Database className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">企业资产</h1>
              <p className="text-[13px] text-gray-500">AI 理解你生意的基础，资产越丰富分析越精准</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input type="file" multiple accept=".csv,.xlsx,.xls,.txt,.md,.pdf,.jpg,.jpeg,.png,.gif" onChange={handleFileUpload} className="hidden" />
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              上传文件
            </label>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[13px] text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> 添加资产
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterTab label="全部" count={assets.length} active={!filterType} onClick={() => setFilterType("")} />
          {ASSET_TYPES.map((t) => (
            <FilterTab key={t.value} label={t.label} count={typeCounts[t.value] || 0}
              active={filterType === t.value} onClick={() => setFilterType(t.value)} />
          ))}
        </div>

        {/* 引导说明 */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] text-gray-600">{guidance.tip}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {guidance.actions.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 text-[12px] text-gray-400">
                    <ArrowRight className="h-3 w-3" /> {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 资产列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Database className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-[14px] text-gray-500">暂无{filterType ? getTypeConfig(filterType).label : ""}资产</p>
            <p className="mt-1 text-[12px] text-gray-400">
              点击「添加资产」手动录入，或执行 Skill 自动沉淀
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onDelete={() => handleDelete(asset.id)} />
            ))}
          </div>
        )}

        {showCreate && <CreateAssetDialog onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      </div>
    </div>
  );
}

/* ── 筛选标签 ─────────────────────────────────── */
function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
        active ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
      {count > 0 && <span className={`ml-1.5 ${active ? "text-gray-300" : "text-gray-400"}`}>{count}</span>}
    </button>
  );
}

/* ── 创建弹窗 ─────────────────────────────────── */
function CreateAssetDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { assetType: string; name: string; content: string }) => void;
}) {
  const [assetType, setAssetType] = useState("product");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">添加企业资产</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">资产类型</label>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.filter(t => !["execution_record"].includes(t.value)).map((t) => (
                <button key={t.value} onClick={() => setAssetType(t.value)}
                  className={`rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                    assetType === t.value ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="如：旋转调味料收纳盒、深圳百纳优品"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">详细信息</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4}
              placeholder="商品信息、客户画像、供应商能力等..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 resize-none"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50">取消</button>
          <button disabled={!name.trim()} onClick={() => onCreate({ assetType, name, content })}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >添加</button>
        </div>
      </div>
    </div>
  );
}
