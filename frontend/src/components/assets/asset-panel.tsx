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
} from "lucide-react";
import { fetchAssets, createAsset, deleteAsset, uploadFile, getToken, type AssetInfo } from "@/lib/api";

const ASSET_TYPES = [
  { value: "product", label: "商品", icon: ShoppingBag, color: "text-blue-500 bg-blue-100" },
  { value: "customer", label: "客户", icon: Users, color: "text-emerald-500 bg-emerald-100" },
  { value: "supplier", label: "供应商", icon: Truck, color: "text-orange-500 bg-orange-100" },
  { value: "document", label: "文档", icon: FileText, color: "text-purple-500 bg-purple-100" },
  { value: "preference", label: "偏好设置", icon: Settings, color: "text-gray-500 bg-gray-100" },
] as const;

function getTypeConfig(type: string) {
  return ASSET_TYPES.find((t) => t.value === type) ?? ASSET_TYPES[3];
}

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
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        let assetType = "document";
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) assetType = "document";
        else if (["csv", "xlsx", "xls"].includes(ext)) assetType = "document";
        await uploadFile(token, file, assetType);
      }
      loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Database className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">企业资产</h1>
              <p className="text-sm text-gray-500">管理商品、客户、供应商等经营数据</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.txt,.md,.pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              上传文件
            </label>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              添加资产
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setFilterType("")}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              !filterType ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            全部
          </button>
          {ASSET_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                filterType === t.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Database className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">暂无{filterType ? getTypeConfig(filterType).label : ""}资产</p>
            <p className="mt-1 text-xs text-gray-400">
              点击「添加资产」手动录入，或者在 Skill 执行过程中自动沉淀
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset) => {
              const typeConfig = getTypeConfig(asset.assetType);
              const Icon = typeConfig.icon;
              return (
                <div key={asset.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeConfig.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{asset.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {typeConfig.label}
                      </span>
                    </div>
                    {asset.content && (
                      <p className="mt-0.5 truncate text-sm text-gray-500">{asset.content}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(asset.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCreate && (
          <CreateAssetDialog
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}

function CreateAssetDialog({
  onClose,
  onCreate,
}: {
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
            <label className="mb-1.5 block text-sm font-medium text-gray-700">资产类型</label>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setAssetType(t.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    assetType === t.value
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：竹编收纳盒系列、王老板（深圳）"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">详细信息</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="商品描述、客户信息、供应商联系方式等..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            取消
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => onCreate({ assetType, name, content })}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
