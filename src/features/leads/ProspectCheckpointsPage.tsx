import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Camera } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convertProspectToLead, getProspect, saveProspectCheckpoints } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { ApiError } from "@/types/api";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { ShortlistingChecklist } from "@/features/leads/ShortlistingChecklist";
import {
  SHORTLISTING_CHECKS,
  emptyShortlisting,
  shortlistingComplete,
  shortlistingFrom,
} from "@/features/leads/siteVerification";
import { BackButton } from "@/components/common/BackButton";
import { LeadCreatedSuccessSheet } from "@/features/leads/LeadCreatedSuccessSheet";

export function ProspectCheckpointsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shortlist, setShortlist] = useState<Record<string, boolean>>(emptyShortlisting());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{
    name: string;
    property_id: string;
    location_label: string;
    proposed_branch?: string;
  } | null>(null);

  const prospectQuery = useQuery({
    queryKey: queryKeys.leadProspect(id),
    queryFn: () => getProspect(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!prospectQuery.data) return;
    setShortlist(shortlistingFrom(prospectQuery.data.shortlisting_checklist));
  }, [prospectQuery.data]);

  const complete = useMemo(() => shortlistingComplete(shortlist), [shortlist]);
  const doneCount = SHORTLISTING_CHECKS.filter((item) => shortlist[item.key]).length;
  const locationLabel =
    String(prospectQuery.data?.location_details || "").trim() ||
    String(prospectQuery.data?.property_id || id || "").trim();

  const saveMutation = useMutation({
    mutationFn: () => saveProspectCheckpoints(id, shortlist),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leadProspect(id) });
    },
  });

  async function onProceed() {
    setError("");
    if (!complete) {
      setError("Complete all 17 Site Verification checks before submitting the lead.");
      return;
    }
    setSubmitting(true);
    try {
      await saveMutation.mutateAsync();
      const result = await convertProspectToLead(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadProspect(id) });
      await queryClient.invalidateQueries({ queryKey: ["leadProspectList"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadHome });
      const locationLabel = String(prospectQuery.data?.location_details || "").trim();
      setCreated({
        name: result.name,
        property_id: result.property_id || result.name,
        location_label: locationLabel.toLowerCase().includes("branch")
          ? locationLabel
          : `${locationLabel || "Property"} Branch`,
        proposed_branch: result.proposed_branch,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the lead.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = saveMutation.isPending || submitting;
  const alreadyConverted = Boolean(prospectQuery.data?.converted_lead) || prospectQuery.data?.status === "Converted";

  return (
    <section className="w-full min-w-0 max-w-full overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:pb-0">
      <Breadcrumb current="Site Verification" />
      <div className="ims-card w-full min-w-0 max-w-full overflow-hidden">
        <CardHeader
          title="Site Verification"
          subtitle="Complete all 17 checks. The Lead Request is created when you submit this checklist."
          subtitleClassName="mt-0.5 hidden text-sm text-slate-500 lg:block"
        >
          <BackButton
            fallback="/chola360/leads/new"
            className="ims-btn-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center p-0 lg:h-auto lg:w-auto lg:gap-2 lg:px-4"
          >
            <span className="hidden lg:inline">Back</span>
          </BackButton>
        </CardHeader>

        {prospectQuery.isLoading ? (
          <div className="px-4 pb-5 sm:px-5">
            <SkeletonBlock className="h-48" />
          </div>
        ) : prospectQuery.isError ? (
          <p className="px-4 pb-5 text-sm text-rose-600 sm:px-5">
            {prospectQuery.error instanceof ApiError
              ? prospectQuery.error.message
              : "Could not load this Lead Prospect."}
          </p>
        ) : (
          <div className="space-y-4 border-t border-ims-line px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ims-line bg-slate-50/80 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ims-ink">{locationLabel || "Lead Prospect"}</p>
                <p className="text-xs text-slate-500">
                  {String(prospectQuery.data?.property_id || id)}
                  {prospectQuery.data?.status ? ` · ${prospectQuery.data.status}` : ""}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {doneCount} of {SHORTLISTING_CHECKS.length} complete
              </span>
            </div>

            <Link
              to={`/chola360/prospects/${encodeURIComponent(id)}/site-images`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c5cedd] bg-white px-4 py-4 text-sm font-semibold text-ims-ink no-underline"
            >
              <Camera className="h-4 w-4 text-slate-500" />
              Site Image Capture
            </Link>

            <ShortlistingChecklist
              title="Site Verification"
              value={shortlist}
              disabled={alreadyConverted || busy}
              onToggle={(key) =>
                setShortlist((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
            />

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            {alreadyConverted ? (
              <Link
                to={`/chola360/leads/${encodeURIComponent(String(prospectQuery.data?.converted_lead || ""))}/approval`}
                className="ims-btn-primary inline-flex no-underline"
              >
                Open History Trail
              </Link>
            ) : (
              <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ims-line bg-white px-4 py-3 lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                <button
                  type="button"
                  className="ims-btn-primary w-full min-h-12 disabled:opacity-50"
                  disabled={busy || !complete}
                  onClick={() => void onProceed()}
                >
                  {busy ? "Submitting…" : "Submit"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <LeadCreatedSuccessSheet
        open={Boolean(created)}
        locationLabel={created?.location_label || ""}
        propertyId={created?.property_id || ""}
        titleText="Lead Submitted"
        message="Your Property Lead has been assigned to RIM for Review & Approval"
        actionLabel="Continue"
        onDone={() => {
          if (!created) return;
          navigate(`/chola360/leads/${encodeURIComponent(created.name)}/approval`, { replace: true });
        }}
      />
    </section>
  );
}
