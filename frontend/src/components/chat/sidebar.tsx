"use client";

import { useState } from "react";
import {
  Plus,
  LogOut,
  MessageSquare,
  User,
  Package,
  Database,
  Users,
  Brain,
  Bell,
  Zap,
  ListTodo,
  GitBranch,
  Home,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { isDesktop } from "@/lib/desktop";
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

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  trailing?: React.ReactNode;
}

function NavItem({ icon, label, active, onClick, badge, trailing }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
        active
          ? "bg-blue-50 text-blue-600 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-medium text-white">
          {badge}
        </span>
      )}
      {trailing}
    </button>
  );
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { userId, logout } = useAuthStore();
  const {
    conversations,
    currentConversationId,
    newConversation,
    setCurrentConversation,
  } = useChatStore();
  const [chatExpanded, setChatExpanded] = useState(currentView === "chat");

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <span className="text-[16px] font-bold text-gray-900">商家OS</span>
          <span className="ml-1.5 text-[11px] text-gray-400">{isDesktop() ? "桌面版" : "v1.0"}</span>
        </div>
      </div>

      {/* 导航 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {/* 主导航 */}
        <div className="space-y-0.5">
          <NavItem
            icon={<Home className="h-4 w-4" />}
            label="首页"
            active={currentView === "home"}
            onClick={() => onViewChange("home")}
          />

          <div className="my-2 border-t border-gray-100" />

          <NavItem
            icon={<Package className="h-4 w-4" />}
            label="Skill 库"
            active={currentView === "skills"}
            onClick={() => onViewChange("skills")}
          />
          <NavItem
            icon={<GitBranch className="h-4 w-4" />}
            label="工作流"
            active={currentView === "workflows"}
            onClick={() => onViewChange("workflows")}
          />
          <NavItem
            icon={<ListTodo className="h-4 w-4" />}
            label="任务管理"
            active={currentView === "tasks"}
            onClick={() => onViewChange("tasks")}
          />
          <NavItem
            icon={<Database className="h-4 w-4" />}
            label="企业资产"
            active={currentView === "assets"}
            onClick={() => onViewChange("assets")}
          />
          <NavItem
            icon={<Brain className="h-4 w-4" />}
            label="数字孪生"
            active={currentView === "twin"}
            onClick={() => onViewChange("twin")}
          />

          <div className="my-2 border-t border-gray-100" />

          {/* 对话（降级） */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { onViewChange("chat"); setChatExpanded(true); }}
              className={`flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                currentView === "chat"
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="flex-1 text-left">对话</span>
              <span
                onClick={(e) => { e.stopPropagation(); setChatExpanded(!chatExpanded); }}
                className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200"
              >
                {chatExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { newConversation(); onViewChange("chat"); setChatExpanded(true); }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="新建对话"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* 对话历史（折叠） */}
          {chatExpanded && conversations.length > 0 && (
            <div className="ml-2 mt-1 space-y-0.5">
              {conversations.map((conv) => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                const isActive = currentView === "chat" && conv.id === currentConversationId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => { setCurrentConversation(conv.id); onViewChange("chat"); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors ${
                      isActive ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{conv.title || "新对话"}</div>
                      {lastMsg && (
                        <div className="truncate text-[10px] text-gray-400">{formatTime(lastMsg.createdAt)}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <NavItem
            icon={<Users className="h-4 w-4" />}
            label="团队管理"
            active={currentView === "team"}
            onClick={() => onViewChange("team")}
          />
        </div>
      </div>

      {/* 底部用户区 */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-[14px] text-gray-600">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <span className="truncate font-medium">{userId || "用户"}</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
