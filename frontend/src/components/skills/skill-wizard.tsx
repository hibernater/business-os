"use client";

import { useState } from "react";
import {
  X,
  Search,
  DollarSign,
  Users,
  RotateCcw,
  BarChart3,
  Wrench,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { getToken, generateSkillFromWizard } from "@/lib/api";

const SCENES = [
  { id: "选品分析", icon: Search, color: "bg-blue-100 text-blue-600", desc: "分析市场、竞品，找到值得做的新品" },
  { id: "定价策略", icon: DollarSign, color: "bg-emerald-100 text-emerald-600", desc: "基于成本和竞品，制定最优价格" },
  { id: "客户运营", icon: Users, color: "bg-purple-100 text-purple-600", desc: "客户分群、复购提升、流失预警" },
  { id: "退款分析", icon: RotateCcw, color: "bg-orange-100 text-orange-600", desc: "分析退款原因，降低退款率" },
  { id: "经营复盘", icon: BarChart3, color: "bg-indigo-100 text-indigo-600", desc: "每日数据汇总，快速了解经营情况" },
  { id: "自定义", icon: Wrench, color: "bg-gray-100 text-gray-600", desc: "描述你的需求，AI 帮你定制" },
];

const SCENE_QUESTIONS: Record<string, { question: string; field: string; options: string[] }[]> = {
  "选品分析": [
    { question: "你的店铺主要做什么品类？", field: "category", options: ["家居收纳", "厨房用品", "卫浴用品", "3C配件", "服装", "食品", "其他"] },
    { question: "你最关注新品的哪方面？", field: "focus", options: ["利润空间", "市场需求", "竞争程度", "差异化", "供应链难度"] },
  ],
  "定价策略": [
    { question: "你主要卖什么品类？", field: "category", options: ["家居收纳", "厨房用品", "卫浴用品", "五金工具", "服装", "其他"] },
    { question: "你的目标毛利率大概多少？", field: "target_margin", options: ["30%以下", "30-50%", "50-70%", "70%以上"] },
  ],
  "客户运营": [
    { question: "你的客户规模大概多少？", field: "scale", options: ["100以下", "100-1000", "1000-10000", "10000以上"] },
    { question: "最想解决什么客户问题？", field: "goal", options: ["提升复购率", "激活沉睡客户", "找高价值VIP", "全面了解客户"] },
  ],
  "退款分析": [
    { question: "你想分析哪个时间段的退款？", field: "time_range", options: ["最近7天", "最近30天", "最近3个月"] },
    { question: "主要在哪个平台？", field: "platform", options: ["淘天", "拼多多", "1688", "抖音", "全部平台"] },
  ],
  "经营复盘": [
    { question: "你想看哪方面的数据？", field: "scope", options: ["全部概览", "订单和营收", "流量和转化", "客服和售后"] },
    { question: "要和什么时间做对比？", field: "compare", options: ["昨天", "上周同期", "上月同期", "不用对比"] },
  ],
  "自定义": [
    { question: "简单描述你想自动化的工作", field: "description", options: [] },
  ],
};

interface SkillWizardProps {
  onClose: () => void;
  onCreated: (skillId: string) => void;
}

export function SkillWizard({ onClose, onCreated }: SkillWizardProps) {
  const [step, setStep] = useState(0);
  const [scene, setScene] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [customText, setCustomText] = useState("");

  const questions = scene ? (SCENE_QUESTIONS[scene] || []) : [];

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) return;
    setGenerating(true);
    try {
      const finalAnswers = scene === "自定义" ? { ...answers, description: customText } : answers;
      const res = await generateSkillFromWizard(token, scene, finalAnswers);
      setResult(res);
      setStep(2);
    } catch {
      setResult({ status: "error", message: "生成失败，请重试" });
      setStep(2);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h3 className="text-[16px] font-semibold text-gray-900">
              {step === 0 ? "选择场景" : step === 1 ? "补充信息" : "生成结果"}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-5 flex items-center gap-2">
          {["选场景", "补充信息", "确认"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                i <= step ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>{i + 1}</div>
              <span className={`text-[12px] ${i <= step ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
              {i < 2 && <ArrowRight className="h-3 w-3 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 0: Choose scene */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3">
            {SCENES.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.id}
                  onClick={() => { setScene(s.id); setStep(1); }}
                  className={`rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-all ${
                    scene === s.id ? "border-indigo-400 bg-indigo-50" : ""
                  }`}
                >
                  <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900">{s.id}</div>
                  <div className="mt-0.5 text-[11px] text-gray-500">{s.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 1: Answer questions */}
        {step === 1 && (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.field}>
                <label className="mb-2 block text-[13px] font-medium text-gray-700">{q.question}</label>
                {q.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.field]: opt }))}
                        className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                          answers[q.field] === opt
                            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >{opt}</button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="比如：每天早上看昨天的退款订单，找出退款最多的商品..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 resize-none"
                  />
                )}
              </div>
            ))}

            <div className="flex gap-3 justify-between pt-2">
              <button onClick={() => { setStep(0); setAnswers({}); }}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> 上一步
              </button>
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generating ? "生成中..." : "生成 Skill"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Result */}
        {step === 2 && result && (
          <div className="space-y-4">
            {result.status === "error" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
                {String(result.message || "生成失败")}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-[13px] font-medium text-green-800">
                      {result.mode === "preset_match" ? "匹配到现有 Skill" : "Skill 已生成"}
                    </span>
                  </div>
                  <h4 className="text-[15px] font-semibold text-gray-900">{String(result.name || "")}</h4>
                  <p className="mt-1 text-[12px] text-gray-500">{String(result.description || "")}</p>
                  {Array.isArray(result.steps) && (
                    <div className="mt-3 space-y-1">
                      {(result.steps as { name: string; description: string }[]).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px]">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-[10px] font-medium">{i + 1}</span>
                          <span className="text-gray-700">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setStep(0); setScene(""); setAnswers({}); setResult(null); }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={() => onCreated(String(result.skill_id || ""))}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] text-white hover:bg-indigo-600"
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> 立即执行
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
