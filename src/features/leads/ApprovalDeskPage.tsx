import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, FileBadge2, MapPin, PenLine, Star, UserRound, type LucideIcon } from "lucide-react";
import { applyLeadWorkflowAction, applySectionReview, getLeadDetail } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { useSmartBack } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { GeoMapField } from "@/components/common/GeoMapField";
import { ARBM_ROLE } from "@/lib/arbmAccess";
import { toMapGeoJson } from "@/lib/geo";
import { RIBP_ROLE } from "@/lib/ribAccess";
import { HistoryTrailStageCard } from "@/features/leads/HistoryTrailStageCard";
import {
  resolveTrailSubSteps,
  trailSubtitle,
  TRAIL_SUBSTEP_LABELS,
  type HistoryTrailStageId,
} from "@/features/leads/historyTrailSteps";
import { LeadCreatedSuccessSheet, leadPlaceLabel } from "@/features/leads/LeadCreatedSuccessSheet";
import { PropertyReworkSheet } from "@/features/leads/PropertyReworkSheet";
import { LeadVerificationForm, type StageAction } from "@/features/leads/LeadVerificationForm";
import { useCanSubmitLeadSection } from "@/features/leads/SectionReviewBar";
import { SitePhotoGallery } from "@/features/leads/SitePhotoGallery";
import {
  countCompletedPropertyVerificationModules,
  PROPERTY_VERIFICATION_MODULES,
  propertyVerificationStatus,
  type PropertyVerificationModuleId,
} from "@/features/leads/propertyVerification";
import { SectionAwaitingApproval } from "@/features/leads/SectionAwaitingApproval";
import {
  canEditLeadFields,
  milestoneOf,
  REVIEW_SECTIONS,
  SECTION_BY_STAGE,
  sectionAwaitingApproval,
  sectionStatus,
} from "@/features/leads/sectionReview";
import { formatWhen } from "@/lib/format";
import { useSession } from "@/stores/session";
import { ApiError, type UserContext } from "@/types/api";

import { isApproverRole } from "@/config/leadRoles";

type TrailStatus = "completed" | "current" | "upcoming";

type TrailStep = {
  id: string;
  label: string;
  hint: string;
  stepCount: number;
  phase: "lead" | "pbd";
};

const STEPS: TrailStep[] = (
  [
    { id: "site", label: "Site Verification", hint: "Onsite checks on this lead", phase: "lead" },
    { id: "property", label: "Property Verification", hint: "Address, floor, and area", phase: "lead" },
    { id: "rent", label: "Rent Negotiation", hint: "Commercial terms", phase: "lead" },
    { id: "legal", label: "Legal Clearance", hint: "After manager approval", phase: "lead" },
    { id: "vaastu", label: "Vaastu Clearance", hint: "Later approval level", phase: "pbd" },
    { id: "design", label: "Design Clearance", hint: "Later approval level", phase: "pbd" },
    { id: "ll", label: "LL Agreement & Scope of Work", hint: "Later approval level", phase: "pbd" },
    { id: "infra", label: "Infra Readiness", hint: "Later approval level", phase: "pbd" },
  ] as const
).map((step) => ({
  ...step,
  stepCount: TRAIL_SUBSTEP_LABELS[step.id].length,
}));

const PROPERTY_ICONS: Record<PropertyVerificationModuleId, LucideIcon> = {
  property: Building2,
  owner: UserRound,
  facility: Star,
  documents: FileBadge2,
  loi: PenLine,
};

