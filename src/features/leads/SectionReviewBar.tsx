import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyLeadWorkflowAction, applySectionReview } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { PropertyReworkSheet } from "@/features/leads/PropertyReworkSheet";
import { canEditLeadFields, canSubmitLeadSection, REVIEW_SECTIONS, sectionStatus } from "@/features/leads/sectionReview";
import { approverRoleLabel, hasApproverRole, isApproverRole, isSubmitterRole } from "@/config/leadRoles";
import { useSession } from "@/stores/session";
import { ApiError } from "@/types/api";

export function useSectionReviewAccess(lead: Record<string, unknown>) {
  const user = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const role = (activeRole || user?.default_role_label || user?.default_role || "").trim();
  const captured = String(lead.location_captured_by_role || "").trim();
  const actor = (user?.user || "").trim().toLowerCase();
  const namedApprover = [lead.nbd_rim_email, lead.section_approver_email, lead.rb_manager_details].some(
    (value) => actor && String(value || "").trim().toLowerCase() === actor,
  );
  const hasRimRole = isApproverRole(role, user) || hasApproverRole(user);
  const canApprove = namedApprover || hasRimRole || (isSubmitterRole(captured, user) && isSubmitterRole(role, user));
  return { canApprove, userId: user?.user || "" };
}

export function useCanEditLead(lead: Record<string, unknown>) {
  const user = useSession((state) => state.user);
  return canEditLeadFields(user, lead);
}

export function useCanSubmitLeadSection(lead: Record<string, unknown>) {
  const user = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  return canSubmitLeadSection(user, lead, activeRole);
}

/** Submit for approval, Approve, and Re-Work for one history-trail section. */
export function SectionReviewBar({
  name,
  lead,
  section,
  beforeSubmit,
}: {
  name: string;
  lead: Record<string, unknown>;
  section: string;
  /** Persist the open form before Submit or Approve. */
  beforeSubmit?: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const approverLabel = approverRoleLabel(useSession((state) => state.user));
  const { canApprove } = useSectionReviewAccess(lead);
  const canEdit = useCanEditLead(lead);
  const canSubmit = useCanSubmitLeadSection(lead);
  const [error, setError] = useState("");
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkPending, setReworkPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectPending, setRejectPending] = useState(false);
  const status = sectionStatus(lead, section);
  const workflow = String(lead.workflow_state || "Draft");
  const locked = status === "Completed";
  const awaiting = status === "Submitted";
  const siteSection = section === "Onsite Vetting" || section === "Site Verification";
  const canRework =
    canApprove &&
    (status === "Submitted" ||
      status === "Completed" ||
      status === "In Progress" ||
      (siteSection && (status === "Pending" || !status)));
  const canReject = canApprove && workflow !== "Rejected" && workflow !== "Approved";
  const propertyId = String(lead.property_id || lead.name || name);
  const location = String(lead.location_details || "");

  const review = useMutation({
    mutationFn: (action: "Submit" | "Approve" | "Re-Work") =>
      applySectionReview({
        name,
        section,
        action,
        comment: action === "Re-Work" ? undefined : undefined,
      }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not update this section."),
  });

  async function run(action: "Submit" | "Approve") {
    setError("");
    try {
      // Approvers review the saved section. Only someone who may edit fields persists them first.
      if (beforeSubmit && canEdit && action === "Submit") await beforeSubmit();
      await review.mutateAsync(action);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not update this section.");
    }
  }

  return (
    <>
      <div className="ims-card space-y-3 px-4 py-4 sm:px-5">
        <p className="text-[12px] text-slate-600">
          {locked
            ? "Approved. Fields stay locked until this approver sends the section for re-work."
            : awaiting
              ? `Submitted for approval. The ${approverLabel} for this request can approve, reject, or send it for re-work.`
              : canSubmit
              ? "Submit for approval records this section only. It does not change the lead status."
              : "This section can be submitted by the ARBM or RIBP for this request."}
        </p>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <button
              type="button"
              className="ims-btn-secondary"
              disabled={review.isPending || locked || awaiting}
              onClick={() => void run("Submit")}
            >
              Submit for approval
            </button>
          ) : null}
          <button
            type="button"
            className="ims-btn-primary disabled:opacity-50"
            disabled={review.isPending || locked || !canApprove}
            title={canApprove ? undefined : `A ${approverLabel} approves this section.`}
            onClick={() => void run("Approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className="ims-btn-secondary"
            disabled={review.isPending || !canRework}
            title={
              canRework
                ? "Send this section back to the Regional Infra Business Partner"
                : `A ${approverLabel} can send this section for re-work after it is submitted`
            }
            onClick={() => {
              setError("");
              setReworkOpen(true);
            }}
          >
            Re-Work
          </button>
          <button
            type="button"
            className="ims-btn-secondary"
            disabled={review.isPending || rejectPending || !canReject}
            title={canReject ? "Reject this lead request" : `The ${approverLabel} named on this request can reject it`}
            onClick={() => {
              setError("");
              setRejectOpen(true);
            }}
          >
            Reject
          </button>
        </div>
        {rejectOpen && canReject ? (
          <div className="space-y-2">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-ims-ink">Rejection remarks</span>
              <textarea
                className="ims-field min-h-[72px]"
                placeholder="Remarks for Reject"
                value={rejectRemarks}
                onChange={(event) => setRejectRemarks(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ims-btn-secondary"
                disabled={rejectPending}
                onClick={() => setRejectOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ims-btn-primary"
                disabled={rejectPending}
                onClick={() => {
                  const remarks = rejectRemarks.trim();
                  if (!remarks) {
                    setError("Remarks are required to reject this request.");
                    return;
                  }
                  setError("");
                  setRejectPending(true);
                  void applyLeadWorkflowAction({ name, action: "Reject", comment: remarks })
                    .then(async () => {
                      setRejectOpen(false);
                      setRejectRemarks("");
                      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
                    })
                    .catch((err: unknown) => {
                      setError(err instanceof ApiError ? err.message : "Could not reject this request.");
                    })
                    .finally(() => setRejectPending(false));
                }}
              >
                {rejectPending ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <PropertyReworkSheet
        open={reworkOpen}
        propertyId={propertyId}
        location={location}
        ribpName={String(lead.ribp_full_name || "")}
        ribpCode={String(lead.ribp_employee_code || "")}
        sections={REVIEW_SECTIONS}
        defaultSection={section}
        pending={reworkPending}
        error={reworkOpen ? error : ""}
        onCancel={() => {
          if (!reworkPending) setReworkOpen(false);
        }}
        onSend={(remarks, nextSection) => {
          setError("");
          setReworkPending(true);
          void applySectionReview({ name, section: nextSection || section, action: "Re-Work", comment: remarks })
            .then(async () => {
              setReworkOpen(false);
              await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
            })
            .catch((err: unknown) => {
              setError(err instanceof ApiError ? err.message : "Could not send this section for re-work.");
            })
            .finally(() => setReworkPending(false));
        }}
      />
    </>
  );
}
