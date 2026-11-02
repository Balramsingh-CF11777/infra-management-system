import type { ReactNode } from "react";
import noData from "@/assets/design/awaiting.webp";

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <img src={noData} alt="" className="mb-3 h-24 w-auto" />
      <p className="text-base font-semibold text-ims-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      {children}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-[#e4e7f6] ${className}`} />;
}
