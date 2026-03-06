"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { SkillPanel } from "@/components/skills/skill-panel";
import { AssetPanel } from "@/components/assets/asset-panel";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { TeamPanel } from "@/components/team/team-panel";
import { DigitalTwinPanel } from "@/components/dashboard/digital-twin-panel";

export type ViewMode = "chat" | "skills" | "assets" | "dashboard" | "team" | "twin";

export function ChatLayout() {
  const [view, setView] = useState<ViewMode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleViewChange = (v: ViewMode) => {
    setView(v);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: 桌面端常驻，移动端抽屉 */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar currentView={view} onViewChange={handleViewChange} />
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* 移动端顶栏 */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-900">
            {view === "chat" ? "对话" : view === "skills" ? "Skill" : view === "assets" ? "资产" : view === "dashboard" ? "看板" : view === "twin" ? "数字孪生" : "团队"}
          </span>
        </div>

        {view === "chat" && (
          <>
            <MessageList />
            <MessageInput />
          </>
        )}
        {view === "skills" && (
          <SkillPanel onSwitchToChat={() => setView("chat")} />
        )}
        {view === "assets" && <AssetPanel />}
        {view === "dashboard" && <DashboardPanel />}
        {view === "twin" && <DigitalTwinPanel />}
        {view === "team" && <TeamPanel />}
      </div>
    </div>
  );
}
