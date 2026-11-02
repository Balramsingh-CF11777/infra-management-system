export const SECTION_BY_STAGE: Record<string, string> = {
  site: "Site Verification",
  property: "Property Verification",
  rent: "Rent Negotiation",
  legal: "Legal Clearance",
  vaastu: "Vaastu Clearance",
  design: "Design Clearance",
  ll: "LL Agreement & Scope of Work",
  infra: "Infra Readiness",
};

export type SectionMilestone = {
  milestone?: string;
  status?: string;
  approved_by?: string;
  updated_on?: string;
};

export function milestoneOf(lead: Record<string, unknown> | null | undefined, section: string): SectionMilestone | undefined {
  const rows = lead?.lead_milestones;
  if (!Array.isArray(rows)) return undefined;
  return (rows as SectionMilestone[]).find((row) => row?.milestone === section);
}

export function sectionStatus(lead: Record<string, unknown> | null | undefined, section: string) {
  return (milestoneOf(lead, section)?.status || "Pending").trim();
}

export function sectionLocked(lead: Record<string, unknown> | null | undefined, section: string) {
  return sectionStatus(lead, section) === "Completed";
}

export function isSectionApprover(userId: string, approvedBy: string) {
  const actor = userId.trim().toLowerCase();
  const approver = approvedBy.trim().toLowerCase();
  return Boolean(actor) && actor === approver;
}
