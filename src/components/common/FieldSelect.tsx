import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

export type FieldSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type FieldSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FieldSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  emptyMessage?: string;
  className?: string;
};

/** Matches AppLayout desktop breakpoint — native select works here. */
const DESKTOP_MQ = "(min-width: 1024px)";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return desktop;
}

function optionText(opt: FieldSelectOption) {
  return opt.hint ? `${opt.label} — ${opt.hint}` : opt.label;
}

/**
 * Desktop (lg+): native &lt;select&gt; (earlier PC behaviour).
 * Mobile: sheet picker portaled above Leaflet (maps use z-index ~400–1000).
 */
export function FieldSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  required = false,
  id,
  emptyMessage = "No options available.",
  className = "",
}: FieldSelectProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const listId = `${fieldId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open || isDesktop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, isDesktop]);

  useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  if (isDesktop) {
    return (
      <select
        id={fieldId}
        className={`ims-field ${className}`.trim()}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {optionText(opt)}
          </option>
        ))}
      </select>
    );
  }

  const sheet =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[2200] flex items-end justify-center bg-[#1f2547]/45"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${fieldId}-picker-title`}
              className="relative z-[2201] flex max-h-[min(70dvh,28rem)] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-ims-line px-4 py-3">
                <h2 id={`${fieldId}-picker-title`} className="text-sm font-semibold text-ims-ink">
                  {placeholder}
                </h2>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-ims-ink hover:bg-slate-100"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <ul id={listId} role="listbox" aria-labelledby={fieldId} className="flex-1 overflow-y-auto overscroll-contain p-2">
                {options.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</li>
                ) : (
                  options.map((opt) => {
                    const active = opt.value === value;
                    return (
                      <li key={opt.value} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                            active ? "bg-ims-primary/10 text-ims-primary" : "text-ims-ink hover:bg-slate-50"
                          }`}
                          onClick={() => choose(opt.value)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug break-words">{opt.label}</span>
                            {opt.hint ? <span className="mt-0.5 block break-all text-xs text-slate-500">{opt.hint}</span> : null}
                          </span>
                          {active ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <input type="hidden" value={value} required={required} readOnly tabIndex={-1} aria-hidden />
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`ims-field flex w-full items-center gap-2 text-left ${!selected ? "text-slate-400" : ""}`}
        onClick={() => setOpen(true)}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {sheet}
    </div>
  );
}
