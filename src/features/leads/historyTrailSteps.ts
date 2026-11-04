import {
  PROPERTY_VERIFICATION_MODULES,
  propertyVerificationStatus,
} from "@/features/leads/propertyVerification";
import { sectionStatus } from "@/features/leads/sectionReview";
import {
  isSiteVerificationComplete,
  shortlistingComplete,
  shortlistingFromLead,
} from "@/features/leads/siteVerification";

export type TrailSubStepStatus = "completed" | "current" | "pending";

export type TrailSubStep = {
  id: string;
  label: string;
  status: TrailSubStepStatus;
};

export type HistoryTrailStageId =
  | "site"
  | "property"
  | "rent"
  | "legal"
  | "vaastu"
  | "design"
  | "ll"
  | "infra";

/** Display labels for History Trail stage headers (not stored Select values). */
export const SECTION_LABEL: Record<HistoryTrailStageId, string> = {
  site: "Site Verification",
  property: "Property Verification",
  rent: "Rent Negotiation",
  legal: "Legal Clearance",
  vaastu: "Vaastu Clearance",
  design: "Design Clearance",
  ll: "LL Agreement & Scope of Work",
  infra: "Infra Readiness",
};

/** Static sub-step labels per History Trail stage (from lead + PBD flow). */
export const TRAIL_SUBSTEP_LABELS: Record<HistoryTrailStageId, string[]> = {
  site: ["Onsite Vetting", "Manager Approval"],
  property: PROPERTY_VERIFICATION_MODULES.map((module) => module.label),
  rent: [
    "Negotiation Details",
    "Commercial Terms",
    "Escalation & Lock-in",
    "Documents",
    "RIBP Review",
    "Consent",
  ],
  legal: [
    "Document Upload",
    "Vernacular TSR",
    "Consolidated Property Review",
    "Legal & Technical Vetting - I",
    "Legal Vetting - II",
    "Final Approval",
  ],
  vaastu: [
    "Premise Sketch Handoff",
    "Vaastu Opinion Request",
    "External Expert Review",
    "Opinion Received",
    "RIBP Acknowledgement",
    "Clearance Sign-off",
  ],
  design: [
    "Hand Sketch of Premise",
    "CAD Layout of Premise",
    "CAD Consent",
    "Tech Infra HO Review",
    "Design Corrections",
    "Design Sign-off",
  ],
  ll: [
    "Agreement Draft",
    "LL Scope of Work",
    "Security Deposit",
    "Advance Payment",
    "Agreement Execution",
    "Tenure Start",
  ],
  infra: [
    "Strong Room Works",
    "IT Readiness",
    "CCTV & Security",
    "Branch Handover",
    "Inauguration Prep",
    "Infra Ready",
  ],
};

/** Stored milestone for each History Trail sub-step, in the same order as the labels. */
const SUBSTEP_MILESTONE: Record<HistoryTrailStageId, string[]> = {
  site: ["Onsite Vetting", "Manager Approval"],
  property: ["Property Details", "Owner Details", "Facility Details", "Document Upload", "LOI Generation"],
  rent: [
    "Negotiation Details",
    "Commercial Terms",
    "Escalation & Lock-in",
    "Rent Negotiation Documents",
    "RIBP Review",
    "Rent Consent",
  ],
  legal: [
    "Legal Document Upload",
    "Vernacular TSR",
    "Consolidated Property Review",
    "Legal & Technical Vetting - I",
    "Legal Vetting - II",
    "Final Approval",
  ],
  vaastu: [
    "Premise Sketch Handoff",
    "Vaastu Opinion Request",
    "External Expert Review",
    "Opinion Received",
    "RIBP Acknowledgement",
    "Clearance Sign-off",
  ],
  design: [
    "Hand Sketch of Premise",
    "CAD Layout of Premise",
    "CAD Consent",
    "Tech Infra HO Review",
    "Design Corrections",
    "Design Sign-off",
  ],
  ll: [
    "Agreement Draft",
    "LL Scope of Work",
    "Security Deposit",
    "Advance Payment",
    "Agreement Execution",
    "Tenure Start",
  ],
  infra: [
    "Strong Room Works",
    "IT Readiness",
    "CCTV & Security",
    "Branch Handover",
    "Inauguration Prep",
    "Infra Ready",
  ],
};