function trailMark(reviewStatus: string): TrailStatus {
  if (reviewStatus === "Completed") return "completed";
  if (reviewStatus === "Submitted" || reviewStatus === "Re-Work" || reviewStatus === "In Progress") return "current";
  return "upcoming";
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function mapValueOf(lead: Record<string, unknown>) {
  if (text(lead.map)) return String(lead.map);
  const lat = text(lead.geo_latitude);
  const lng = text(lead.geo_longitude);
  if (!lat || !lng) return "";
  return toMapGeoJson(lat, lng);
}

function workingRole(activeRole: string, user: UserContext | null) {
  return activeRole.trim() || String(user?.default_role_label || user?.default_role || "").trim();
}

function personLabel(value: string) {
  const name = value.trim();
  if (!name) return "";
  const hyphen = name.search(/[-–—]/);
  return hyphen > 1 ? name.slice(0, hyphen).trim() : name;
}

function siteApproval(lead: Record<string, unknown>, user: UserContext | null, captured: string) {
  const row = milestoneOf(lead, "Onsite Vetting");
  const approved = (row?.status || "") === "Completed";
  const when = approved ? text(row?.updated_on) : "";
  if (captured === RIBP_ROLE) {
    return {
      role: "RB Manager",
      name: approved ? personLabel(text(row?.approved_by)) || "Approved" : "Pending approval",
      when,
      done: approved,
    };
  }
  const selfName =
    (approved ? personLabel(text(row?.approved_by)) : "") ||
    personLabel(text(lead.area_regional_business_manager)) ||
    personLabel(user?.full_name || "") ||
    "Area Regional Business Manager";
  return {
    role: "Self approval",
    name: selfName,
    when,
    done: approved,
  };
}

function CheckMark({ done }: { done: boolean }) {
  if (!done) return <span className="h-2 w-2 rounded-full bg-slate-300" />;
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M5 10.5 8.2 13.5 15 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ApprovalDeskPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const goBackInApp = useSmartBack(`/chola360/leads/${encodeURIComponent(name)}`);
  const queryClient = useQueryClient();
  const sessionUser = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const [comment, setComment] = useState("");
  const [approvedOpen, setApprovedOpen] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkError, setReworkError] = useState("");
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get("stage"));

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  const action = useMutation({
    mutationFn: applyLeadWorkflowAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    },
  });
  const review = useMutation({
    mutationFn: applySectionReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    },
  });

  const trail = useMemo(() => {
    if (!detail.data) return [];
    const row = detail.data as Record<string, unknown>;
    return STEPS.map((step) => {
      const reviewStatus = sectionStatus(row, SECTION_BY_STAGE[step.id] || step.label);
      return {
        ...step,
        reviewStatus,
        status: trailMark(reviewStatus),
      };
    });
  }, [detail.data]);

  const activeId = selected ?? trail.find((step) => step.status === "current")?.id ?? "site";

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="Approval desk needs a valid Lead Request." />;
  }

  const lead = detail.data as Record<string, unknown>;
  const state = text(lead.workflow_state);
  const propertyId = text(lead.property_id) || text(lead.name);
  const roleNow = workingRole(activeRole, sessionUser);
  const captured = text(lead.location_captured_by_role) || (roleNow === ARBM_ROLE || roleNow === RIBP_ROLE ? roleNow : "");
  const selfApprove = captured === ARBM_ROLE && roleNow === ARBM_ROLE;
  const isRim = isApproverRole(roleNow, sessionUser);
  const canApprove = selfApprove || isRim;
  const closed = state === "Rejected";
  const section = SECTION_BY_STAGE[activeId] || "Onsite Vetting";
  const reviewStatus = sectionStatus(lead, section);
  const fieldsLocked = reviewStatus === "Completed";
  const sectionApprover = milestoneOf(lead, section)?.approved_by || "";
  const inputsLocked = fieldsLocked || !canEditLeadFields(sessionUser, lead);
  const canRework =
    canApprove &&
    (reviewStatus === "Submitted" ||
      reviewStatus === "Completed" ||
      reviewStatus === "In Progress" ||
      ((section === "Onsite Vetting" || section === "Site Verification") && (reviewStatus === "Pending" || !reviewStatus)));
  const showAwaiting = sectionAwaitingApproval(lead, section) && !canApprove;
  const stageHint = closed
    ? "This lead is Rejected."
    : fieldsLocked
      ? `Approved by ${personLabel(sectionApprover) || "the approver"}. Fields stay locked until that approver sends Re-Work to the Regional Infra Business Partner.`
      : showAwaiting
        ? "This section is awaiting approval. Fields stay locked until the RB Manager reviews it."
        : "Submit for approval records this section only. It does not change the lead status.";

  async function onStageAction(
    kind: StageAction,
    payload?: { checks?: Record<string, unknown>; values?: Record<string, unknown> },
  ) {
    if (kind === "reject") {
      await action.mutateAsync({ name, action: "Reject", comment });
      return;
    }
    if (kind === "rework") {
      setReworkError("");
      setReworkOpen(true);
      return;
    }
    const sectionAction = kind === "submit" ? "Submit" : "Approve";
    await review.mutateAsync({
      name,
      section,
      action: sectionAction,
      comment,
      checks: payload?.checks,
      values: payload?.values,
    });
  }
  const siteApproved = sectionStatus(lead, "Onsite Vetting") === "Completed";
  const approval = siteApproval(lead, sessionUser, captured);
  const mapValue = mapValueOf(lead);
  const lat = text(lead.geo_latitude);
  const lng = text(lead.geo_longitude);
  const mapsHref = lat && lng ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}` : "";

  const mobileDetail = selected != null;

  function goBack() {
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (mobile && selected) {
      setSelected(null);
      return;
    }
    goBackInApp();
  }

  return (
    <section className="approval-desk grid items-start gap-3 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
      <aside className={mobileDetail ? "hidden space-y-4 lg:block" : "space-y-4"}>
        {mapValue ? (
          <div className="relative">
            <GeoMapField
              value={mapValue}
              address={text(lead.geo_location || lead.complete_address_of_the_property)}
              hideCoordinates
              hideLocationLabel
              frameClassName="h-40 sm:h-44"
            />
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="absolute left-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ims-ink no-underline shadow-[0_4px_14px_rgba(31,37,71,0.12)]"
              >
                <MapPin className="h-3.5 w-3.5 text-ims-primary" />
                Locate on Maps
              </a>
            ) : null}
          </div>
        ) : null}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line lg:hidden"
              aria-label="Back"
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[13px] font-semibold text-ims-ink">History Trail</h2>
          </div>
          <ol className="relative space-y-2.5">
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-4 left-[11px] top-4 w-0.5 ${siteApproved ? "bg-emerald-200" : "bg-slate-200"}`}
            />
            {trail.map((step) => {
              const open = step.id === activeId;
              const done = step.status === "completed";
              const current = step.status === "current";
              const subSteps = resolveTrailSubSteps(step.id as HistoryTrailStageId, lead);
              return (
                <li key={step.id} className="relative pl-8">
                  <span
                    aria-hidden
                    className={[
                      "absolute left-0 top-3 z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2",
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : current
                          ? "border-ims-primary bg-white text-ims-primary"
                          : "border-slate-200 bg-white text-slate-300",
                    ].join(" ")}
                  >
                    <CheckMark done={done} />
                  </span>
                  <HistoryTrailStageCard
                    title={step.label}
                    subtitle={trailSubtitle(step.reviewStatus, step.stepCount)}
                    open={open}
                    steps={subSteps}
                    onToggle={() => setSelected(step.id)}
                    footer={
                      step.id === "site" ? (
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              approval.done ? "bg-emerald-500 text-white" : "border-2 border-ims-primary bg-white"
                            }`}
                          >
                            {approval.done ? <CheckMark done /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-semibold text-ims-ink">{approval.role}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-slate-600">{approval.name}</span>
                            {approval.when ? (
                              <span className="mt-0.5 block text-[11px] text-slate-400">{formatWhen(approval.when)}</span>
                            ) : null}
                          </span>
                        </div>
                      ) : open ? (
                        <p className="text-[11px] leading-relaxed text-slate-500">{step.hint}</p>
                      ) : null
                    }
                  />
                </li>
              );
            })}
          </ol>
        </div>
      </aside>

      <div className={mobileDetail ? "min-w-0 space-y-4" : "hidden min-w-0 space-y-4 lg:block"}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-500">
            <button type="button" className="text-slate-500" aria-label="Back" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link to="/dashboard" className="hover:text-ims-primary no-underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/pending" className="hover:text-ims-primary no-underline">
              Pending Tasks
            </Link>
            <span>/</span>
            <span className="truncate font-semibold text-ims-ink">{propertyId}</span>
          </p>
        </div>

        <div className="ims-card px-4 py-4 sm:px-5">
          <h2 className="text-[11px] font-semibold tracking-wide text-slate-500">SITE DETAILS</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
            <Meta label="Property ID" value={propertyId} />
            <Meta label="Region" value={text(lead.region) || "—"} />
            <Meta label="Area" value={text(lead.area) || "—"} />
            <Meta label="Branch" value={text(lead.location_details) || "—"} />
            <Meta label="RIBP SPOC" value={text(lead.regional_infra_business_partner) || "—"} />
            <Meta label="Employee ID" value={text(lead.employee_id || lead.employee) || "—"} />
          </dl>
        </div>

        {showAwaiting ? (
          <div className="ims-card overflow-hidden">
            <SectionAwaitingApproval lead={lead} sectionLabel={section} />
          </div>
        ) : activeId === "property" ? (
          <PropertyVerificationPanel
            name={name}
            lead={lead}
            hint={stageHint}
            comment={comment}
            onComment={setComment}
            busy={action.isPending || review.isPending}
            locked={closed}
            fieldsLocked={fieldsLocked}
            inputsLocked={inputsLocked}
            canRework={canRework}
            approveDisabled={!canApprove}
            approveTitle={canApprove ? undefined : "An RB Manager approves this lead."}
            onAction={onStageAction}
            onRequestRework={() => {
              setReworkError("");
              setReworkOpen(true);
            }}
          />
        ) : (
          <LeadVerificationForm
            name={name}
            lead={lead}
            activeStage={activeId}
            hint={stageHint}
            comment={comment}
            onComment={setComment}
            busy={action.isPending || review.isPending}
            locked={closed}
            fieldsLocked={fieldsLocked}
            inputsLocked={inputsLocked}
            canRework={canRework}
            approveDisabled={!canApprove}
            approveTitle={canApprove ? undefined : "An RB Manager approves this lead."}
            onAction={onStageAction}
            onRequestRework={() => {
              setReworkError("");
              setReworkOpen(true);
            }}
          />
        )}
      </div>
      <PropertyReworkSheet
        open={reworkOpen}
        propertyId={propertyId}
        location={text(lead.location_details)}
        ribpName={text(lead.ribp_full_name)}
        ribpCode={text(lead.ribp_employee_code)}
        sections={REVIEW_SECTIONS}
        defaultSection={section}
        pending={review.isPending}
        error={reworkError}
        onCancel={() => {
          if (!review.isPending) setReworkOpen(false);
        }}
        onSend={(remarks, nextSection) => {
          setReworkError("");
          void review
            .mutateAsync({ name, section: nextSection || section, action: "Re-Work", comment: remarks })
            .then(() => setReworkOpen(false))
            .catch((err: unknown) => {
              setReworkError(err instanceof ApiError ? err.message : "Could not send this section for re-work.");
            });
        }}
      />
      <LeadCreatedSuccessSheet
        open={approvedOpen}
        variant="approved"
        locationLabel={leadPlaceLabel(text(lead.location_details))}
        propertyId={propertyId}
        onDone={() => setApprovedOpen(false)}
      />
    </section>
  );
}

function PropertyVerificationPanel({
  name,
  lead,
  hint,
  comment,
  onComment,
  busy,
  locked,
  fieldsLocked = false,
  canRework = false,
  approveDisabled,
  approveTitle,
  onAction,
  onRequestRework,
}: {
  name: string;
  lead: Record<string, unknown>;
  hint: string;
  comment: string;
  onComment: (value: string) => void;
  busy: boolean;
  locked: boolean;
  fieldsLocked?: boolean;
  canRework?: boolean;
  approveDisabled: boolean;
  onRequestRework?: () => void;
  approveTitle?: string;
  onAction: (
    action: StageAction,
    payload?: { checks?: Record<string, unknown>; values?: Record<string, unknown> },
  ) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const canSubmit = useCanSubmitLeadSection(lead);
  const completed = countCompletedPropertyVerificationModules(lead);
  async function run(action: StageAction) {
    setError("");
    try {
      await onAction(action);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete this action.");
    }
  }
  return (
    <section className="space-y-3">
      <SitePhotoGallery lead={lead} />
      <div>
        <h2 className="text-[13px] font-semibold text-ims-ink">Property Verification Steps</h2>
        <p className="mt-1 text-xs text-slate-500">
          {completed} of {PROPERTY_VERIFICATION_MODULES.length} steps done. Open whichever step is still pending.
        </p>
      </div>
      <ul className="space-y-3">
        {PROPERTY_VERIFICATION_MODULES.map((module) => {
          const status = propertyVerificationStatus(module.id, lead);
          const Icon = PROPERTY_ICONS[module.id];
          const done = status === "completed";
          return (
            <li key={module.id}>
              <Link
                to={`/chola360/leads/${encodeURIComponent(name)}/${module.path}`}
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
      <div className="ims-card space-y-3 px-4 py-4 sm:px-5">
        <p className="text-[12px] text-slate-600">{hint}</p>
        <textarea
          className="ims-field min-h-[72px]"
          placeholder="Remarks for Reject"
          value={comment}
          onChange={(event) => onComment(event.target.value)}
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <button type="button" className="ims-btn-secondary" disabled={locked || fieldsLocked || busy} onClick={() => void run("submit")}>
              Submit for approval
            </button>
          ) : null}
          <button
            type="button"
            className="ims-btn-primary disabled:opacity-50"
            disabled={locked || fieldsLocked || busy || approveDisabled}
            title={approveTitle}
            onClick={() => void run("approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className="ims-btn-secondary"
            disabled={locked || busy || !canRework}
            title={
              canRework
                ? "Send this section back to the Regional Infra Business Partner for re-work"
                : "An RB Manager can send this section for re-work after it is submitted"
            }
            onClick={() => (onRequestRework ? onRequestRework() : void run("rework"))}
          >
            Re-Work
          </button>
          <button type="button" className="ims-btn-secondary" disabled={locked || busy} onClick={() => void run("reject")}>
            Reject
          </button>
        </div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[12px] font-semibold text-ims-ink">{value}</dd>
    </div>
  );
}
