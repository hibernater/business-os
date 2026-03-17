"use client";

import { useState } from "react";
import { Menu, BookOpen, HelpCircle, Github } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { SkillPanel } from "@/components/skills/skill-panel";
import { AssetPanel } from "@/components/assets/asset-panel";
import { TeamPanel } from "@/components/team/team-panel";
import { DigitalTwinPanel } from "@/components/dashboard/digital-twin-panel";
import { TaskPanel } from "@/components/tasks/task-panel";
import { HomePanel } from "@/components/home/home-panel";
import { WorkflowPanel } from "@/components/workflows/workflow-panel";

export type ViewMode = "home" | "chat" | "skills" | "workflows" | "tasks" | "assets" | "team" | "twin";

const VIEW_TITLES: Record<ViewMode, string> = {
  home: "首页",
  chat: "对话",
  skills: "Skill 库",
  workflows: "工作流",
  tasks: "任务管理",
  assets: "企业资产",
  team: "团队管理",
  twin: "数字孪生",
};

export function ChatLayout() {
  const [view, setView] = useState<ViewMode>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleViewChange = (v: ViewMode) => {
    setView(v);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50/80">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar currentView={view} onViewChange={handleViewChange} />
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* 顶部栏 */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-[16px] font-semibold text-gray-900">{VIEW_TITLES[view]}</h1>
          </div>
          <div className="flex items-center gap-1">
            <a href="https://github.com/hibernater/business-os" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">文档</span>
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">帮助</span>
            </button>
          </div>
        </header>

        {/* 内容 */}
        <div className="flex flex-1 min-h-0">
          {view === "home" && (
            <HomePanel onNavigate={(v) => setView(v as ViewMode)} />
          )}
          {view === "chat" && (
            <div className="flex flex-1 flex-col min-h-0">
              <MessageList />
              <MessageInput />
            </div>
          )}
          {view === "skills" && (
            <SkillPanel onSwitchToTasks={() => setView("tasks")} />
          )}
          {view === "workflows" && <WorkflowPanel />}
          {view === "tasks" && <TaskPanel />}
          {view === "assets" && <AssetPanel />}
          {view === "twin" && <DigitalTwinPanel />}
          {view === "team" && <TeamPanel />}
        </div>
      </div>
    </div>
  );
}
