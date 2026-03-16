"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
  Layers,
  Tag,
  Loader2,
  Clock,
  Timer,
  Store,
  CheckCircle2,
  ExternalLink,
  Search,
  DollarSign,
  Users,
  RotateCcw,
  BarChart3,
  Zap,
  ArrowRight,
  Upload,
  Wand2,
  FileText,
  X,
  Star,
  MessageCircle,
  Download,
} from "lucide-react";
import {
  fetchSkills,
  fetchSkillRecommendations,
  getToken,
  getAuthData,
  createTask,
  streamChat,
  type SkillInfo,
  type SkillRecommendation,
  type QuickSetupQuestion,
} from "@/lib/api";
import { ExecutionHistory } from "./execution-history";
import { SchedulePanel } from "./schedule-panel";
import { MarketplacePanel } from "./marketplace-panel";
import { SkillWizard } from "./skill-wizard";
import { DocToSkill } from "./doc-to-skill";

type SubTab = "skills" | "history" | "schedule" | "market";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  "dollar-sign": DollarSign,
  users: Users,
  "rotate-ccw": RotateCcw,
  "bar-chart": BarChart3,
  star: Star,
  "message-circle": MessageCircle,
  "file-text": FileText,
  zap: Zap,
  download: Download,
  package: Package,
};

function getSkillIcon(icon: string) {
  return ICON_MAP[icon] || Package;
}

interface SkillPanelProps {
  onSwitchToChat: () => void;
  onSwitchToTasks?: () => void;
}

