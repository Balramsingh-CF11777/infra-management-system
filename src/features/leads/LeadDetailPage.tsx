import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyLeadWorkflowAction, getLeadDetail } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { SiteImageThumb } from "@/components/common/SiteImageThumb";
import { SITE_IMAGE_SLOTS, extraSiteImageSlots } from "@/features/leads/siteImageSlots";
import { LeadCreatedSuccessSheet, leadPlaceLabel } from "@/features/leads/LeadCreatedSuccessSheet";
import { isSiteVerificationComplete, missingSiteVerificationLabels } from "@/features/leads/siteVerification";
import { ApiError } from "@/types/api";
import { useMemo, useState } from "react";

export function LeadDetailPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [approvedOpen, setApprovedOpen] = useState(false);
  const [proposedBranch, setProposedBranch] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  const action = useMutation({
    mutationFn: applyLeadWorkflowAction,
    onSuccess: async (result, variables) => {
      setMessage(`Moved to ${result.workflow_state}`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadHome });
      if (variables.action === "Approve") {
        setProposedBranch(result.proposed_branch || "");
        setApprovedOpen(true);
        return;
      }
      if (result.proposed_branch) {
        navigate(`/infra/requests/${encodeURIComponent(result.proposed_branch)}`);
      }
    },
    onError: (err) => {
      setMessage(err instanceof ApiError ? err.message : "Action failed");
    },
  });

  const siteImages = useMemo(() => {
    const rows =
      (detail.data?.additional_attachment as Array<{ document_type?: string; document_attachment?: string }> | undefined) ||
      [];
    const byType = new Map(
      rows
        .filter((row) => row.document_type && row.document_attachment)
        .map((row) => [String(row.document_type), String(row.document_attachment)] as const),
    );
    const fixed = SITE_IMAGE_SLOTS.map((slot) => ({ slot, url: byType.get(slot) || "" })).filter((row) => row.url);
    const extra = extraSiteImageSlots([...byType.keys()]).map((slot) => ({ slot, url: byType.get(slot) || "" }));
    return [...fixed, ...extra];
  }, [detail.data?.additional_attachment]);

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title="Lead unavailable"
        body={detail.error instanceof ApiError ? detail.error.message : "This Lead Request could not be loaded."}
      />
    );
  }

  const lead = detail.data;
  const state = String(lead.workflow_state || "Draft");
  const proposed = lead.proposed_branch ? String(lead.proposed_branch) : "";
  const siteOk = isSiteVerificationComplete(lead as Record<string, unknown>);
  const missingChecks = missingSiteVerificationLabels(lead as Record<string, unknown>);

  return (
    <section className="lead-detail space-y-4">
      <Breadcrumb current={String(lead.property_id || lead.name)} />

      <div className="ims-card overflow-hidden">
        <CardHeader
          title={String(lead.location_details || "Property Lead")}
          subtitle={`${String(lead.property_id || lead.name)} · ${state}`}
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ims-btn-secondary min-h-10 px-4" onClick={() => navigate(-1)}>
              Back
            </button>
            {proposed ? (
              <Link
                className="ims-btn-primary min-h-10 px-4 no-underline"
                to={`/infra/requests/${encodeURIComponent(proposed)}`}
              >
                Open Proposed Branch
              </Link>
            ) : null}
          </div>
        </CardHeader>

        <div className="grid gap-3 border-t border-ims-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="Document" value={String(lead.name)} />
          <Meta label="Requirement" value={String(lead.branch_opening_requirement || "—")} />
          <Meta label="Product line" value={String(lead.product_line || "—")} />
          <Meta label="Address" value={String(lead.complete_address_of_the_property || "—")} />
          <Meta label="Entrance" value={String(lead.main_entrance_direction || "—")} />
          <Meta label="Region / Area" value={[lead.region, lead.area].filter(Boolean).join(" · ") || "—"} />
          <Meta
            label="Regional Infra Business Partner"
            value={String(lead.regional_infra_business_partner || "—")}
          />
        </div>
      </div>

      <div className="ims-card overflow-hidden">
        <CardHeader
          title="Site Images"
          subtitle={
            siteImages.length
              ? `${siteImages.length} photo${siteImages.length === 1 ? "" : "s"} captured`
              : "No site photos yet — open Site Image Capture to upload."
          }
        >
          <Link
            className="ims-btn-secondary min-h-10 px-4 no-underline"
            to={`/chola360/leads/${encodeURIComponent(name)}/site-images`}
          >
            {siteImages.length ? "Edit photos" : "Capture photos"}
          </Link>
        </CardHeader>
        {siteImages.length ? (
          <div className="grid grid-cols-3 gap-2 border-t border-ims-line px-4 py-4 sm:grid-cols-4 md:grid-cols-6">
            {siteImages.map((row) => (
              <div
                key={row.slot}
                className="group relative aspect-square overflow-hidden rounded-xl border border-ims-line bg-slate-50"
                title={row.slot}
              >
                <SiteImageThumb storedUrl={row.url} alt={row.slot} className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[10px] font-medium text-white">
                  {row.slot}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          className="ims-btn-secondary no-underline"
          to={`/chola360/leads/${encodeURIComponent(name)}/site-images`}
        >
          Site Image Capture
        </Link>
        <Link
          className="ims-btn-secondary no-underline"
          to={`/chola360/leads/${encodeURIComponent(name)}/approval?stage=property`}
        >
          Property Verification
        </Link>
        <Link
          className={`ims-btn-secondary no-underline ${!siteOk && (state === "Awaiting Approval" || state === "On Hold") ? "ring-2 ring-amber-400" : ""}`}
          to={`/chola360/leads/${encodeURIComponent(name)}/approval?stage=site`}
        >
          Site Verification{siteOk ? " ✓" : ""}
        </Link>
        <Link className="ims-btn-secondary no-underline" to={`/chola360/leads/${encodeURIComponent(name)}/approval`}>
          Approval Desk
        </Link>
      </div>

      {(state === "Draft" || state === "Re-Work") && (
        <div className="ims-card p-5">
          <button
            type="button"
            className="ims-btn-primary"
            disabled={action.isPending}
            onClick={() => action.mutate({ name, action: state === "Re-Work" ? "Resubmit" : "Submit" })}
          >
            {state === "Re-Work" ? "Resubmit" : "Submit for Approval"}
          </button>
        </div>
      )}

      {(state === "Awaiting Approval" || state === "On Hold") && (
        <div className="ims-card space-y-3 p-5">
          {!siteOk ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Complete Site Verification before Approve: {missingChecks.join(", ")}.
            </p>
          ) : null}
          <textarea
            className="ims-field min-h-[72px]"
            placeholder="Comment for Re-Work / Reject"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ims-btn-primary disabled:opacity-50"
              disabled={action.isPending || !siteOk}
              title={!siteOk ? "Complete Site Verification first" : undefined}
              onClick={() => action.mutate({ name, action: "Approve" })}
            >
              Approve (create PBD)
            </button>
            <button
              type="button"
              className="ims-btn-secondary"
              disabled={action.isPending}
              onClick={() => action.mutate({ name, action: "Send for Re-Work", comment })}
            >
              Re-Work
            </button>
            <button
              type="button"
              className="ims-btn-secondary"
              disabled={action.isPending}
              onClick={() => action.mutate({ name, action: "Reject", comment })}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      <LeadCreatedSuccessSheet
        open={approvedOpen}
        variant="approved"
        locationLabel={leadPlaceLabel(String(detail.data?.location_details || ""))}
        propertyId={String(detail.data?.property_id || detail.data?.name || "")}
        onDone={() => {
          setApprovedOpen(false);
          if (proposedBranch) navigate(`/infra/requests/${encodeURIComponent(proposedBranch)}`);
        }}
      />
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="break-words text-[13px] font-semibold text-ims-ink">{value}</p>
    </div>
  );
}