/** Stored milestone used for status of a History Trail stage header. */
const MILESTONE_FOR_STAGE: Record<HistoryTrailStageId, string> = {
  site: "Onsite Vetting",
  property: "Property Details",
  rent: "Rent Negotiation",
  legal: "Legal Clearance",
  vaastu: "Vaastu Clearance",
  design: "Design Clearance",
  ll: "LL Agreement & Scope of Work",
  infra: "Infra Readiness",
};

function sectionActive(lead: Record<string, unknown>, stageId: HistoryTrailStageId) {
  const status = sectionStatus(lead, MILESTONE_FOR_STAGE[stageId]);
  return status === "Submitted" || status === "Re-Work" || status === "In Progress" || status === "Pending";
}

function sectionCompleted(lead: Record<string, unknown>, stageId: HistoryTrailStageId) {
  return sectionStatus(lead, MILESTONE_FOR_STAGE[stageId]) === "Completed";
}

function siteSubSteps(lead: Record<string, unknown>): TrailSubStep[] {
  const onsite =
    shortlistingComplete(shortlistingFromLead(lead)) && isSiteVerificationComplete(lead);
  const approved = sectionCompleted(lead, "site");
  const managerApproved = approved || sectionStatus(lead, "Manager Approval") === "Completed";
  const labels = TRAIL_SUBSTEP_LABELS.site;
  const flags = [onsite, managerApproved];
  const active = !approved;
  const firstOpen = flags.findIndex((flag) => !flag);
  return labels.map((label, index) => {
    const done = flags[index];
    let status: TrailSubStepStatus = "pending";
    if (done) status = "completed";
    else if (active && firstOpen === index) status = "current";
    return { id: `site-${index + 1}`, label, status };
  });
}

const PROPERTY_MODULE_MILESTONE = {
  property: "Property Details",
  owner: "Owner Details",
  facility: "Facility Details",
  documents: "Document Upload",
  loi: "LOI Generation",
} as const;

function propertySubSteps(lead: Record<string, unknown>): TrailSubStep[] {
  return PROPERTY_VERIFICATION_MODULES.map((module) => {
    const done =
      sectionStatus(lead, PROPERTY_MODULE_MILESTONE[module.id]) === "Completed" ||
      propertyVerificationStatus(module.id, lead) === "completed";
    return {
      id: module.id,
      label: module.label,
      status: (done ? "completed" : "pending") as TrailSubStepStatus,
    };
  }).map((step, index, list) => {
    if (step.status === "completed") return step;
    const firstPending = list.findIndex((item) => item.status !== "completed");
    if (firstPending === index && sectionActive(lead, "property")) {
      return { ...step, status: "current" as const };
    }
    return step;
  });
}

/** Resolve sub-step statuses for one History Trail stage. */
export function resolveTrailSubSteps(
  stageId: HistoryTrailStageId,
  lead: Record<string, unknown>,
): TrailSubStep[] {
  if (stageId === "site") return siteSubSteps(lead);
  if (stageId === "property") return propertySubSteps(lead);

  const labels = TRAIL_SUBSTEP_LABELS[stageId];
  const keys = SUBSTEP_MILESTONE[stageId];
  const headerDone = sectionCompleted(lead, stageId);
  const active = sectionActive(lead, stageId);
  const statuses = keys.map((key) => sectionStatus(lead, key));
  const firstOpen = statuses.findIndex((status) => status !== "Completed");
  return labels.map((label, index) => {
    const status = statuses[index] || "Pending";
    let mark: TrailSubStepStatus = "pending";
    if (headerDone || status === "Completed") mark = "completed";
    else if (status === "Submitted" || status === "Re-Work" || status === "In Progress") mark = "current";
    else if (active && index === firstOpen) mark = "current";
    return { id: `${stageId}-${index + 1}`, label, status: mark };
  });
}

export function trailSubtitle(reviewStatus: string, stepCount: number) {
  const status =
    reviewStatus === "Completed"
      ? "Completed"
      : reviewStatus === "Submitted"
        ? "Submitted"
        : reviewStatus === "Re-Work"
          ? "Re-Work"
          : reviewStatus === "In Progress"
            ? "In-Progress"
            : "Pending";
  return `${status} • ${stepCount} Steps`;
}
