import { isEditorRole, isSubmitterRole } from "@/config/leadRoles";

/** Stored Lead Request Milestone Select values. One row per History Trail stage and sub-step. */
export const LEAD_MILESTONES = [
  "Site Verification",
  "Onsite Vetting",
  "Manager Approval",
  "Property Verification",
  "Property Details",
  "Owner Details",
  "Facility Details",
  "Document Upload",
  "LOI Generation",
  "Rent Negotiation",
  "Negotiation Details",
  "Commercial Terms",
  "Escalation & Lock-in",
  "Rent Negotiation Documents",
  "RIBP Review",
  "Rent Consent",
  "Legal Clearance",
  "Legal Document Upload",
  "Vernacular TSR",
  "Consolidated Property Review",
  "Legal & Technical Vetting - I",
  "Legal Vetting - II",
  "Final Approval",
  "Vaastu Clearance",
  "Premise Sketch Handoff",
  "Vaastu Opinion Request",
  "External Expert Review",
  "Opinion Received",
  "RIBP Acknowledgement",
  "Clearance Sign-off",
  "Design Clearance",
  "Hand Sketch of Premise",
  "CAD Layout of Premise",
  "CAD Consent",
  "Tech Infra HO Review",
  "Design Corrections",
  "Design Sign-off",
  "LL Agreement & Scope of Work",
  "Agreement Draft",
  "LL Scope of Work",
  "Security Deposit",
  "Advance Payment",
  "Agreement Execution",
  "Tenure Start",
  "Infra Readiness",
  "Strong Room Works",
  "IT Readiness",
  "CCTV & Security",
  "Branch Handover",
  "Inauguration Prep",
  "Infra Ready",
] as const;

/** Sections that can be submitted, approved, or sent for re-work. */
export const REVIEW_SECTIONS: { value: LeadMilestone; label: string }[] = LEAD_MILESTONES.map((value) => ({
  value,
  label:
    value === "Document Upload"
      ? "Documents"
      : value === "LOI Generation"
        ? "LOI Generation & Consent"
        : value === "Rent Negotiation Documents"
          ? "Rent Negotiation — Documents"
          : value === "Rent Consent"
            ? "Rent Negotiation — Consent"
            : value === "Legal Document Upload"
              ? "Legal — Document Upload"
              : value,
}));

export type LeadMilestone = (typeof LEAD_MILESTONES)[number];

/** History Trail stage id → stored milestone (Site Verification header → Onsite Vetting row). */
export const SECTION_BY_STAGE: Record<string, string> = {
  site: "Onsite Vetting",
  property: "Property Details",
  owner: "Owner Details",
  facility: "Facility Details",
  documents: "Document Upload",
  loi: "LOI Generation",
  rent: "Rent Negotiation",
  legal: "Legal Clearance",
  vaastu: "Vaastu Clearance",
  design: "Design Clearance",
  ll: "LL Agreement & Scope of Work",
  infra: "Infra Readiness",
};

/** Legacy History Trail labels that may still appear in older rows / UI copy. */
const MILESTONE_ALIASES: Record<string, string> = {
  "Site Verification": "Onsite Vetting",
  "Property Verification": "Property Details",
};

export function canonicalMilestone(section: string) {
  const name = section.trim();
  return MILESTONE_ALIASES[name] || name;
}

export type SectionMilestone = {
  milestone?: string;
  status?: string;
  approved_by?: string;
  updated_on?: string;
};

export function milestoneOf(lead: Record<string, unknown> | null | undefined, section: string): SectionMilestone | undefined {
  const rows = lead?.lead_milestones;
  if (!Array.isArray(rows)) return undefined;
  const list = rows as SectionMilestone[];
  const want = section.trim();
  const exact = list.find((row) => String(row?.milestone || "").trim() === want);
  if (exact) return exact;
  // Older leads stored the site and property steps under the stage header name only.
  const legacy = MILESTONE_ALIASES[want];
  if (!legacy) return undefined;
  return list.find((row) => String(row?.milestone || "").trim() === legacy);
}

export function sectionStatus(lead: Record<string, unknown> | null | undefined, section: string) {
  return (milestoneOf(lead, section)?.status || "Pending").trim();
}

export function sectionLocked(lead: Record<string, unknown> | null | undefined, section: string) {
  return sectionStatus(lead, section) === "Completed";
}

/** RIBP submitted this section — show Awaiting Approval until the NBD RIM acts. */
export function sectionAwaitingApproval(lead: Record<string, unknown> | null | undefined, section: string) {
  return sectionStatus(lead, section) === "Submitted";
}

export function isSectionApprover(userId: string, approvedBy: string) {
  const actor = userId.trim().toLowerCase();
  const approver = approvedBy.trim().toLowerCase();
  return Boolean(actor) && actor === approver;
}

/** True when this login is the ARBM or RIBP stored for the lead's New Branch Details. */
export function canEditLeadFields(
  user: { user?: string; roles?: string[]; permissions?: { is_admin?: boolean } } | null | undefined,
  lead: Record<string, unknown> | null | undefined,
) {
  if (!user) return false;
  if (user.permissions?.is_admin || (user.roles || []).includes("System Manager")) return true;
  if (lead && lead.can_edit_fields != null && lead.can_edit_fields !== "") return Boolean(Number(lead.can_edit_fields));
  const actor = (user.user || "").trim().toLowerCase();
  if (!actor) return false;
  const namedApprover = [lead?.nbd_rim_email, lead?.section_approver_email]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  if (namedApprover.includes(actor) && String(lead?.arbm_email || "").trim().toLowerCase() !== actor) return false;
  const parties = [lead?.arbm_email, lead?.regional_infra_business_partner, lead?.ribp_user]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return parties.includes(actor);
}

/** Submit for approval is only for the ARBM or RIBP who can update this lead. */
export function canSubmitLeadSection(
  user: { user?: string; roles?: string[]; default_role?: string; default_role_label?: string; permissions?: { is_admin?: boolean } } | null | undefined,
  lead: Record<string, unknown> | null | undefined,
  activeRole?: string,
) {
  const working = (activeRole || user?.default_role_label || user?.default_role || "").trim();
  if (!isSubmitterRole(working, user) && !isEditorRole(working, user)) return false;
  if (!user) return false;
  if (lead && lead.can_edit_fields != null && lead.can_edit_fields !== "") return Boolean(Number(lead.can_edit_fields));
  const actor = (user.user || "").trim().toLowerCase();
  if (!actor) return false;
  const parties = [lead?.arbm_email, lead?.regional_infra_business_partner, lead?.ribp_user]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return parties.includes(actor);
}
