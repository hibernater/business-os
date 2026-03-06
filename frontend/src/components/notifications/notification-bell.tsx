"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  getToken,
  type NotificationInfo,
} from "@/lib/api";

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  skill_done: { icon: CheckCircle, color: "text-green-500 bg-green-50" },
  warning: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50" },
  info: { icon: Info, color: "text-blue-500 bg-blue-50" },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await fetchNotifications(token);
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleRead = async (id: string) => {
    const token = getToken();
    if (!token) return;
    await markNotificationRead(token, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnread((prev) => Math.max(0, prev - 1));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">通知</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">暂无通知</div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleRead(n.id)}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{n.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString("zh-CN") : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
