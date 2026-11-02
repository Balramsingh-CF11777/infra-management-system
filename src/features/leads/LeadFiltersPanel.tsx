import { useEffect, useLayoutEffect, useMemo, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ListFilter, X } from "lucide-react";
import type { LeadSummary, LeadWorkflowState } from "@/features/leads/types";

export type LeadFilterCategory = "branch" | "status" | "approved_on" | "submitted_on";

export type LeadDateRange = {
  from: string;
  to: string;
};

export type LeadListFilters = {
  branches: string[];
  statuses: string[];
  approvedOn: LeadDateRange;
  submittedOn: LeadDateRange;
};

export const EMPTY_DATE_RANGE: LeadDateRange = { from: "", to: "" };

export const EMPTY_LEAD_FILTERS: LeadListFilters = {
  branches: [],
  statuses: [],
  approvedOn: { ...EMPTY_DATE_RANGE },
  submittedOn: { ...EMPTY_DATE_RANGE },
};

const CATEGORIES: { id: LeadFilterCategory; label: string }[] = [
  { id: "branch", label: "Branch" },
  { id: "status", label: "Status" },
  { id: "approved_on", label: "Approved On" },
  { id: "submitted_on", label: "Submitted On" },
];

const STATUS_OPTIONS: LeadWorkflowState[] = [
  "Approved",
  "Awaiting Approval",
  "Rejected",
  "Re-Work",
  "Draft",
  "On Hold",
];

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isDateRangeActive(range: LeadDateRange) {
  return Boolean(range.from || range.to);
}

/** Resolve from/to. Only From → through today. Only To → that single day. */
function resolveDateRange(range: LeadDateRange) {
  if (!range.from && !range.to) return null;
  const today = todayKey();
  const from = range.from || range.to;
  const to = range.to || (range.from ? today : range.to);
  return from <= to ? { from, to } : { from: to, to: from };
}

function matchesDateRange(value: string | undefined, range: LeadDateRange) {
  const resolved = resolveDateRange(range);
  if (!resolved) return true;
  const key = dayKey(value);
  if (!key) return false;
  return key >= resolved.from && key <= resolved.to;
}

export function countActiveLeadFilters(filters: LeadListFilters) {
  return (
    filters.branches.length +
    filters.statuses.length +
    (isDateRangeActive(filters.approvedOn) ? 1 : 0) +
    (isDateRangeActive(filters.submittedOn) ? 1 : 0)
  );
}

