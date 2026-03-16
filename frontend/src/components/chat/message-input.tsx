"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Maximize2 } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

const MAX_LENGTH = 10000;

export function MessageInput() {
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming } = useChatStore();

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxH = expanded ? 320 : 140;
    ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
  }, [value, expanded]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setValue("");
    setExpanded(false);
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
    <div className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 transition-colors focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-sm">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= MAX_LENGTH) {
                setValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="告诉我你想做什么..."
            rows={expanded ? 6 : 2}
            disabled={isStreaming}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] text-gray-900 placeholder-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title={expanded ? "收起" : "展开"}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-gray-400 tabular-nums">
                {value.length}/{MAX_LENGTH}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim() || isStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[12px] text-gray-400">Works for you, grows with you</p>
      </div>
    </div>
  );
}
