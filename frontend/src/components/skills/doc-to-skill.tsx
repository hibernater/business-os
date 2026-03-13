"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  Loader2,
  Sparkles,
  ArrowRight,
  Play,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { getToken, uploadFile, analyzeDocumentForSkills, type DocSkillSuggestion } from "@/lib/api";

interface DocToSkillProps {
  onClose: () => void;
  onSelectSkill: (skillId: string) => void;
}

export function DocToSkill({ onClose, onSelectSkill }: DocToSkillProps) {
  const [phase, setPhase] = useState<"upload" | "analyzing" | "results">("upload");
  const [suggestions, setSuggestions] = useState<DocSkillSuggestion[]>([]);
  const [uploadedFile, setUploadedFile] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const token = getToken();
    if (!token) return;

    setUploadedFile(file.name);
    setPhase("analyzing");
    setError(null);

    try {
      const result = await uploadFile(token, file, "document");

      const content = result.contentPreview || file.name;
      const sug = await analyzeDocumentForSkills(token, content, file.name);
      setSuggestions(sug);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
      setPhase("upload");
    }
    e.target.value = "";
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
    if (["pdf"].includes(ext)) return File;
    return FileText;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[500px] max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-500" />
            <h3 className="text-[16px] font-semibold text-gray-900">文档生成 Skill</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === "upload" && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-[14px] font-medium text-gray-700">点击上传文件</p>
              <p className="mt-1 text-[12px] text-gray-400">支持 Excel、CSV、TXT、PDF 等格式</p>
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".csv,.xlsx,.xls,.txt,.md,.pdf"
                onChange={handleFileSelect}
              />
            </div>
            {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-[12px] font-medium text-gray-600 mb-2">什么文件适合生成 Skill？</p>
              <div className="space-y-1.5 text-[12px] text-gray-500">
                <div className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> 产品价格表、成本表 → 定价策略 Skill</div>
                <div className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" /> 客户名单、采购记录 → 客户分群 Skill</div>
                <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-purple-500" /> 退款明细、售后记录 → 退款分析 Skill</div>
                <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-orange-500" /> 经营日报、订单报表 → 经营复盘 Skill</div>
              </div>
            </div>
          </div>
        )}

        {phase === "analyzing" && (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-[14px] font-medium text-gray-700">AI 正在分析文档内容...</p>
            <p className="mt-1 text-[12px] text-gray-400">{uploadedFile}</p>
          </div>
        )}

        {phase === "results" && (
          <div>
            {uploadedFile && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                {(() => { const FIcon = getFileIcon(uploadedFile); return <FIcon className="h-4 w-4 text-gray-500" />; })()}
                <span className="text-[13px] text-gray-700">{uploadedFile}</span>
                <span className="text-[11px] text-emerald-600 ml-auto">已上传</span>
              </div>
            )}

            {suggestions.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-[13px] font-medium text-gray-900">AI 推荐以下 Skill</span>
                </div>
                <div className="space-y-3">
                  {suggestions.map((sug) => (
                    <div key={sug.skill_id}
                      className="rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                    >
                      <h4 className="text-[14px] font-semibold text-gray-900 mb-1">{sug.name}</h4>
                      <p className="text-[12px] text-emerald-600 mb-2">{sug.reason}</p>
                      <p className="text-[11px] text-gray-400 mb-3">{sug.description}</p>
                      <button onClick={() => onSelectSkill(sug.skill_id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] text-white hover:bg-emerald-600 transition-colors"
                      >
                        <Play className="h-3 w-3" /> 使用这个 Skill
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-[13px] text-gray-500">暂未识别到匹配的 Skill</p>
                <p className="mt-1 text-[12px] text-gray-400">文件已保存到企业资产，你可以手动选择 Skill 来分析</p>
              </div>
            )}

            <button onClick={() => { setPhase("upload"); setSuggestions([]); setUploadedFile(""); }}
              className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-[13px] text-gray-600 hover:bg-gray-50"
            >
              上传另一个文件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
