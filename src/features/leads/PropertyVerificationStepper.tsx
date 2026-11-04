import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { FixedFlowChrome } from "@/features/leads/FixedFlowChrome";
import {
  PROPERTY_VERIFICATION_MODULES,
  propertyVerificationStatus,
  type PropertyVerificationModuleId,
} from "@/features/leads/propertyVerification";
import { VerificationFlowTopBar } from "@/features/leads/VerificationFlowTopBar";

const STEP_LABELS: Record<PropertyVerificationModuleId, string> = {
  property: "Property\nDetails",
  owner: "Owner\nDetails",
  facility: "Facility\nDetails",
  documents: "Documents",
  loi: "LOI\nConsent",
};

/** Mobile Property Verification progress — fixed at top while the form scrolls. */
export function PropertyVerificationStepper({
  name,
  lead,
  current,
  showOnDesktop = false,
  recordBase,
}: {
  name: string;
  lead: Record<string, unknown>;
  current: PropertyVerificationModuleId;
  showOnDesktop?: boolean;
  recordBase?: string;
}) {
  return (
    <FixedFlowChrome showOnDesktop={showOnDesktop}>
      <div className="bg-[linear-gradient(110deg,#283769,#4b2448)] px-3 pt-2 text-white shadow-[0_-120px_0_120px_#283769] sm:px-5">
        <VerificationFlowTopBar title="Property Verification" />
        <ol className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-3" aria-label="Property verification progress">
          {PROPERTY_VERIFICATION_MODULES.map((item, index) => {
            const here = item.id === current;
            const complete = propertyVerificationStatus(item.id, lead) === "completed" && !here;
            return (
              <li key={item.id}>
                <Link
                  to={`${recordBase || `/chola360/leads/${encodeURIComponent(name)}`}/${item.path}`}
                  aria-current={here ? "step" : undefined}
                  className="flex flex-col items-center gap-2 text-center no-underline"
                >
                  <span className="flex min-h-8 items-center whitespace-pre-line text-[12px] font-bold leading-4 text-white sm:text-[14px]">
                    {STEP_LABELS[item.id]}
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
