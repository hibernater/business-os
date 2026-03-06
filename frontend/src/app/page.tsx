"use client";

import { useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { ChatLayout } from "@/components/chat/chat-layout";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const { isAuthenticated, isInitialized, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <ChatLayout />;
}
