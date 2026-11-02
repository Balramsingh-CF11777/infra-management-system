import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, ChevronRight, FileBadge2, MapPin, PenLine, Star, UserRound, type LucideIcon } from "lucide-react";
import { applyLeadWorkflowAction, applySectionReview, getLeadDetail } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { GeoMapField } from "@/components/common/GeoMapField";
import { ARBM_ROLE } from "@/lib/arbmAccess";
import { toMapGeoJson } from "@/lib/geo";
import { RIBP_ROLE } from "@/lib/ribAccess";
import { LeadCreatedSuccessSheet, leadPlaceLabel } from "@/features/leads/LeadCreatedSuccessSheet";
import { LeadVerificationForm, type StageAction } from "@/features/leads/LeadVerificationForm";
import {
  countCompletedPropertyVerificationModules,
  PROPERTY_VERIFICATION_MODULES,
  propertyVerificationStatus,
  type PropertyVerificationModuleId,
} from "@/features/leads/propertyVerification";
import { isSectionApprover, milestoneOf, SECTION_BY_STAGE, sectionStatus } from "@/features/leads/sectionReview";
import { formatWhen } from "@/lib/format";
import { useSession } from "@/stores/session";
import { ApiError, type UserContext } from "@/types/api";

const RIM_ROLES = new Set(["RLM", "Regional Infra Manager", "Regional Infrastructure Manager"]);

type TrailStatus = "completed" | "current" | "upcoming";

type TrailStep = {
  id: string;
  label: string;
  hint: string;
  stepCount: number;
  phase: "lead" | "pbd";
};

const STEPS: TrailStep[] = [
  { id: "site", label: "Site Verification", hint: "Onsite checks on this lead", stepCount: 5, phase: "lead" },
  { id: "property", label: "Property Verification", hint: "Address, floor, and area", stepCount: 5, phase: "lead" },
  { id: "rent", label: "Rent Negotiation", hint: "Commercial terms", stepCount: 6, phase: "lead" },
  { id: "legal", label: "Legal Clearance", hint: "After manager approval", stepCount: 6, phase: "lead" },
  { id: "vaastu", label: "Vaastu Clearance", hint: "Later approval level", stepCount: 6, phase: "pbd" },
  { id: "design", label: "Design Clearance", hint: "Later approval level", stepCount: 6, phase: "pbd" },
  { id: "ll", label: "LL Agreement & Scope of Work", hint: "Later approval level", stepCount: 6, phase: "pbd" },
  { id: "infra", label: "Infra Readiness", hint: "Later approval level", stepCount: 6, phase: "pbd" },
];

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

function statusLabel(reviewStatus: string) {
  if (reviewStatus === "Completed") return "Completed";
  if (reviewStatus === "Submitted") return "Submitted";
  if (reviewStatus === "Re-Work") return "Re-Work";
  if (reviewStatus === "In Progress") return "In-Progress";
  return "Pending";
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
  const row = milestoneOf(lead, "Site Verification");
  const approved = (row?.status || "") === "Completed";
  const when = approved ? text(row?.updated_on) : "";
  if (captured === RIBP_ROLE) {
    return {
      role: "Regional Infra Manager",
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionUser = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const [comment, setComment] = useState("");
  const [approvedOpen, setApprovedOpen] = useState(false);
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
      const reviewStatus = sectionStatus(row, step.label);
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
  const rimApprove = captured === RIBP_ROLE && RIM_ROLES.has(roleNow);
  const canApprove = selfApprove || rimApprove;
  const closed = state === "Rejected";
  const section = SECTION_BY_STAGE[activeId] || "Site Verification";
  const reviewStatus = sectionStatus(lead, section);
  const fieldsLocked = reviewStatus === "Completed";
  const sectionApprover = milestoneOf(lead, section)?.approved_by || "";
  const canRework = fieldsLocked && isSectionApprover(sessionUser?.user || "", sectionApprover);
  const stageHint = closed
    ? "This lead is Rejected."
    : fieldsLocked
      ? `Approved by ${personLabel(sectionApprover) || "the approver"}. Fields in this section stay locked until that approver sends it for re-work.`
      : "Submit for approval records this section only. It does not change the lead status.";

  async function onStageAction(kind: StageAction) {
    if (kind === "reject") {
      await action.mutateAsync({ name, action: "Reject", comment });
      return;
    }
    const sectionAction = kind === "submit" ? "Submit" : kind === "approve" ? "Approve" : "Re-Work";
    await review.mutateAsync({ name, section, action: sectionAction, comment });
  }
  const siteApproved = sectionStatus(lead, "Site Verification") === "Completed";
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
    navigate(-1);
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
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[13px] font-semibold text-ims-ink">History Trail</h2>
          </div>
          <ol className="relative space-y-2">
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-4 left-[11px] top-4 w-0.5 ${siteApproved ? "bg-emerald-200" : "bg-slate-200"}`}
            />
            {trail.map((step) => {
              const open = step.id === activeId;
              const done = step.status === "completed";
              const current = step.status === "current";
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
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-current={open ? "true" : undefined}
                    onClick={() => setSelected(step.id)}
                    className={[
                      "flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left shadow-[0_6px_18px_rgba(15,23,42,0.05)]",
                      open ? "border-ims-primary/30 ring-1 ring-ims-primary/20" : "border-slate-200/90",
                    ].join(" ")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold leading-snug text-ims-ink">{step.label}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{statusLabel(step.reviewStatus)}</span>
                    </span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 ${open ? "text-ims-primary" : ""}`} />
                  </button>
                  {step.id === "site" ? (
                    <div className="mt-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5">
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
                    </div>
                  ) : null}
                  {open && step.id !== "site" ? (
                    <p className="mt-2 hidden px-1 text-[12px] leading-relaxed text-slate-500 lg:block">{step.hint}</p>
                  ) : null}
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

        {activeId === "property" ? (
          <PropertyVerificationPanel
            name={name}
            lead={lead}
            hint={stageHint}
            comment={comment}
            onComment={setComment}
            busy={action.isPending || review.isPending}
            locked={closed}
            fieldsLocked={fieldsLocked}
            canRework={canRework}
            approveDisabled={!canApprove}
            approveTitle={canApprove ? undefined : "A Regional Infra Manager approves this lead."}
            onAction={onStageAction}
          />
        ) : null}

        {activeId === "property" ? null : (
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
            canRework={canRework}
            approveDisabled={!canApprove}
            approveTitle={canApprove ? undefined : "A Regional Infra Manager approves this lead."}
            onAction={onStageAction}
          />
        )}
      </div>
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
  approveTitle?: string;
  onAction: (action: StageAction) => Promise<void>;
}) {
  const [error, setError] = useState("");
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
      <div>
        <h2 className="text-[13px] font-semibold text-ims-ink">Site Verification Steps - Optional</h2>
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
          <button type="button" className="ims-btn-secondary" disabled={locked || fieldsLocked || busy} onClick={() => void run("submit")}>
            Submit for approval
          </button>
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
            title={canRework ? "Send this section for re-work" : "Only the approver who approved this section can send it for re-work"}
            onClick={() => void run("rework")}
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
