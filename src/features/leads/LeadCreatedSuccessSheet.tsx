import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LEAD_CREATED_SUCCESS_ART } from "@/assets/design/image1316Data";

export function leadPlaceLabel(location?: string) {
  const label = (location || "").trim();
  if (!label) return "Property Lead";
  return label.toLowerCase().includes("branch") ? label : `${label} Branch`;
}

type LeadCreatedSuccessSheetProps = {
  open: boolean;
  locationLabel: string;
  propertyId: string;
  onDone: () => void;
  /** Same sheet as lead creation. Approval only changes the heading and sentence. */
  variant?: "created" | "approved";
  /** Optional copy for one screen. Other callers keep the default heading and sentence. */
  titleText?: string;
  message?: string;
  actionLabel?: string;
};

/**
 * Mobile: full-bleed bottom sheet.
 * Browser (sm+): centered card with all-around rounded corners.
 * Paper-plane art overlaps the top edge in both layouts.
 */
export function LeadCreatedSuccessSheet({
  open,
  locationLabel,
  propertyId,
  onDone,
  variant = "created",
  titleText,
  message,
  actionLabel,
}: LeadCreatedSuccessSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDone]);

  if (!open) return null;

  const subject = [locationLabel, propertyId].filter(Boolean).join(" - ") || propertyId || "this requirement";
  const approved = variant === "approved";
  const title = titleText || (approved ? "Lead Approved Successfully" : "Lead Created Successfully");
  const titleId = approved ? "lead-approved-title" : "lead-created-title";

  return createPortal(
    <div
      className="fixed inset-0 z-[2300] flex items-end justify-center bg-[#1f2547]/55 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:items-center sm:px-6 sm:py-10 sm:pb-10"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDone();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg sm:max-w-[360px]"
        style={{ animation: "ims-sheet-up 0.28s ease-out" }}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-[168px] -translate-x-1/2 -translate-y-[48%] sm:w-[188px]">
          <img
            src={LEAD_CREATED_SUCCESS_ART}
            alt=""
            className="h-auto w-full select-none object-contain drop-shadow-[0_8px_16px_rgba(31,37,71,0.3)]"
            draggable={false}
          />
        </div>

        <div className="rounded-t-[28px] bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[4.25rem] text-center shadow-[0_-8px_40px_rgba(31,37,71,0.18)] sm:rounded-[28px] sm:pb-6 sm:shadow-[0_18px_50px_rgba(31,37,71,0.22)]">
          <h2 id={titleId} className="text-[20px] font-bold leading-snug tracking-tight text-ims-ink">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-[22rem] px-1 text-sm leading-relaxed text-slate-500 sm:px-0">
            {message || (
              <>
                The Property Lead is {approved ? "approved" : "created"} against{" "}
                <span className="font-semibold text-ims-ink">{subject}</span>
              </>
            )}
          </p>

          <button type="button" className="ims-btn-primary mt-8 min-h-12 w-full text-base font-semibold" onClick={onDone}>
            {actionLabel || "Done"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
