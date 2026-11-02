export const PROPOSED_BRANCH = "Proposed Branch Details";
export const NEW_BRANCH = "New Branch Details";
export const LEAD_REQUEST = "Lead Request";

export function documentPath(doctype: string, name: string): string {
  if (doctype === PROPOSED_BRANCH) return `/infra/requests/${encodeURIComponent(name)}`;
  if (doctype === LEAD_REQUEST) return `/chola360/leads/${encodeURIComponent(name)}/approval`;
  if (doctype === NEW_BRANCH) return `/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  return `/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
}
