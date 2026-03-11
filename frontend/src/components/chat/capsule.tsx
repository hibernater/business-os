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
      className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[15px] text-gray-700 shadow-sm transition-all hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb] hover:shadow-md"
    >
      <Icon className="h-[18px] w-[18px]" />
      <span>{text}</span>
    </button>
  );
}
