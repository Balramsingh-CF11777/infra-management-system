import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { FixedFlowChrome } from "@/features/leads/FixedFlowChrome";
import { isSiteVerificationComplete, shortlistingComplete, shortlistingFromLead } from "@/features/leads/siteVerification";
import { VerificationFlowTopBar } from "@/features/leads/VerificationFlowTopBar";

const STEPS = [{ id: "onsite", label: "Onsite\nVetting", path: "site-verification" }] as const;

export type SiteFlowStepId = (typeof STEPS)[number]["id"];

/** Mobile Site Verification progress — fixed at top while the form scrolls. */
export function SiteVerificationStepper({
  name,
  lead,
  current,
  onsiteComplete,
  showOnDesktop = false,
}: {
  name: string;
  lead: Record<string, unknown>;
  current: SiteFlowStepId;
  onsiteComplete?: boolean;
  showOnDesktop?: boolean;
}) {
  const done: Record<SiteFlowStepId, boolean> = {
    onsite:
      onsiteComplete ??
      (shortlistingComplete(shortlistingFromLead(lead)) && isSiteVerificationComplete(lead)),
  };

  return (
    <FixedFlowChrome showOnDesktop={showOnDesktop}>
      <div className="bg-[linear-gradient(110deg,#283769,#4b2448)] px-3 pt-2 text-white shadow-[0_-120px_0_120px_#283769] sm:px-5">
        <VerificationFlowTopBar title="Site Verification" />
        <ol className="mt-3 grid grid-cols-1 gap-3" aria-label="Site verification progress">
          {STEPS.map((item, index) => {
            const here = item.id === current;
            const complete = done[item.id] && !here;
            return (
              <li key={item.id}>
                <Link
                  to={`/chola360/leads/${encodeURIComponent(name)}/${item.path}`}
                  aria-current={here ? "step" : undefined}
                  className="flex flex-col items-center gap-2 text-center no-underline"
                >
                  <span className="flex min-h-8 items-center whitespace-pre-line text-[14px] font-bold leading-4 text-white">
                    {item.label}
                  </span>
                  <span
                    className={[
                      "relative z-10 flex h-[34px] w-[34px] translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-[16px] font-semibold leading-none text-white",
                      complete ? "bg-[#20a52a]" : here ? "bg-[#4942a4]" : "bg-[#d6d6d6]",
                    ].join(" ")}
                  >
                    {complete ? <Check className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="h-6 bg-ims-surface" aria-hidden />
    </FixedFlowChrome>
  );
}
