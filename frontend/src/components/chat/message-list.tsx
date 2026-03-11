"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  ArrowRight,
  Download,
} from "lucide-react";
import { InteractiveElements } from "./interactive-elements";
import { useChatStore, type ChatMessage } from "@/stores/chat-store";

const SUGGESTIONS = [
  { text: "做一个新品开发方案", desc: "基于市场趋势分析，推荐潜力爆款方向" },
  { text: "今天生意怎么样", desc: "查看今日经营数据概览和关键指标" },
  { text: "帮我做个选品分析", desc: "分析品类竞争格局，找到差异化机会" },
  { text: "能告诉我你有哪些技能吗？", desc: "了解所有可用的 Skill 工作流" },
] as const;

function AssistantContent({ message }: { message: ChatMessage }) {
  const hasInteractive = message.interactiveElements && message.interactiveElements.length > 0;
  return (
    <div>
      {message.content && (
        <div className="prose prose-base prose-gray max-w-none break-words leading-relaxed text-[15px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mt-5 mb-3 text-xl font-bold">{children}</h1>,
              h2: ({ children }) => <h2 className="mt-4 mb-2 text-lg font-semibold">{children}</h2>,
              h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-base font-semibold">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              hr: () => <hr className="my-3 border-gray-200" />,
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-4 border-blue-300 bg-blue-50/50 py-1 pl-3 text-[14px] text-gray-700">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-200 text-[14px]">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-200 px-3 py-2">{children}</td>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[13px] font-mono text-pink-600">{children}</code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-2 overflow-x-auto rounded-lg bg-gray-900 p-4 text-[13px] text-gray-100">{children}</pre>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
      {hasInteractive && <InteractiveElements elements={message.interactiveElements!} />}
    </div>
  );
}

export function MessageList() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const {
    conversations,
    currentConversationId,
    isStreaming,
    sendMessage,
    newConversation,
    exportCurrentAsMarkdown,
  } = useChatStore();

  const currentConv = conversations.find((c) => c.id === currentConversationId);
  const messages = currentConv?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center pt-16 pb-8">
            {/* Logo + 欢迎语 */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-2 text-[22px] font-semibold text-gray-900">
              你好，有什么我可以帮你的？
            </h2>
            <p className="mb-12 text-center text-[15px] text-gray-500 leading-relaxed">
              我是你的 AI 经营助手，可以帮你做选品分析、经营复盘、定价策略等工作。
            </p>

            {/* 建议卡片 */}
            <div className="w-full max-w-lg space-y-3">
              {SUGGESTIONS.map(({ text, desc }) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => {
                    newConversation();
                    sendMessage(text);
                  }}
                  className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
                >
                  <Sparkles className="h-5 w-5 shrink-0 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-gray-900">{text}</div>
                    <div className="mt-0.5 text-[13px] text-gray-400">{desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {messages.length > 1 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    const md = exportCurrentAsMarkdown();
                    if (!md) return;
                    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${currentConv?.title ?? "对话"}_${new Date().toISOString().slice(0, 10)}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  导出 Markdown
                </button>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} message-animate-in`}
              >
                <div
                  className={msg.role === "user" ? "message-bubble-user" : "message-bubble-assistant"}
                  style={msg.role === "assistant" ? { maxWidth: "100%" } : undefined}
                >
                  {msg.role === "assistant" && !msg.content && !msg.interactiveElements?.length && isStreaming ? (
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : msg.role === "assistant" ? (
                    <AssistantContent message={msg} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
