import { BackButton } from "@/components/common/BackButton";
import {
  PROPERTY_VERIFICATION_MODULES,
  type PropertyVerificationModuleId,
} from "@/features/leads/propertyVerification";

const REQUIREMENTS: Record<PropertyVerificationModuleId, string[]> = {
  property: ["Location & address", "Main entrance", "Map pin", "Built-up / carpet", "Monthly rent or rent/sqft", "Lease period"],
  owner: ["Landlord name", "Phone / email", "PAN / GST", "Legal status / POA", "Bank / rent payable share"],
  facility: ["Parking type & counts", "Lift availability", "Power backup", "Other amenities / utilities"],
  documents: ["Title / tax / EB / plan docs", "PAN / GST / MSME certificates", "KYC attachments per owner"],
  loi: ["Draft LOI", "Signed LOI (if any)", "Landlord consent status / OTP verify"],
};

export function LeadVerificationModuleStubPage({ moduleId }: { moduleId: PropertyVerificationModuleId }) {
  const module = PROPERTY_VERIFICATION_MODULES.find((row) => row.id === moduleId);
  const requirements = REQUIREMENTS[moduleId];

  return (
    <section className="mx-auto w-full max-w-lg space-y-4 lg:max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold text-ims-ink">{module?.label || "Verification"}</h1>
          <p className="text-xs text-slate-500">{module?.hint}</p>
        </div>
      </div>

      <div className="ims-card space-y-3 p-4 md:p-5">
        <p className="text-sm text-slate-600">
          This step stays <span className="font-semibold text-[#8B4A1F]">Pending</span> until the details below are
          captured on the Lead. Edit UI for this pack will land next; required fields:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ims-ink">
          {requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
