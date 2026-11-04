import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { saveLeadPropertyDetails } from "@/api/leads";
import { BackButton, useSmartBack } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { LeadPackFields, PackSaveBar, missingPackFields } from "@/features/leads/LeadPackForm";
import { stateFromLead } from "@/features/leads/indiaStates";
import { withRentPerSqft } from "@/features/leads/rentPerSqft";
import { COMMERCIAL_PACK, PROPERTY_PACK } from "@/features/leads/leadPackFields";
import { isPropertyDetailsModuleComplete } from "@/features/leads/propertyVerification";
import { PropertyVerificationStepper } from "@/features/leads/PropertyVerificationStepper";
import { SectionAwaitingApproval } from "@/features/leads/SectionAwaitingApproval";
import { SectionReviewBar, useCanEditLead, useSectionReviewAccess } from "@/features/leads/SectionReviewBar";
import { sectionAwaitingApproval, sectionLocked } from "@/features/leads/sectionReview";
import { usePropertyRecord } from "@/features/leads/usePropertyRecord";
import { ApiError } from "@/types/api";

const PACK = [...PROPERTY_PACK, ...COMMERCIAL_PACK];

function blank() {
  const values: Record<string, string> = {};
  for (const field of PACK) values[field.key] = "";
  return values;
}

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

export function LeadPropertyDetailsPage({
  embedded = false,
  onSaved,
}: {
  embedded?: boolean;
  onSaved?: () => void;
} = {}) {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const record = usePropertyRecord(name);
  const goBack = useSmartBack(record.hub);
  const [form, setForm] = useState<Record<string, string>>(blank);
  const [error, setError] = useState("");
  const detail = record.detail;

  useEffect(() => {
    if (!detail.data) return;
    const lead = detail.data as Record<string, unknown>;
    const next = blank();
    for (const field of PACK) next[field.key] = asText(lead[field.key]);
    next.state = stateFromLead(lead);
    setForm(withRentPerSqft(next));
  }, [detail.data]);

  const leadForAccess = (detail.data || {}) as Record<string, unknown>;
  const { canApprove } = useSectionReviewAccess(leadForAccess);
  const leadCanEdit = useCanEditLead(leadForAccess);
  const canEdit = record.prospectMode ? !record.converted : leadCanEdit;

  const save = useMutation({
    mutationFn: () => record.saveDetails({ ...form }),
    onSuccess: async () => {
      await record.refresh();
      if (onSaved) {
        onSaved();
        return;
      }
      goBack();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save Property Details."),
  });

  const lead = leadForAccess;
  const complete = isPropertyDetailsModuleComplete({ ...lead, ...form });
  const awaiting = !record.prospectMode && sectionAwaitingApproval(lead, "Property Details") && !canApprove;
  const fieldsLocked = record.prospectMode ? false : sectionLocked(lead, "Property Details");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = missingPackFields(PACK, form);
    if (missing.length) {
      setError(`${missing[0].label.trim()} is required based on the other fields.`);
      return;
    }
    setError("");
    save.mutate();
  }

  if (!embedded && (detail.isError || (!detail.isLoading && !detail.data))) {
    return <EmptyState title="Lead unavailable" body="Property Details needs a valid Lead Request." />;
  }

  return (
    <section className="property-details w-full min-w-0 max-w-full space-y-4 text-[13px]">
      {embedded ? null : (
        <>
          <PropertyVerificationStepper name={name} lead={lead} current="property" recordBase={record.recordBase} />
          <div className="hidden items-start gap-3 lg:flex">
            <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-semibold leading-snug text-ims-ink">Property Details</h1>
              <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">
                Property and commercial fields from Proposed Branch Details · {complete ? "Completed" : "Pending"}
              </p>
            </div>
          </div>
        </>
      )}

      {detail.isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : awaiting ? (
        <SectionAwaitingApproval lead={lead} sectionLabel="Property Details" />
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <LeadPackFields title="Property Details" fields={PROPERTY_PACK} values={form} disabled={fieldsLocked || !canEdit} onChange={(key, value) => setForm((prev) => withRentPerSqft({ ...prev, [key]: value }))} />
          <LeadPackFields title="Commercial Details" fields={COMMERCIAL_PACK} values={form} disabled={fieldsLocked || !canEdit} onChange={(key, value) => setForm((prev) => withRentPerSqft({ ...prev, [key]: value }))} />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {canEdit ? <PackSaveBar pending={save.isPending} /> : null}
          {record.prospectMode ? null : (
          <SectionReviewBar
            name={name}
            lead={{ ...lead, ...form }}
            section="Property Details"
            beforeSubmit={async () => {
              const missing = missingPackFields(PACK, form);
              if (missing.length) throw new Error(`${missing[0].label.trim()} is required based on the other fields.`);
              await saveLeadPropertyDetails(name, { ...form });
            }}
          />
          )}
        </form>
      )}
    </section>
  );
}
