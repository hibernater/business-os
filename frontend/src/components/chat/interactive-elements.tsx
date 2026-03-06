"use client";

import { useState } from "react";
import {
  CheckCircle,
  ChevronRight,
  Save,
  Layers,
  MessageSquare,
} from "lucide-react";
import type {
  InteractiveElement,
  QuestionElement,
  PlanPreviewElement,
  CheckpointElement,
  CaptureOfferElement,
} from "@/stores/chat-store";
import { useChatStore } from "@/stores/chat-store";

interface Props {
  elements: InteractiveElement[];
}

export function InteractiveElements({ elements }: Props) {
  return (
    <div className="mt-3 space-y-3">
      {elements.map((el, i) => {
        switch (el.kind) {
          case "question":
            return <QuestionCard key={`q-${i}`} element={el} />;
          case "plan_preview":
            return <PlanPreviewCard key={`p-${i}`} element={el} />;
          case "checkpoint":
            return <CheckpointCard key={`c-${i}`} element={el} />;
          case "capture_offer":
            return <CaptureOfferCard key={`s-${i}`} element={el} />;
        }
      })}
    </div>
  );
}

// ========== 问题卡片 ==========

function QuestionCard({ element: q }: { element: QuestionElement }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const [selected, setSelected] = useState<string[]>(q.selectedOptions ?? []);
  const [freeText, setFreeText] = useState("");
  const disabled = q.answered || isStreaming;

  const handleOptionClick = (opt: string) => {
    if (disabled) return;
    if (q.allowMultiple) {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    } else {
      sendMessage(opt);
    }
  };

  const handleMultiSubmit = () => {
    if (selected.length > 0) {
      sendMessage(selected.join("、"));
    }
  };

  const handleFreeSubmit = () => {
    if (freeText.trim()) {
      sendMessage(freeText.trim());
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${disabled ? "border-gray-200 bg-gray-50 opacity-70" : "border-blue-200 bg-blue-50/50"}`}>
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-blue-500" />
        <span className="text-xs text-blue-600">
          问题 {q.questionIndex + 1}/{q.totalQuestions}
        </span>
      </div>
      <p className="mb-3 text-sm font-medium text-gray-800">{q.text}</p>

      {q.options.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                disabled={disabled && !q.answered}
                onClick={() => handleOptionClick(opt)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-all
                  ${
                    isSelected
                      ? "border-blue-400 bg-blue-100 text-blue-700"
                      : disabled
                        ? "border-gray-200 bg-white text-gray-400 cursor-default"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                  }`}
              >
                {q.allowMultiple && (
                  <span className="mr-1">{isSelected ? "☑" : "☐"}</span>
                )}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.allowMultiple && !disabled && selected.length > 0 && (
        <button
          onClick={handleMultiSubmit}
          className="mt-1 rounded-lg bg-blue-500 px-4 py-1.5 text-sm text-white hover:bg-blue-600 transition-colors"
        >
          确认选择 ({selected.length})
        </button>
      )}

      {q.allowFreeInput && !disabled && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFreeSubmit()}
            placeholder="或者直接输入..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          />
          {freeText.trim() && (
            <button
              onClick={handleFreeSubmit}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
            >
              发送
            </button>
          )}
        </div>
      )}

      {q.answered && q.selectedOptions && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>已回答: {q.selectedOptions.join("、")}</span>
        </div>
      )}
    </div>
  );
}

// ========== 执行计划预览 ==========

function PlanPreviewCard({ element: plan }: { element: PlanPreviewElement }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const disabled = plan.confirmed || isStreaming;

  return (
    <div className={`rounded-xl border p-4 ${disabled ? "border-gray-200 bg-gray-50 opacity-70" : "border-indigo-200 bg-indigo-50/50"}`}>
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-medium text-indigo-700">执行计划</span>
      </div>

      <div className="mb-3 space-y-2">
        {plan.steps.map((step, i) => (
          <div key={step.step_id} className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
              {i + 1}
            </span>
            <div>
              <span className="text-sm font-medium text-gray-800">{step.name}</span>
              <span className="ml-2 text-xs text-gray-500">{step.description}</span>
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <button
            onClick={() => sendMessage("开始执行")}
            className="flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
            开始执行
          </button>
          <button
            onClick={() => sendMessage("我想调整一下")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            调整计划
          </button>
        </div>
      )}

      {plan.confirmed && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>已确认执行</span>
        </div>
      )}
    </div>
  );
}

// ========== 步骤确认点 ==========

function CheckpointCard({ element: cp }: { element: CheckpointElement }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const [freeText, setFreeText] = useState("");
  const disabled = cp.replied || isStreaming;

  return (
    <div className={`rounded-xl border p-4 ${disabled ? "border-gray-200 bg-gray-50 opacity-70" : "border-amber-200 bg-amber-50/50"}`}>
      <p className="mb-3 text-sm text-gray-700">{cp.prompt}</p>

      {!disabled && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => sendMessage("继续")}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
              没问题，继续
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && freeText.trim()) sendMessage(freeText.trim());
              }}
              placeholder="有补充的可以在这里说..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
            />
            {freeText.trim() && (
              <button
                onClick={() => sendMessage(freeText.trim())}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
              >
                发送补充
              </button>
            )}
          </div>
        </div>
      )}

      {cp.replied && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>已确认</span>
        </div>
      )}
    </div>
  );
}

// ========== Skill 沉淀引导 ==========

function CaptureOfferCard({ element: cap }: { element: CaptureOfferElement }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const disabled = cap.replied || isStreaming;

  return (
    <div className={`rounded-xl border p-4 ${disabled ? "border-gray-200 bg-gray-50 opacity-70" : "border-emerald-200 bg-emerald-50/50"}`}>
      <div className="mb-2 flex items-center gap-2">
        <Save className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-700">保存为专属 Skill</span>
      </div>
      <p className="mb-3 text-sm text-gray-600">{cap.prompt}</p>

      {!disabled && (
        <div className="flex gap-2">
          <button
            onClick={() => sendMessage("保存")}
            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600 transition-colors"
          >
            <Save className="h-4 w-4" />
            保存偏好
          </button>
          <button
            onClick={() => sendMessage("不用了")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            暂时不用
          </button>
        </div>
      )}

      {cap.replied && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>已处理</span>
        </div>
      )}
    </div>
  );
}
