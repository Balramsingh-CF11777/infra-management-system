import awaitingApprovalArt from "@/assets/design/image 1314.png";

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

export function sectionApproverOf(lead: Record<string, unknown> | null | undefined) {
  const email =
    text(lead?.section_approver_email) ||
    text(lead?.nbd_rim_email) ||
    text(lead?.rb_manager_details);
  const name =
    text(lead?.section_approver_name) ||
    text(lead?.nbd_rim_name) ||
    email ||
    "RIM";
  return { name, email };
}

/** Centered awaiting state for any History Trail / property stage after RIBP Submit. */
export function SectionAwaitingApproval({
  lead,
  sectionLabel,
}: {
  lead: Record<string, unknown>;
  /** Optional stage label for accessibility; copy stays product-wide. */
  sectionLabel?: string;
}) {
  const approver = sectionApproverOf(lead);
  const byLabel = approver.name || "RIM";

  return (
    <div
      className="flex flex-col items-center px-4 py-8 text-center sm:px-8 sm:py-12 lg:py-16"
      role="status"
      aria-label={sectionLabel ? `${sectionLabel} awaiting approval` : "Awaiting approval"}
    >
      <img
        src={awaitingApprovalArt}
        alt=""
        className="h-auto w-[200px] max-w-[70vw] select-none object-contain drop-shadow-[0_12px_28px_rgba(31,37,71,0.14)] sm:w-[240px] lg:w-[280px]"
        draggable={false}
      />
      <h2 className="mt-6 text-[22px] font-bold tracking-tight text-ims-ink sm:text-[26px]">Awaiting Approval</h2>
      <p className="mx-auto mt-2 max-w-[22rem] text-[14px] leading-relaxed text-slate-500 sm:max-w-md sm:text-[15px]">
        Your Property Lead has been submitted and is pending review by{" "}
        <span className="font-semibold text-ims-ink">{byLabel}</span>
        {approver.email ? (
          <>
            .
            <span className="mt-2 block break-all text-[13px] font-medium text-ims-primary sm:text-[14px]">
              {approver.email}
            </span>
          </>
        ) : (
          "."
        )}
      </p>
    </div>
  );
}
