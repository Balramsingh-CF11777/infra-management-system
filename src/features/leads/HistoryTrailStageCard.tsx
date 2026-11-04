import type { ReactNode } from "react";
import type { TrailSubStep } from "@/features/leads/historyTrailSteps";

type Props = {
  title: string;
  subtitle: string;
  open: boolean;
  steps: TrailSubStep[];
  onToggle: () => void;
  /** Optional content below the timeline (e.g. Site approval person). */
  footer?: ReactNode;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3">
      <path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Legal Clearance–style accordion card with vertical sub-step timeline. */
export function HistoryTrailStageCard({ title, subtitle, open, steps, onToggle, footer }: Props) {
  const completed = steps.filter((step) => step.status === "completed").length;
  const total = Math.max(steps.length, 1);
  const progressPct = Math.round((completed / total) * 100);

  return (
    <details
      className="overflow-hidden rounded-lg border border-[#d9dee8] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
      open={open}
    >
      <summary
        className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-2.5 [&::-webkit-details-marker]:hidden"
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-5 text-[#454b80]">{title}</span>
          <span className="mt-0.5 block text-[11px] font-normal leading-[17px] text-[#414141]">{subtitle}</span>
        </span>
        <span
          aria-hidden
          className={[
            "mr-1 h-2.5 w-2.5 shrink-0 border-b border-r border-[#454b80]",
            open ? "translate-y-[3px] rotate-[225deg]" : "rotate-45",
          ].join(" ")}
        />
      </summary>

      {open ? (
        <div className="border-t border-[#e9ebf0] px-4 py-4">
          <ol className="relative m-0 flex list-none flex-col justify-between p-0" style={{ height: Math.max(48, steps.length * 36) }} aria-label={`${title} progress`}>
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-[8.5px] top-2 w-px"
              style={{
                background: `linear-gradient(to bottom, #a9d88c 0%, #a9d88c ${progressPct}%, #e1e5eb ${progressPct}%, #e1e5eb 100%)`,
              }}
            />
            {steps.map((step) => (
              <li key={step.id} className="relative z-[1] flex items-center gap-3">
                <span
                  className={[
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                    step.status === "completed"
                      ? "bg-[#539d1c] text-white"
                      : step.status === "current"
                        ? "border-4 border-[#5940b6] bg-white"
                        : "border-2 border-[#e1e5eb] bg-white",
                  ].join(" ")}
                  aria-current={step.status === "current" ? "step" : undefined}
                >
                  {step.status === "completed" ? <CheckIcon /> : null}
                  <span className="sr-only">
                    {step.label}
                    {step.status === "completed" ? " completed" : step.status === "current" ? " in progress" : " pending"}
                  </span>
                </span>
                <span
                  className={[
                    "min-w-0 truncate text-[11px] leading-4",
                    step.status === "current" ? "font-semibold text-[#454b80]" : "font-medium text-slate-600",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
          {footer ? <div className="mt-3 border-t border-[#e9ebf0] pt-3">{footer}</div> : null}
        </div>
      ) : null}
    </details>
  );
}
