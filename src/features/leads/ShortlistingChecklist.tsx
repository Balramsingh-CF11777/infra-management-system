import { Check, X } from "lucide-react";
import { SHORTLISTING_CHECKS } from "@/features/leads/siteVerification";

export function ShortlistingChecklist({
  title = "Onsite Vetting",
  items = SHORTLISTING_CHECKS,
  value,
  onToggle,
  disabled = false,
}: {
  title?: string;
  items?: ReadonlyArray<{ key: string; title: string; detail: string }>;
  value: Record<string, boolean>;
  onToggle: (key: string) => void;
  disabled?: boolean;
}) {
  const done = items.filter((item) => value[item.key]).length;

  function setAll(checked: boolean) {
    if (disabled) return;
    for (const item of items) {
      if (Boolean(value[item.key]) !== checked) onToggle(item.key);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-ims-ink">{title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Tick all"
            title="Tick all"
            disabled={disabled}
            onClick={() => setAll(true)}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-white"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Untick all"
            title="Untick all"
            disabled={disabled}
            onClick={() => setAll(false)}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400"
          >
            <X className="h-3 w-3" />
          </button>
          <span className="text-[12px] font-medium text-slate-500">
            {done} of {items.length}
          </span>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = Boolean(value[item.key]);
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={checked}
                disabled={disabled}
                onClick={() => onToggle(item.key)}
                className={[
                  "flex h-full w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  checked ? "border-emerald-200 bg-emerald-50/70" : "border-ims-line bg-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent",
                  ].join(" ")}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-snug text-ims-ink">{item.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{item.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
