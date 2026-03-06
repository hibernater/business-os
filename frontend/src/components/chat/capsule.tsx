"use client";

import { LucideIcon } from "lucide-react";

interface CapsuleProps {
  icon: LucideIcon;
  text: string;
  onClick: () => void;
}

export function Capsule({ icon: Icon, text, onClick }: CapsuleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb]"
    >
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </button>
  );
}
