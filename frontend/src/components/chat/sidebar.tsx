"use client";

import { Plus, LogOut, MessageSquare, User, Package, Database, BarChart3, Users, Brain } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { ViewMode } from "./chat-layout";

function formatTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { userId, logout } = useAuthStore();
  const {
    conversations,
    currentConversationId,
    newConversation,
    setCurrentConversation,
  } = useChatStore();

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* 视图切换标签 */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => onViewChange("chat")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            currentView === "chat"
              ? "border-b-2 border-[#2563eb] text-[#2563eb]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          对话
        </button>
        <button
          type="button"
          onClick={() => onViewChange("skills")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            currentView === "skills"
              ? "border-b-2 border-[#2563eb] text-[#2563eb]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Package className="h-4 w-4" />
          Skill
        </button>
        <button
          type="button"
          onClick={() => onViewChange("assets")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            currentView === "assets"
              ? "border-b-2 border-[#2563eb] text-[#2563eb]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Database className="h-4 w-4" />
          资产
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {currentView === "chat" && (
          <button
            type="button"
            onClick={() => {
              newConversation();
              onViewChange("chat");
            }}
            className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb]"
          >
            <Plus className="h-4 w-4" />
            新建对话
          </button>
        )}

        <div className="scrollbar-thin mt-3 flex-1 overflow-y-auto px-2">
          {currentView === "chat" &&
            conversations.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              const isActive = conv.id === currentConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setCurrentConversation(conv.id);
                    onViewChange("chat");
                  }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-[#eff6ff] text-[#2563eb]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {conv.title || "新对话"}
                    </div>
                    {lastMsg && (
                      <div className="truncate text-xs text-gray-500">
                        {formatTime(lastMsg.createdAt)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
            className={`flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
              currentView === "dashboard" ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            看板
          </button>
          <button
            type="button"
            onClick={() => onViewChange("twin")}
            className={`flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
              currentView === "twin" ? "bg-cyan-50 text-cyan-600" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            孪生
          </button>
          <button
            type="button"
            onClick={() => onViewChange("team")}
            className={`flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
              currentView === "team" ? "bg-violet-50 text-violet-600" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            团队
          </button>
        </div>
        <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="truncate">{userId || "用户"}</span>
          </div>
          <NotificationBell />
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
