"use client";

import { useState } from "react";
import {
  Plus,
  LogOut,
  MessageSquare,
  User,
  Package,
  Database,
  BarChart3,
  Users,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Store,
  Bell,
  Settings,
  Zap,
  ListTodo,
} from "lucide-react";
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

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function NavGroup({ icon, label, defaultOpen = true, children }: NavGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-0.5 space-y-0.5 pl-2">{children}</div>}
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors ${
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

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <span className="text-[16px] font-bold text-gray-900">商家OS</span>
          <span className="ml-1.5 text-[11px] text-gray-400">v1.0</span>
        </div>
      </div>

      {/* 导航 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {/* 对话 */}
        <NavGroup icon={<MessageSquare className="h-4 w-4" />} label="对话">
          <button
            type="button"
            onClick={() => { newConversation(); onViewChange("chat"); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-blue-700 mb-2"
          >
            <Plus className="h-4 w-4" />
            新建对话
          </button>
          <NavItem
            icon={<MessageSquare className="h-4 w-4" />}
            label="对话"
            active={currentView === "chat"}
            onClick={() => onViewChange("chat")}
          />
        </NavGroup>

        {/* 经营管理 */}
        <NavGroup icon={<BarChart3 className="h-4 w-4" />} label="经营管理">
          <NavItem
            icon={<Package className="h-4 w-4" />}
            label="Skill 工作台"
            active={currentView === "skills"}
            onClick={() => onViewChange("skills")}
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
            icon={<BarChart3 className="h-4 w-4" />}
            label="数据看板"
            active={currentView === "dashboard"}
            onClick={() => onViewChange("dashboard")}
          />
          <NavItem
            icon={<Brain className="h-4 w-4" />}
            label="数字孪生"
            active={currentView === "twin"}
            onClick={() => onViewChange("twin")}
          />
        </NavGroup>

        {/* 设置 */}
        <NavGroup icon={<Settings className="h-4 w-4" />} label="设置" defaultOpen={false}>
          <NavItem
            icon={<Users className="h-4 w-4" />}
            label="团队管理"
            active={currentView === "team"}
            onClick={() => onViewChange("team")}
          />
        </NavGroup>

        {/* 对话历史列表 */}
        {currentView === "chat" && conversations.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              历史对话
            </div>
            {conversations.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              const isActive = conv.id === currentConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => { setCurrentConversation(conv.id); onViewChange("chat"); }}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{conv.title || "新对话"}</div>
                    {lastMsg && (
                      <div className="truncate text-[11px] text-gray-400">{formatTime(lastMsg.createdAt)}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
