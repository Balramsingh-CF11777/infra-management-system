import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeadDetail, saveLeadSiteVerification } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { SectionAwaitingApproval } from "@/features/leads/SectionAwaitingApproval";
import { SectionReviewBar, useCanEditLead, useSectionReviewAccess } from "@/features/leads/SectionReviewBar";
import { sectionAwaitingApproval, sectionLocked } from "@/features/leads/sectionReview";
import { ShortlistingChecklist } from "@/features/leads/ShortlistingChecklist";
import { SiteVerificationStepper } from "@/features/leads/SiteVerificationStepper";
import {
  SITE_CHECK_FLAGS,
  emptyShortlisting,
  isSiteVerificationComplete,
  shortlistingComplete,
  shortlistingFromLead,
  siteCheckYesForLead,
} from "@/features/leads/siteVerification";
import { ApiError } from "@/types/api";

export function SiteVerificationPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shortlist, setShortlist] = useState<Record<string, boolean>>(emptyShortlisting);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  useEffect(() => {
    if (!detail.data || hydrated) return;
    setShortlist(shortlistingFromLead(detail.data as Record<string, unknown>));
    setHydrated(true);
  }, [detail.data, hydrated]);

  const lead = (detail.data || {}) as Record<string, unknown>;
  const { canApprove } = useSectionReviewAccess(lead);
  const canEdit = useCanEditLead(lead);
  const awaiting = sectionAwaitingApproval(lead, "Onsite Vetting") && !canApprove;

  const saveOnsite = useMutation({
    mutationFn: () => {
      const yesFields = siteCheckYesForLead(lead);
      return saveLeadSiteVerification(name, {
        ...Object.fromEntries(SITE_CHECK_FLAGS.map((item) => [item.key, true])),
        ...Object.fromEntries(yesFields.map((item) => [item.key, "Yes"])),
        ...shortlist,
        shortlisting_checklist: JSON.stringify(shortlist),
      });
    },
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      navigate(`/chola360/leads/${encodeURIComponent(name)}/property-verification`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save Onsite Vetting."),
  });

  if (detail.isError || (!detail.isLoading && !detail.data)) {
    return <EmptyState title="Lead unavailable" body="Site Verification needs a valid Lead Request." />;
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-lg pb-24 lg:max-w-3xl lg:pb-0">
      <SiteVerificationStepper
        name={name}
        lead={lead}
        current="onsite"
        onsiteComplete={shortlistingComplete(shortlist) && isSiteVerificationComplete(lead)}
        showOnDesktop
      />

      {detail.isLoading ? <SkeletonBlock className="h-64" /> : null}
      {detail.isLoading ? null : awaiting ? (
        <SectionAwaitingApproval lead={lead} sectionLabel="Onsite Vetting" />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveOnsite.mutate();
          }}
        >
          <h2 className="text-[15px] font-semibold text-ims-ink">Onsite Vetting</h2>
          <fieldset disabled={sectionLocked(lead, "Onsite Vetting") || !canEdit} className="space-y-4 disabled:opacity-70">
            <ShortlistingChecklist
              title="Onsite Vetting"
              disabled={sectionLocked(lead, "Onsite Vetting")}
              value={shortlist}
              onToggle={(key) => setShortlist((prev) => ({ ...prev, [key]: !prev[key] }))}
            />
          </fieldset>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <SectionReviewBar name={name} lead={lead} section="Onsite Vetting" />
          <button
            type="submit"
            className="ims-btn-primary w-full min-h-12"
            disabled={saveOnsite.isPending || sectionLocked(lead, "Onsite Vetting")}
          >
            {saveOnsite.isPending ? "Saving…" : "Continue"}
          </button>
        </form>
      )}
    </section>
  );
}
