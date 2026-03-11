"use client";

import { useState } from "react";
import { LogIn, Zap } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(username, password);
    } catch {
      // Error is set in store
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 px-4">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-10 shadow-xl shadow-gray-200/40">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-[24px] font-bold text-gray-900">
              商家OS
            </h1>
            <p className="mt-2 text-[14px] text-gray-500">
              AI 驱动的中小企业经营工作台
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-[13px] font-medium text-gray-600"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="请输入用户名"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[13px] font-medium text-gray-600"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-4 py-3 text-[15px] font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4.5 w-4.5" />
              {isLoading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[12px] text-gray-400">
          Works for you, grows with you
        </p>
      </div>
    </div>
  );
}