export function SkillPanel({ onSwitchToChat, onSwitchToTasks }: SkillPanelProps) {
  const [subTab, setSubTab] = useState<SubTab>("skills");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null);
  const [taskCreatedFor, setTaskCreatedFor] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [quickSetupFor, setQuickSetupFor] = useState<SkillInfo | null>(null);
  const [quickSetupAnswers, setQuickSetupAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = getToken();
    const auth = getAuthData();
    if (!token) return;

    setLoading(true);
    const loadAll = async () => {
      try {
        const [skillList, recs] = await Promise.all([
          fetchSkills(token),
          auth?.enterpriseId ? fetchSkillRecommendations(token, auth.enterpriseId) : Promise.resolve([]),
        ]);
        setSkills(skillList);
        setRecommendations(recs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const handleRunSkill = async (skillId: string, skillName: string, triggerPhrase: string, stepCount: number) => {
    const token = getToken();
    if (!token) return;

    setCreatingTaskFor(skillId);
    setTaskCreatedFor(null);

    try {
      const result = await createTask(token, {
        skillId,
        skillName,
        triggerType: "manual",
        totalSteps: stepCount,
      });

      if (result.status === "ok" && result.task?.id) {
        setTaskCreatedFor(skillId);
        streamChat(triggerPhrase || skillName, null, token, {
          autoExecute: true,
          taskId: result.task.id,
        }).catch(() => {});
        setTimeout(() => setTaskCreatedFor(null), 5000);
      }
    } catch {
      setError("创建任务失败");
    } finally {
      setCreatingTaskFor(null);
    }
  };

  const handleQuickSetupConfirm = (skill: SkillInfo) => {
    handleRunSkill(
      skill.skill_id,
      skill.name,
      skill.trigger_phrases[0] || skill.name,
      skill.step_count,
    );
    setQuickSetupFor(null);
    setQuickSetupAnswers({});
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-4 sm:p-6 space-y-0">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Skill 库</h1>
              <p className="text-[13px] text-gray-500">AI 帮你分析经营数据、自动化工作流</p>
            </div>
          </div>
        </div>

        {/* Sub tabs */}
        <div className="mb-5 flex gap-1 rounded-lg bg-gray-100 p-1">
          {([
            { key: "skills", label: "获取 Skill", icon: Sparkles },
            { key: "history", label: "执行历史", icon: Clock },
            { key: "schedule", label: "定时", icon: Timer },
            { key: "market", label: "市场", icon: Store },
          ] as const).map((tab) => (
            <button key={tab.key} onClick={() => setSubTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-colors ${
                subTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {subTab === "history" ? (
          <ExecutionHistory />
        ) : subTab === "schedule" ? (
          <SchedulePanel />
        ) : subTab === "market" ? (
          <MarketplacePanel />
        ) : (
          <>
            {/* 三种获取方式入口 */}
            <div className="mb-5 grid grid-cols-3 gap-3">
              <EntryCard
                icon={Wand2} color="indigo" label="引导创建"
                desc="选场景，3 步生成"
                onClick={() => setShowWizard(true)}
              />
              <EntryCard
                icon={Upload} color="emerald" label="文档生成"
                desc="传文件，AI 分析"
                onClick={() => setShowDocUpload(true)}
              />
              <EntryCard
                icon={Zap} color="amber" label="对话创建"
                desc="描述工作流，AI 生成"
                onClick={onSwitchToChat}
              />
            </div>

            {/* 智能推荐 */}
            {recommendations.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h2 className="text-[14px] font-semibold text-gray-900">为你推荐</h2>
                  <span className="text-[12px] text-gray-400">基于你的企业资产分析</span>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(recommendations.length, 3)}, 1fr)` }}>
                  {recommendations.map((rec) => {
                    const Icon = getSkillIcon(rec.icon);
                    return (
                      <div key={rec.skill_id}
                        className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                            <Icon className="h-4 w-4 text-amber-600" />
                          </div>
                          <h3 className="text-[13px] font-semibold text-gray-900">{rec.name}</h3>
                        </div>
                        <p className="text-[12px] text-amber-700 leading-relaxed mb-3">{rec.reason}</p>
                        <button
                          onClick={() => {
                            const matched = skills.find(s => s.skill_id === rec.skill_id);
                            if (matched && matched.quick_setup?.length > 0) {
                              setQuickSetupFor(matched);
                            } else if (matched) {
                              handleRunSkill(matched.skill_id, matched.name, matched.trigger_phrases[0] || matched.name, matched.step_count);
                            }
                          }}
                          className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] text-white hover:bg-amber-600 transition-colors"
                        >
                          <Play className="h-3 w-3" /> 立即使用
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 已安装 Skill 列表 */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-gray-900">
                已安装 Skill
                <span className="ml-2 text-[12px] font-normal text-gray-400">{skills.length} 个</span>
              </h2>
            </div>

            <div className="space-y-3">
              {skills.map((skill) => {
                const Icon = getSkillIcon(skill.icon);
                const isCreating = creatingTaskFor === skill.skill_id;
                const taskCreated = taskCreatedFor === skill.skill_id;
                const expanded = expandedId === skill.skill_id;

                return (
                  <div key={skill.skill_id}
                    className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                        <Icon className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[14px] text-gray-900">{skill.name}</h3>
                          {skill.usage_count > 0 && (
                            <span className="text-[11px] text-gray-400">{skill.usage_count}+ 家在用</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-gray-500">{skill.description}</p>
                        {skill.industry?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {skill.industry.filter(i => i !== "通用").slice(0, 3).map(i => (
                              <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{i}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {taskCreated ? (
                          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-[12px] text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            任务已创建
                            {onSwitchToTasks && (
                              <button onClick={onSwitchToTasks}
                                className="ml-1 flex items-center gap-0.5 text-green-700 hover:text-green-800 underline underline-offset-2"
                              >
                                查看 <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (skill.quick_setup?.length > 0) {
                                setQuickSetupFor(skill);
                              } else {
                                handleRunSkill(skill.skill_id, skill.name, skill.trigger_phrases[0] || skill.name, skill.step_count);
                              }
                            }}
                            disabled={isCreating}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[12px] text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                          >
                            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            {isCreating ? "创建中..." : "执行"}
                          </button>
                        )}
                        <button onClick={() => setExpandedId(expanded ? null : skill.skill_id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Tag className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-[11px] font-medium text-gray-500">触发词</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {skill.trigger_phrases.map((t) => (
                              <span key={t} className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Layers className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-[11px] font-medium text-gray-500">
                              执行流程（{skill.intake_count} 个问题 → {skill.step_count} 个步骤）
                            </span>
                          </div>
                          <div className="space-y-1">
                            {skill.steps.map((step, i) => (
                              <div key={step.step_id} className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-medium text-indigo-600">
                                  {i + 1}
                                </span>
                                <div>
                                  <span className="text-[12px] text-gray-700">{step.name}</span>
                                  {step.description && (
                                    <span className="ml-1.5 text-[11px] text-gray-400">{step.description}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {skills.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-[13px] text-gray-500">暂无 Skill</p>
                <p className="mt-1 text-[12px] text-gray-400">
                  点击上方「引导创建」或「文档生成」快速获取你的第一个 Skill
                </p>
              </div>
            )}

            {/* 飞轮说明 */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] text-gray-600 font-medium">Skill 越多，AI 越懂你的生意</p>
                  <p className="mt-1 text-[12px] text-gray-400">
                    每次执行 Skill 的结果会自动沉淀到企业资产和数字孪生，AI 下次分析会更准确、更贴合你的实际情况。
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600">获取 Skill</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600">执行分析</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600">沉淀数据</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600">越来越懂你</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Setup Dialog */}
        {quickSetupFor && (
          <QuickSetupDialog
            skill={quickSetupFor}
            answers={quickSetupAnswers}
            onAnswerChange={(field, value) => setQuickSetupAnswers(prev => ({ ...prev, [field]: value }))}
            onConfirm={() => handleQuickSetupConfirm(quickSetupFor)}
            onClose={() => { setQuickSetupFor(null); setQuickSetupAnswers({}); }}
          />
        )}

        {/* Wizard */}
        {showWizard && <SkillWizard onClose={() => setShowWizard(false)} onCreated={(skillId) => {
          setShowWizard(false);
          const matched = skills.find(s => s.skill_id === skillId);
          if (matched) {
            handleRunSkill(matched.skill_id, matched.name, matched.trigger_phrases[0] || matched.name, matched.step_count);
          }
        }} />}

        {/* Doc Upload */}
        {showDocUpload && <DocToSkill onClose={() => setShowDocUpload(false)} onSelectSkill={(skillId) => {
          setShowDocUpload(false);
          const matched = skills.find(s => s.skill_id === skillId);
          if (matched) {
            if (matched.quick_setup?.length > 0) {
              setQuickSetupFor(matched);
            } else {
              handleRunSkill(matched.skill_id, matched.name, matched.trigger_phrases[0] || matched.name, matched.step_count);
            }
          }
        }} />}
      </div>
    </div>
  );
}

/* ── 入口卡片 ───────────────────── */
function EntryCard({ icon: Icon, color, label, desc, onClick }: {
  icon: typeof Search; color: string; label: string; desc: string; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    indigo: "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50",
    emerald: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50",
    amber: "border-amber-200 bg-amber-50/50 hover:bg-amber-50",
  };
  const iconColors: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-100",
    emerald: "text-emerald-600 bg-emerald-100",
    amber: "text-amber-600 bg-amber-100",
  };
  return (
    <button onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${colors[color]}`}
    >
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${iconColors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[13px] font-semibold text-gray-900">{label}</div>
      <div className="text-[11px] text-gray-500">{desc}</div>
    </button>
  );
}

/* ── Quick Setup Dialog ───────── */
function QuickSetupDialog({ skill, answers, onAnswerChange, onConfirm, onClose }: {
  skill: SkillInfo;
  answers: Record<string, string>;
  onAnswerChange: (field: string, value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const Icon = getSkillIcon(skill.icon);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[440px] rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
              <Icon className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">{skill.name}</h3>
              <p className="text-[12px] text-gray-500">回答几个问题，AI 分析更精准</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {skill.quick_setup.map((q) => (
            <div key={q.field}>
              <label className="mb-2 block text-[13px] font-medium text-gray-700">{q.question}</label>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <button key={opt} onClick={() => onAnswerChange(q.field, opt)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                      answers[q.field] === opt
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] text-white hover:bg-indigo-600"
          >
            <Play className="h-3.5 w-3.5" /> 开始执行
          </button>
          <button onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50"
          >
            跳过，直接执行
          </button>
        </div>
      </div>
    </div>
  );
}
