import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileBadge2,
  PenLine,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { getProspect } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import {
  PROPERTY_VERIFICATION_MODULES,
  propertyVerificationStatus,
  type PropertyVerificationModuleId,
} from "@/features/leads/propertyVerification";
import { shortlistingComplete, shortlistingFrom } from "@/features/leads/siteVerification";
import { ApiError } from "@/types/api";

function text(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw || "—";
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[12px] font-semibold text-ims-ink">{value}</dd>
    </div>
  );
}

const ICONS: Record<PropertyVerificationModuleId, LucideIcon> = {
  property: Building2,
  owner: UserRound,
  facility: Star,
  documents: FileBadge2,
  loi: PenLine,
};

export function ProspectPropertyVerificationPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);

  const prospectQuery = useQuery({
    queryKey: queryKeys.leadProspect(name),
    queryFn: () => getProspect(name),
    enabled: Boolean(name),
  });

  if (prospectQuery.isLoading) return <SkeletonBlock className="h-64" />;
  if (prospectQuery.isError || !prospectQuery.data) {
    return (
      <EmptyState
        title="Lead Prospect unavailable"
        body={
          prospectQuery.error instanceof ApiError
            ? prospectQuery.error.message
            : "Property verification needs a valid Lead Prospect."
        }
      />
    );
  }

  const row = prospectQuery.data;
  const alreadyConverted = Boolean(row.converted_lead) || row.status === "Converted";
  const checklistDone = shortlistingComplete(shortlistingFrom(row.shortlisting_checklist));
  const propertyId = String(row.property_id || row.name || name);
  const completed = PROPERTY_VERIFICATION_MODULES.filter(
    (module) => propertyVerificationStatus(module.id, row) === "completed",
  ).length;

  if (alreadyConverted && row.converted_lead) {
    return (
      <EmptyState
        title="Lead Request already created"
        body="Open Property Verification on the Lead Request to continue."
      >
        <Link
          to={`/chola360/leads/${encodeURIComponent(String(row.converted_lead))}/property-verification`}
          className="ims-btn-primary mt-4 inline-flex no-underline"
        >
          Open Lead Request
        </Link>
      </EmptyState>
    );
  }

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-lg flex-col gap-4 pb-28 lg:max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton
          fallback={`/chola360/prospects/${encodeURIComponent(name)}/checkpoints`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line"
        />
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold text-ims-ink md:text-[20px]">Property Verification</h1>
          <p className="text-xs text-slate-500">{propertyId}</p>
        </div>
      </div>

      <div className="ims-card px-4 py-4">
        <h2 className="text-[11px] font-semibold tracking-wide text-slate-500">SITE DETAILS</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Meta label="Property ID" value={propertyId} />
          <Meta label="Region" value={text(row.region)} />
          <Meta label="Area" value={text(row.area)} />
          <Meta label="Branch" value={text(row.location_details)} />
          <Meta label="RIBP SPOC" value={text(row.regional_infra_business_partner)} />
          <Meta label="ARBM" value={text(row.area_regional_business_manager)} />
        </dl>
      </div>

      <div>
        <h2 className="text-[13px] font-semibold text-ims-ink">Property Verification Steps</h2>
        <p className="mt-1 text-xs text-slate-500">
          {completed} of {PROPERTY_VERIFICATION_MODULES.length} steps done. The Lead Request is created after the 17-point checklist.
        </p>
      </div>

      <ul className="space-y-3">
        {PROPERTY_VERIFICATION_MODULES.map((module) => {
          const Icon = ICONS[module.id];
          const done = propertyVerificationStatus(module.id, row) === "completed";
          return (
            <li key={module.id}>
              <Link
                to={`/chola360/prospects/${encodeURIComponent(name)}/${module.path}`}
                className="flex items-center gap-2 rounded-xl border border-ims-line bg-white px-3 py-2.5 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF1FB] text-ims-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-ims-ink">{module.label}</span>
                  <span className="mt-0.5 block text-[12px] text-slate-500">{module.hint}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    done ? "bg-[#DDF5E8] text-[#1F7A4D]" : "bg-[#F8E4D4] text-[#8B4A1F]"
                  }`}
                >
                  {done ? "Completed" : "Pending"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {!checklistDone ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Finish all 17 Site Verification checks to submit the Lead Request.{" "}
          <Link className="font-semibold underline" to={`/chola360/prospects/${encodeURIComponent(name)}/checkpoints`}>
            Open checklist
          </Link>
        </p>
      ) : (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Submit the 17-point checklist to create the Lead Request.{" "}
          <Link className="font-semibold underline" to={`/chola360/prospects/${encodeURIComponent(name)}/checkpoints`}>
            Open checklist
          </Link>
        </p>
      )}
    </section>
  );
}
