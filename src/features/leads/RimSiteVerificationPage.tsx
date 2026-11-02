import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyLeadWorkflowAction, getLeadDetail, saveLeadSiteVerification } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { LeadCreatedSuccessSheet, leadPlaceLabel } from "@/features/leads/LeadCreatedSuccessSheet";
import { sectionLocked } from "@/features/leads/sectionReview";
import { ShortlistingChecklist } from "@/features/leads/ShortlistingChecklist";
import { SITE_CHECK_FLAGS, SITE_CHECK_YES, emptyShortlisting, isRimExtraKey, shortlistingFrom, siteCheckCardsForLead, siteCheckYesForLead } from "@/features/leads/siteVerification";
import { ApiError } from "@/types/api";

export function RimSiteVerificationPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [shortlist, setShortlist] = useState<Record<string, boolean>>(emptyShortlisting);
  const [yesNo, setYesNo] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [approvedOpen, setApprovedOpen] = useState(false);
  const [proposedBranch, setProposedBranch] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  useEffect(() => {
    if (!detail.data || hydrated) return;
    const lead = detail.data as Record<string, unknown>;
    const nextFlags: Record<string, boolean> = {};
    for (const item of SITE_CHECK_FLAGS) {
      nextFlags[item.key] = Boolean(Number(lead[item.key]));
    }
    const nextYes: Record<string, string> = {};
    for (const item of SITE_CHECK_YES) {
      nextYes[item.key] = String(lead[item.key] || "").trim();
    }
    setChecks(nextFlags);
    setShortlist(shortlistingFrom(lead.shortlisting_checklist));
    setYesNo(nextYes);
    setHydrated(true);
  }, [detail.data, hydrated]);

  const action = useMutation({
    mutationFn: applyLeadWorkflowAction,
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      if (variables.action === "Approve") {
        setProposedBranch(result.proposed_branch || "");
        setApprovedOpen(true);
        return;
      }
      if (result.proposed_branch) {
        navigate(`/infra/requests/${encodeURIComponent(result.proposed_branch)}`);
        return;
      }
      navigate(`/chola360/leads/${encodeURIComponent(name)}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Action failed"),
  });

  function mandatoryIncomplete() {
    if (SITE_CHECK_FLAGS.some((item) => !checks[item.key])) return true;
    const yesChecks = siteCheckYesForLead(detail.data as Record<string, unknown>);
    return yesChecks.some((item) => yesNo[item.key] !== "Yes");
  }

  function payloadChecks() {
    return {
      ...Object.fromEntries(SITE_CHECK_FLAGS.map((item) => [item.key, Boolean(checks[item.key])])),
      ...Object.fromEntries(SITE_CHECK_YES.map((item) => [item.key, yesNo[item.key] || ""])),
      shortlisting_checklist: JSON.stringify(shortlist),
    };
  }

  async function persistChecks() {
    await saveLeadSiteVerification(name, payloadChecks());
    await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
  }

  async function onApprove(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mandatoryIncomplete()) {
      setError("Mandatory checks incomplete. Put on Hold or Reject, or complete all checks (including Yes/No).");
      return;
    }
    try {
      await persistChecks();
      action.mutate({ name, action: "Approve" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save Site Verification.");
    }
  }

  async function onSecondary(next: "Put on Hold" | "Reject") {
    setError("");
    try {
      await persistChecks();
      action.mutate({ name, action: next, comment });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save Site Verification.");
    }
  }

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="Site verification needs a valid Lead Request." />;
  }

  const lead = detail.data;
  const yesChecks = siteCheckYesForLead(lead as Record<string, unknown>);

  return (
    <section>
      <Breadcrumb current="Site Verification" />
      <div className="ims-card overflow-hidden">
        <CardHeader
          title="Site Verification"
          subtitle={`${String(lead.property_id || lead.name)} · ${String(lead.location_details || "")}`}
        >
          <button type="button" className="ims-btn-secondary min-h-10 px-4" onClick={() => navigate(-1)}>
            Back
          </button>
        </CardHeader>

        <form className="space-y-5 border-t border-ims-line px-4 py-4 md:px-5 md:py-5" onSubmit={(e) => void onApprove(e)}>
          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-ims-ink md:text-[17px]">Onsite Vetting</h2>
            <div className="mb-4 space-y-4">
              <ShortlistingChecklist
                disabled={sectionLocked(lead as Record<string, unknown>, "Site Verification")}
                value={shortlist}
                onToggle={(key) => setShortlist((prev) => ({ ...prev, [key]: !prev[key] }))}
              />
              <ShortlistingChecklist
                disabled={sectionLocked(lead as Record<string, unknown>, "Site Verification")}
                title="Site checks"
                items={siteCheckCardsForLead(lead as Record<string, unknown>)}
                value={{
                  ...checks,
                  ...shortlist,
                  ...Object.fromEntries(yesChecks.map((item) => [item.key, yesNo[item.key] === "Yes"])),
                }}
                onToggle={(key) => {
                  if (isRimExtraKey(key)) {
                    setShortlist((prev) => ({ ...prev, [key]: !prev[key] }));
                    return;
                  }
                  if (yesChecks.some((item) => item.key === key)) {
                    setYesNo((prev) => ({ ...prev, [key]: prev[key] === "Yes" ? "No" : "Yes" }));
                    return;
                  }
                  setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
                }}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-ims-line bg-[#f7f8fd] p-3 md:p-4">
            <textarea
              className="ims-field min-h-[88px] w-full bg-white md:min-h-[96px]"
              placeholder="Comment for Hold / Re-Work / Reject"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="submit" className="ims-btn-primary sm:min-w-[8.5rem]" disabled={action.isPending}>
                Approve Lead
              </button>
              <button
                type="button"
                className="ims-btn-secondary sm:min-w-[8.5rem]"
                disabled={action.isPending}
                onClick={() => void onSecondary("Put on Hold")}
              >
                Put on Hold
              </button>
              <button
                type="button"
                className="ims-btn-secondary sm:min-w-[8.5rem]"
                disabled={action.isPending}
                onClick={() => void onSecondary("Reject")}
              >
                Reject Lead
              </button>
            </div>
          </div>
        </form>
      </div>
      <LeadCreatedSuccessSheet
        open={approvedOpen}
        variant="approved"
        locationLabel={leadPlaceLabel(String(detail.data?.location_details || ""))}
        propertyId={String(detail.data?.property_id || detail.data?.name || "")}
        onDone={() => {
          setApprovedOpen(false);
          if (proposedBranch) {
            navigate(`/infra/requests/${encodeURIComponent(proposedBranch)}`);
            return;
          }
          navigate(`/chola360/leads/${encodeURIComponent(name)}`);
        }}
      />
    </section>
  );
}
