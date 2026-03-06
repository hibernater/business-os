"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

export function MessageInput() {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming } = useChatStore();

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[#2563eb]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="告诉我你想做什么..."
          rows={1}
          disabled={isStreaming}
          className="max-h-[120px] flex-1 resize-none bg-transparent px-3 py-2 text-gray-900 placeholder-gray-500 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || isStreaming}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2563eb] text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
