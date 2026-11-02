import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeadDetail, saveLeadPropertyDetails } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { LeadPackFields, PackSaveBar, missingPackFields } from "@/features/leads/LeadPackForm";
import { COMMERCIAL_PACK, PROPERTY_PACK } from "@/features/leads/leadPackFields";
import { isPropertyDetailsModuleComplete } from "@/features/leads/propertyVerification";
import { sectionLocked } from "@/features/leads/sectionReview";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>(blank);
  const [error, setError] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  useEffect(() => {
    if (!detail.data) return;
    const lead = detail.data as Record<string, unknown>;
    const next = blank();
    for (const field of PACK) next[field.key] = asText(lead[field.key]);
    setForm(next);
  }, [detail.data]);

  const save = useMutation({
    mutationFn: () => saveLeadPropertyDetails(name, { ...form }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      if (onSaved) {
        onSaved();
        return;
      }
      navigate(-1);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save Property Details."),
  });

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="Property Details needs a valid Lead Request." />;
  }

  const complete = isPropertyDetailsModuleComplete({ ...(detail.data as Record<string, unknown>), ...form });

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

  return (
    <section className="property-details w-full min-w-0 max-w-full space-y-4 text-[13px]">
      {embedded ? null : (
        <div className="flex items-start gap-3">
          <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold leading-snug text-ims-ink">Property Details</h1>
            <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">
              Property and commercial fields from Proposed Branch Details · {complete ? "Completed" : "Pending"}
            </p>
          </div>
        </div>
      )}

      <form className="space-y-5" onSubmit={onSubmit}>
        <LeadPackFields title="Property Details" fields={PROPERTY_PACK} values={form} disabled={sectionLocked(detail.data as Record<string, unknown>, "Property Verification")} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} />
        <LeadPackFields title="Commercial Details" fields={COMMERCIAL_PACK} values={form} disabled={sectionLocked(detail.data as Record<string, unknown>, "Rent Negotiation")} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <PackSaveBar pending={save.isPending} />
      </form>
    </section>
  );
}
