import { Check } from "lucide-react";
import type { TimelineEntry } from "@/types/api";
import { formatWhen } from "@/lib/format";

export function WorkflowTimeline({ current, entries }: { current: string; entries: TimelineEntry[] }) {
  const history = entries.filter((entry) => entry.kind === "transition");
  return (
    <ol className="space-y-0" aria-label="Workflow timeline">
      {history.length === 0 && (
        <li className="mb-4 rounded-xl bg-ims-bg p-4 text-sm text-slate-600">
          No earlier transitions are recorded. Current stage: <strong>{current}</strong>
        </li>
      )}
      {history.map((entry, index) => {
        const returned = `${entry.from_label} ${entry.to_label}`.toLowerCase().includes("send back")
          || `${entry.to_label}`.toLowerCase().includes("return");
        return (
          <li key={`${entry.timestamp}-${index}`} className="relative pb-5 pl-9">
            <span className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px bg-[#d7dcec]" aria-hidden />
            <span
              className={`absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white ${returned ? "bg-[#7c4dd6]" : "bg-[#54961b]"}`}
              aria-hidden
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <p className="text-sm font-semibold text-ims-ink">
              {entry.from_label || "Start"} → {entry.to_label}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {entry.actor || "System"} · {formatWhen(entry.timestamp)}
            </p>
            {returned && (
              <span className="mt-1.5 inline-block rounded-md bg-[#efe8ff] px-2 py-0.5 text-[11px] font-medium text-[#7c4dd6]">Re-Work</span>
            )}
          </li>
        );
      })}
      <li className="relative pl-9">
        <span className="absolute left-0 top-0.5 h-6 w-6 rounded-full border-[3px] border-[#513ea7] bg-white" aria-hidden />
        <p className="text-sm font-semibold text-ims-ink">{current}</p>
        <p className="mt-0.5 text-xs text-slate-500">In progress</p>
      </li>
    </ol>
  );
}
