"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Package,
  FileText,
  BarChart3,
  ShoppingCart,
  MessageSquare,
  Download,
} from "lucide-react";
import { Capsule } from "./capsule";
import { InteractiveElements } from "./interactive-elements";
import { useChatStore, type ChatMessage } from "@/stores/chat-store";

const CAPSULES = [
  { icon: Package, text: "做一个新品开发方案" },
  { icon: FileText, text: "今天生意怎么样" },
  { icon: BarChart3, text: "帮我看看这个款" },
  { icon: ShoppingCart, text: "选品分析" },
  { icon: MessageSquare, text: "你能帮我做什么" },
] as const;

function AssistantContent({ message }: { message: ChatMessage }) {
  const hasInteractive = message.interactiveElements && message.interactiveElements.length > 0;

  return (
    <div>
      {message.content && (
        <div className="prose prose-sm prose-gray max-w-none break-words leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mt-4 mb-2 text-lg font-bold">{children}</h1>,
              h2: ({ children }) => <h2 className="mt-3 mb-2 text-base font-semibold">{children}</h2>,
              h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              hr: () => <hr className="my-3 border-gray-200" />,
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-4 border-blue-300 bg-blue-50/50 py-1 pl-3 text-sm text-gray-700">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-200 text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-left font-medium">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-200 px-3 py-1.5">{children}</td>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-sm font-mono text-pink-600">{children}</code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-sm text-gray-100">{children}</pre>
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
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb]/10">
              <Sparkles className="h-7 w-7 text-[#2563eb]" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              商家OS - AI经营工作台
            </h2>
            <p className="mb-8 text-center text-gray-500">
              中小企业主的智能经营助手
              <br />
              告诉我你想做什么，或者点击下面的快捷入口
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {CAPSULES.map(({ icon, text }) => (
                <Capsule
                  key={text}
                  icon={icon}
                  text={text}
                  onClick={() => {
                    newConversation();
                    sendMessage(text);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
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
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
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
                  className={
                    msg.role === "user"
                      ? "message-bubble-user"
                      : "message-bubble-assistant"
                  }
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
