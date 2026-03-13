"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  Loader2,
  Crown,
  User,
} from "lucide-react";
import {
  fetchTeamMembers,
  inviteMember,
  fetchAuditLog,
  getToken,
  type TeamMember,
  type AuditLogEntry,
} from "@/lib/api";

type SubTab = "members" | "audit";

const roleLabels: Record<string, { label: string; color: string; icon: typeof User }> = {
  owner: { label: "管理员", color: "bg-amber-100 text-amber-700", icon: Crown },
  admin: { label: "管理员", color: "bg-blue-100 text-blue-700", icon: Shield },
  member: { label: "成员", color: "bg-gray-100 text-gray-700", icon: User },
};

export function TeamPanel() {
  const [subTab, setSubTab] = useState<SubTab>("members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([fetchTeamMembers(token), fetchAuditLog(token)])
      .then(([m, l]) => { setMembers(m); setLogs(l); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">团队管理</h1>
            <p className="text-sm text-gray-500">管理团队成员和查看操作日志</p>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setSubTab("members")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
              subTab === "members" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            成员 ({members.length})
          </button>
          <button
            onClick={() => setSubTab("audit")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
              subTab === "audit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            操作日志
          </button>
        </div>

        {subTab === "members" ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-2 text-sm text-white hover:bg-violet-600 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                邀请成员
              </button>
            </div>

            {showInvite && (
              <InviteDialog
                onDone={(m) => { if (m) setMembers((prev) => [...prev, m]); setShowInvite(false); }}
                onCancel={() => setShowInvite(false)}
              />
            )}

            {members.map((m) => {
              const rcfg = roleLabels[m.role] ?? roleLabels.member;
              const Icon = rcfg.icon;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{m.displayName}</p>
                    <p className="text-xs text-gray-500">@{m.username}</p>
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${rcfg.color}`}>
                    <Icon className="h-3 w-3" />
                    {rcfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">暂无操作日志</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{l.userName}</span> {l.detail || l.action}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {l.createdAt ? new Date(l.createdAt).toLocaleString("zh-CN") : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteDialog({ onDone, onCancel }: { onDone: (m?: TeamMember) => void; onCancel: () => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("member");
  const [password, setPassword] = useState("123456");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!username.trim()) return;
    const token = getToken();
    if (!token) return;
    setSubmitting(true);
    setError("");
    const result = await inviteMember(token, username, displayName || username, role, password);
    if (result.status === "ok") {
      onDone({ id: result.userId ?? "", username, displayName: displayName || username, role, status: "active" });
    } else {
      setError(result.message ?? "邀请失败");
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">邀请新成员</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">用户名</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">显示名称</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={username || "选填"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">角色</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none">
            <option value="member">成员</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">初始密码</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting || !username.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-2 text-sm text-white hover:bg-violet-600 disabled:opacity-50">
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          邀请
        </button>
      </div>
    </div>
  );
}
