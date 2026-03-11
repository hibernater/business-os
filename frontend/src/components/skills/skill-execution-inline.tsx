"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { streamChat, getToken, clearToken } from "@/lib/api";

type Phase = "idle" | "running" | "done" | "error";

interface StreamEvent {
  type: string;
  content?: string;
  text?: string;
  skill_name?: string;
  name?: string;
  step_name?: string;
  step_index?: number;
  total_steps?: number;
  error?: string;
  message?: string;
}

interface Props {
  skillName: string;
  triggerPhrase: string;
  onClose: () => void;
}

function parseStreamEvent(line: string): StreamEvent | null {
  const trimmed = line.startsWith("data:") ? line.slice(line.indexOf(":") + 1).trim() : line.trim();
  if (!trimmed || trimmed === "[DONE]") return null;
  try {
    return JSON.parse(trimmed) as StreamEvent;
  } catch {
    return null;
  }
}

export function SkillExecutionInline({ skillName, triggerPhrase, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [output, setOutput] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const [stepProgress, setStepProgress] = useState<{ index: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [output, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) {
        setPhase("error");
        setErrorMsg("请先登录");
        return;
      }

      setPhase("running");

      try {
        const res = await streamChat(triggerPhrase, null, token, { autoExecute: true });

        if (!res.ok) {
          if (res.status === 401) {
            clearToken();
            window.location.reload();
            return;
          }
          throw new Error(`请求失败: ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (!reader) throw new Error("无法读取响应流");

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const event = parseStreamEvent(line);
            if (!event) continue;

            switch (event.type) {
              case "intent":
                if (event.skill_name) {
                  setOutput((prev) => prev + `**正在执行：${event.skill_name}**\n\n`);
                }
                break;

              case "step_start": {
                const n = (event.step_index ?? 0) + 1;
                const t = event.total_steps ?? "?";
                setCurrentStep(event.step_name ?? "");
                setStepProgress({ index: n, total: typeof t === "number" ? t : 0 });
                setOutput((prev) => prev + `\n---\n\n**Step ${n}/${t}: ${event.step_name ?? ""}**\n\n`);
                break;
              }

              case "text_delta":
                setOutput((prev) => prev + (event.content ?? event.text ?? ""));
                break;

              case "step_done":
                setOutput((prev) => prev + "\n");
                break;

              case "step_error":
                setOutput((prev) => prev + `\n**出错**: ${event.error ?? "未知错误"}\n`);
                break;

              case "skill_done":
                setOutput((prev) => prev + "\n---\n\n执行完成\n");
                setPhase("done");
                break;

              case "error":
                setOutput((prev) => prev + `\n${event.message ?? "发生错误"}\n`);
                setPhase("error");
                setErrorMsg(event.message ?? "发生错误");
                break;

              case "done":
                setPhase((prev) => (prev === "running" ? "done" : prev));
                break;
            }
          }
        }

        setPhase((prev) => (prev === "running" ? "done" : prev));
      } catch (err) {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg(err instanceof Error ? err.message : "执行失败");
        }
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPercent =
    stepProgress && stepProgress.total > 0
      ? Math.round((stepProgress.index / stepProgress.total) * 100)
      : null;

  return (
    <div className="border-t border-gray-100 bg-white">
      {/* 状态栏 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {phase === "running" && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
          {phase === "done" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
          {phase === "error" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
          {phase === "idle" && <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />}
          <span className="text-[13px] font-medium text-gray-700 truncate">
            {phase === "running" && (currentStep || "执行中...")}
            {phase === "done" && "执行完成"}
            {phase === "error" && "执行出错"}
            {phase === "idle" && "准备中..."}
          </span>
          {progressPercent !== null && phase === "running" && (
            <span className="text-[12px] text-gray-400 tabular-nums">{progressPercent}%</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          {(phase === "done" || phase === "error") && (
            <button
              onClick={onClose}
              className="ml-1 rounded-lg px-2.5 py-1 text-[12px] text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              关闭
            </button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      {progressPercent !== null && phase === "running" && (
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 输出 */}
      {!collapsed && (
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin px-5 py-4">
          {output ? (
            <div className="prose prose-sm prose-gray max-w-none text-[14px] leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            </div>
          ) : phase === "running" ? (
            <div className="flex items-center gap-2 text-[13px] text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在启动任务...
            </div>
          ) : null}

          {phase === "error" && errorMsg && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {errorMsg}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
