"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
  MessageSquare,
  Layers,
  Tag,
  Loader2,
  Clock,
  Timer,
  Store,
} from "lucide-react";
import { fetchSkills, getToken, type SkillInfo } from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";
import { ExecutionHistory } from "./execution-history";
import { SchedulePanel } from "./schedule-panel";
import { MarketplacePanel } from "./marketplace-panel";

type SubTab = "skills" | "history" | "schedule" | "market";

interface SkillPanelProps {
  onSwitchToChat: () => void;
}

export function SkillPanel({ onSwitchToChat }: SkillPanelProps) {
  const [subTab, setSubTab] = useState<SubTab>("skills");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const newConversation = useChatStore((s) => s.newConversation);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetchSkills(token)
      .then(setSkills)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRunSkill = (skill: SkillInfo) => {
    newConversation();
    const trigger = skill.trigger_phrases[0] || skill.name;
    sendMessage(trigger);
    onSwitchToChat();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Skill 工作台</h1>
              <p className="text-sm text-gray-500">管理你的经营工作流</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSubTab("skills")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                subTab === "skills" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Skill 列表
            </button>
            <button
              onClick={() => setSubTab("history")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                subTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              执行历史
            </button>
            <button
              onClick={() => setSubTab("schedule")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                subTab === "schedule" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              定时
            </button>
            <button
              onClick={() => setSubTab("market")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                subTab === "market" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              市场
            </button>
          </div>
        </div>

        {subTab === "history" ? (
          <ExecutionHistory />
        ) : subTab === "schedule" ? (
          <SchedulePanel />
        ) : subTab === "market" ? (
          <MarketplacePanel />
        ) : (
        <>
        <div className="mb-6 grid grid-cols-3 gap-4">
          <StatCard icon={Package} label="已安装" value={skills.length} color="indigo" />
          <StatCard
            icon={Sparkles}
            label="预装"
            value={skills.filter((s) => s.source === "preset").length}
            color="blue"
          />
          <StatCard
            icon={Tag}
            label="自定义"
            value={skills.filter((s) => s.source === "custom").length}
            color="emerald"
          />
        </div>

        <div className="space-y-3">
          {skills.map((skill) => (
            <SkillCard
              key={skill.skill_id}
              skill={skill}
              expanded={expandedId === skill.skill_id}
              onToggle={() =>
                setExpandedId(expandedId === skill.skill_id ? null : skill.skill_id)
              }
              onRun={() => handleRunSkill(skill)}
            />
          ))}
        </div>

        {skills.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">暂无 Skill</p>
            <p className="mt-1 text-xs text-gray-400">
              在对话中描述你的工作流程，AI 会帮你创建
            </p>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-800">创建新 Skill</p>
              <p className="mt-1 text-sm text-blue-600">
                回到对话，告诉AI你的工作流程，比如「我每天早上会先看昨天的退款订单，然后...」
                AI 会帮你把它变成一个可自动执行的 Skill。
              </p>
              <button
                onClick={onSwitchToChat}
                className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 transition-colors"
              >
                去对话中创建
              </button>
            </div>
          </div>
        </div>
        </>
        )}
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
  icon: typeof Package;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SkillCard({
  skill,
  expanded,
  onToggle,
  onRun,
}: {
  skill: SkillInfo;
  expanded: boolean;
  onToggle: () => void;
  onRun: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <Package className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{skill.name}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              v{skill.version}
            </span>
            {skill.source === "preset" && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                预装
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-500">{skill.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-600 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            执行
          </button>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
              <span className="text-xs font-medium text-gray-500">触发词</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skill.trigger_phrases.map((t) => (
                <span key={t} className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layers className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">
                执行流程（{skill.intake_count} 个采集问题 → {skill.step_count} 个执行步骤）
              </span>
            </div>
            <div className="space-y-1">
              {skill.steps.map((step, i) => (
                <div key={step.step_id} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-sm text-gray-700">{step.name}</span>
                    {step.description && (
                      <span className="ml-1.5 text-xs text-gray-400">{step.description}</span>
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
}
