import type { LeadSummary } from "@/features/leads/types";

/** Stored history-trail stage, such as Site Verification or Property Verification. */
export function currentLeadTask(lead: LeadSummary): string {
  const stored = String(lead.open_tasks || "").trim();
  return stored || "Not started";
}
