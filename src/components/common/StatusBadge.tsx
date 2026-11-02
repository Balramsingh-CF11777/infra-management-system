import { stateTone } from "@/lib/rules";

const tones = {
  current: "border-[#fdd3a1] bg-[#fff5e8] text-[#e07b00]",
  done: "border-[#b8e6c4] bg-[#effbf2] text-[#2f9e55]",
  danger: "border-[#f6b9b9] bg-[#fff0f0] text-[#e5484d]",
  neutral: "border-[#d9dde7] bg-[#f4f5f8] text-slate-600",
  open: "border-[#f0d58c] bg-[#fff8e1] text-[#a86b00]",
  rework: "border-[#d9c6fb] bg-[#f5efff] text-[#7c4dd6]",
};

export function StatusBadge({ label, tone }: { label: string; tone?: keyof typeof tones }) {
  const resolved = tone ?? (label ? stateTone(label) : "neutral");
  return (
    <span className={`inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tones[resolved]}`}>
      <span className="truncate">{label || "—"}</span>
    </span>
  );
}
