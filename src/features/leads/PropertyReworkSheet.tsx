import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import reworkArt from "@/assets/image 1333.png";

export type ReworkSectionOption = { value: string; label: string };

type PropertyReworkSheetProps = {
  open: boolean;
  propertyId: string;
  location: string;
  ribpName: string;
  ribpCode: string;
  sections?: ReworkSectionOption[];
  defaultSection?: string;
  pending?: boolean;
  error?: string;
  onCancel: () => void;
  onSend: (remarks: string, section: string) => void;
};

function recipientLabel(name: string, code: string) {
  const person = name.trim();
  const id = code.trim();
  if (person && id) return `${person} (${id})`;
  return person || id;
}

/** Same sheet chrome as lead create. Confirms Re-Work and names the region's RIBP. */
export function PropertyReworkSheet({
  open,
  propertyId,
  location,
  ribpName,
  ribpCode,
  sections = [],
  defaultSection = "",
  pending = false,
  error = "",
  onCancel,
  onSend,
}: PropertyReworkSheetProps) {
  const [remarks, setRemarks] = useState("");
  const [section, setSection] = useState(defaultSection);

  useEffect(() => {
    if (!open) return;
    setRemarks("");
    setSection(defaultSection);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, pending, defaultSection]);

  if (!open) return null;

  const place = location.trim();
  const leadLabel = propertyId.trim() || "this property";
  const recipient = recipientLabel(ribpName, ribpCode);
  const chosen = sections.find((item) => item.value === section);
  const title = chosen ? `${chosen.label} Re-Work` : "Property Re-Work";
  const needsSection = sections.length > 0;
  const canSend = Boolean(remarks.trim()) && !pending && (!needsSection || Boolean(section));

  return createPortal(
    <div
      className="fixed inset-0 z-[2300] flex items-end justify-center bg-[#1f2547]/55 sm:items-center sm:px-6 sm:py-10"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-rework-title"
        className="relative w-full max-w-lg sm:max-w-[400px]"
        style={{ animation: "ims-sheet-up 0.28s ease-out" }}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-[148px] -translate-x-1/2 -translate-y-[48%] sm:w-[164px]">
          <img
            src={reworkArt}
            alt=""
            className="h-auto w-full select-none object-contain drop-shadow-[0_8px_16px_rgba(31,37,71,0.3)]"
            draggable={false}
          />
        </div>

        <div className="rounded-t-[28px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[4.5rem] text-center shadow-[0_-8px_40px_rgba(31,37,71,0.18)] sm:rounded-[28px] sm:pb-6 sm:shadow-[0_18px_50px_rgba(31,37,71,0.22)]">
          <h2 id="property-rework-title" className="text-[20px] font-bold leading-snug tracking-tight text-ims-ink">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-slate-500">
            Property Lead <span className="font-semibold text-ims-ink">{leadLabel}</span>
            {place ? (
              <>
                {" "}
                (<span className="font-semibold text-ims-ink">{place}</span>)
              </>
            ) : null}{" "}
            will be sent for rework
            {recipient ? (
              <>
                {" "}
                to <span className="font-semibold text-ims-ink">{recipient}</span>
              </>
            ) : (
              " to the Regional Infra Business Partner for this region"
            )}
            .
          </p>

          {needsSection ? (
            <label className="mt-5 block rounded-xl border border-[#d5dbe8] px-3 py-2 text-left focus-within:border-ims-primary">
              <span className="text-[13px] text-slate-500">Re-Work Section</span>
              <select
                className="mt-1 block w-full border-0 bg-transparent p-0 text-[14px] leading-5 text-ims-ink outline-none"
                value={section}
                disabled={pending}
                onChange={(event) => setSection(event.target.value)}
              >
                <option value="">Select</option>
                {sections.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="mt-3 block rounded-xl border border-[#d5dbe8] px-3 py-2 text-left focus-within:border-ims-primary">
            <span className="text-[13px] text-slate-500">
              Remarks<span className="text-rose-600">*</span>
            </span>
            <textarea
              className="mt-1 block min-h-[72px] w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-5 text-ims-ink outline-none"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              disabled={pending}
            />
          </label>
          {error ? <p className="mt-2 text-left text-sm text-rose-600">{error}</p> : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="ims-btn-secondary min-h-12" disabled={pending} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="ims-btn-primary min-h-12 disabled:opacity-50"
              disabled={!canSend}
              onClick={() => onSend(remarks.trim(), section)}
            >
              {pending ? "Sending…" : "Send to Re-Work"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