export function applyLeadListFilters(rows: LeadSummary[], filters: LeadListFilters) {
  return rows.filter((row) => {
    if (filters.branches.length && !filters.branches.includes(row.location_details || "")) return false;
    if (filters.statuses.length && !filters.statuses.includes(String(row.workflow_state || "Draft"))) return false;
    if (!matchesDateRange(row.approved_on, filters.approvedOn)) return false;
    if (!matchesDateRange(row.submitted_on || row.initiated_date || row.creation, filters.submittedOn)) {
      return false;
    }
    return true;
  });
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formatDisplayDate(value: string) {
  if (!value) return "Select date";
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MobileCenterDatePicker({
  open,
  title,
  value,
  min,
  max,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  value: string;
  min?: string;
  max?: string;
  onPick: (next: string) => void;
  onClose: () => void;
}) {
  const initial = parseDate(value) || new Date();
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [draft, setDraft] = useState(value || todayKey());

  useEffect(() => {
    if (!open) return;
    const seed = parseDate(value) || new Date();
    setCursor(new Date(seed.getFullYear(), seed.getMonth(), 1));
    setDraft(value || todayKey());
  }, [open, value]);

  if (!open) return null;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const cells: Array<number | null> = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function isDisabled(day: number) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (min && key < min) return true;
    if (max && key > max) return true;
    return false;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2300] flex items-center justify-center bg-[#1f2547]/50 p-4 lg:hidden"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[22rem] rounded-2xl bg-white p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ims-ink">{title}</h3>
          <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-medium text-ims-primary hover:bg-ims-primary/5"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            Prev
          </button>
          <p className="text-sm font-semibold text-ims-ink">{monthLabel}</p>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-medium text-ims-primary hover:bg-ims-primary/5"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) return <span key={`e-${index}`} />;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const selected = draft === key;
            const disabled = isDisabled(day);
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => setDraft(key)}
                className={`flex h-9 items-center justify-center rounded-full text-[13px] font-medium ${
                  selected
                    ? "bg-ims-primary text-white"
                    : disabled
                      ? "text-slate-300"
                      : "text-ims-ink hover:bg-slate-100"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" className="ims-btn-secondary min-h-10 flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ims-btn-primary min-h-10 flex-1"
            onClick={() => {
              onPick(draft);
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DateRangeFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LeadDateRange;
  onChange: (next: LeadDateRange) => void;
}) {
  const [mobilePicker, setMobilePicker] = useState<"from" | "to" | null>(null);
  const hint =
    value.from && !value.to
      ? `To date defaults to today (${startOfDay(new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`
      : !value.from && value.to
        ? "From date defaults to the same day"
        : "Pick a from and to date";

  return (
    <div className="space-y-3 px-1 py-2">
      <p className="text-[12px] font-medium text-ims-ink">{label}</p>

      {/* Mobile: open centered calendar modal */}
      <div className="space-y-3 lg:hidden">
        <div>
          <p className="text-[11px] text-slate-500">From date</p>
          <button
            type="button"
            className="ims-field mt-1 flex w-full items-center text-left"
            onClick={() => setMobilePicker("from")}
          >
            <span className={value.from ? "text-ims-ink" : "text-slate-400"}>{formatDisplayDate(value.from)}</span>
          </button>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">To date</p>
          <button
            type="button"
            className="ims-field mt-1 flex w-full items-center text-left"
            onClick={() => setMobilePicker("to")}
          >
            <span className={value.to ? "text-ims-ink" : "text-slate-400"}>{formatDisplayDate(value.to)}</span>
          </button>
        </div>
      </div>

      {/* Desktop: native date inputs */}
      <div className="hidden space-y-3 lg:block">
        <label className="block text-[11px] text-slate-500">
          From date
          <input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className="ims-field mt-1"
          />
        </label>
        <label className="block text-[11px] text-slate-500">
          To date
          <input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className="ims-field mt-1"
          />
        </label>
      </div>

      <p className="text-[11px] leading-snug text-slate-400">{hint}</p>

      <MobileCenterDatePicker
        open={mobilePicker === "from"}
        title="From date"
        value={value.from}
        max={value.to || undefined}
        onPick={(from) => onChange({ ...value, from })}
        onClose={() => setMobilePicker(null)}
      />
      <MobileCenterDatePicker
        open={mobilePicker === "to"}
        title="To date"
        value={value.to}
        min={value.from || undefined}
        onPick={(to) => onChange({ ...value, to })}
        onClose={() => setMobilePicker(null)}
      />
    </div>
  );
}

type LeadFiltersPopupProps = {
  open: boolean;
  leads: LeadSummary[];
  value: LeadListFilters;
  onApply: (next: LeadListFilters) => void;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
};

export function LeadFiltersPopup({
  open,
  leads,
  value,
  onApply,
  onClose,
  anchorRef,
}: LeadFiltersPopupProps) {
  const [category, setCategory] = useState<LeadFilterCategory>("branch");
  const [draft, setDraft] = useState<LeadListFilters>(value);
  const [desktopPos, setDesktopPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePos() {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!desktop || !anchorRef?.current) {
        setDesktopPos(null);
        return;
      }
      const rect = anchorRef.current.getBoundingClientRect();
      setDesktopPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const branches = useMemo(
    () => uniqueSorted(leads.map((row) => row.location_details || "")),
    [leads],
  );

  const selectedList = category === "branch" ? draft.branches : category === "status" ? draft.statuses : [];

  function toggle(option: string) {
    setDraft((prev) => {
      const key = category === "branch" ? "branches" : "statuses";
      const list = prev[key];
      const next = list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
      return { ...prev, [key]: next };
    });
  }

  if (!open || typeof document === "undefined") return null;

  const listOptions =
    category === "branch"
      ? branches.map((value) => ({ value, label: value }))
      : category === "status"
        ? STATUS_OPTIONS.map((value) => ({ value, label: value }))
        : [];

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Dismiss filters"
        className="fixed inset-0 z-[2200] bg-[#1f2547]/45 lg:bg-black/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-filters-title"
        className="fixed inset-x-0 bottom-0 z-[2201] flex max-h-[min(85dvh,40rem)] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-2xl lg:inset-x-auto lg:bottom-auto lg:max-h-[min(32rem,70vh)] lg:w-[min(24rem,calc(100vw-2rem))] lg:rounded-2xl lg:border lg:border-ims-line lg:shadow-[0_16px_40px_rgba(31,37,71,0.18)]"
        style={
          desktopPos
            ? { top: desktopPos.top, right: desktopPos.right, left: "auto", bottom: "auto" }
            : undefined
        }
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4 lg:px-5">
          <h2 id="lead-filters-title" className="text-[17px] font-semibold text-ims-ink">
            Filters
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ims-ink hover:bg-slate-100"
            aria-label="Close filters"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 lg:px-5">
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-ims-line bg-white">
            <aside className="w-[38%] shrink-0 overflow-y-auto bg-[#F4F6FA]" aria-label="Filter categories">
              {CATEGORIES.map((item) => {
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`relative flex w-full items-center px-3 py-3.5 text-left text-[13px] font-medium transition-colors ${
                      active ? "bg-[#EDE9F8] text-[#3F2B96]" : "text-slate-600 hover:bg-white/70"
                    }`}
                  >
                    {active ? (
                      <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#3F2B96]" aria-hidden />
                    ) : null}
                    {item.label}
                  </button>
                );
              })}
            </aside>
            <div className="min-w-0 flex-1 overflow-y-auto px-3 py-2">
              {category === "approved_on" ? (
                <DateRangeFields
                  label="Approved On"
                  value={draft.approvedOn}
                  onChange={(approvedOn) => setDraft((prev) => ({ ...prev, approvedOn }))}
                />
              ) : category === "submitted_on" ? (
                <DateRangeFields
                  label="Submitted On"
                  value={draft.submittedOn}
                  onChange={(submittedOn) => setDraft((prev) => ({ ...prev, submittedOn }))}
                />
              ) : listOptions.length === 0 ? (
                <p className="px-1 py-4 text-sm text-slate-500">No options available.</p>
              ) : (
                <ul className="space-y-1">
                  {listOptions.map((option) => {
                    const checked = selectedList.includes(option.value);
                    return (
                      <li key={option.value}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(option.value)}
                            className="h-4 w-4 rounded border-slate-300 text-ims-primary focus:ring-ims-primary"
                          />
                          <span className="truncate text-[13px] text-ims-ink">{option.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-ims-line bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:border-t-0 lg:px-5 lg:pb-5">
          <button
            type="button"
            className="ims-btn-secondary min-h-11 flex-1"
            onClick={() => setDraft(EMPTY_LEAD_FILTERS)}
          >
            Clear All Filters
          </button>
          <button
            type="button"
            className="ims-btn-primary min-h-11 flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

export function LeadFilterButton({
  activeCount,
  onClick,
  expanded,
}: {
  activeCount: number;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Open filters"
      aria-expanded={expanded}
      onClick={onClick}
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ims-line bg-white text-ims-ink shadow-[0_2px_8px_rgba(31,37,71,0.04)] hover:bg-slate-50"
    >
      <ListFilter className="h-5 w-5" />
      {activeCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ims-primary px-1 text-[10px] font-semibold text-white">
          {activeCount > 9 ? "9+" : activeCount}
        </span>
      ) : null}
    </button>
  );
}
