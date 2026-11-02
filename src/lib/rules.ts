/** Presentation helpers. Frappe remains authoritative for transitions and saves. */

const LEGACY_ROLE_LABELS: Record<string, string> = {
  "Approval Manager 1": "Corporate Legal Team",
  "Approval Manager 2": "Infra Head",
  "Approval Manager 3": "Finance Head",
  "Approval Manager 4": "Business Head",
};

const LEGACY_STATE_LABELS: Record<string, string> = {
  "Assigned to Approval Manager 1": "Assigned to Corporate Legal Team",
  "Assigned to Approval Manager 2": "Assigned to Infra Head",
  "Assigned to Approval Manager 3": "Assigned to Finance Head",
  "Assigned to Approval Manager 4": "Assigned to Business Head",
};

const SEND_BACK_MARKERS = ["send back", "return", "reject", "drop"];

export const WORKFLOW_SEQUENCE = [
  "Assigned to ZIBP for Branch Proposal",
  "Assigned to RIBP for Property Details",
  "Assigned to RLM",
  "Assigned to RIBP for RLM Approval",
  "Assigned to ZIBP",
  "Assigned to HO Infra Legal Team on Document Verification",
  "Assigned to Corporate Legal Team",
  "Assigned to Infra Head",
  "Awaiting for the BOQ Submission",
  "Assigned to Finance Head",
  "Assigned to Business Head",
  "Assigned to RIBP for LL Agreement",
  "Assigned to HO Infra Legal Team on Security Deposit",
  "Assigned to HO Infra Legal Team on Advance Issued Date",
  "Assigned to HO Infra Legal Team on UTR & Payment Date",
  "Assigned to RIBP on LL Scope Start Date",
  "Assigned to RIBP on Strong Room Work Completion Status",
  "Assigned to RIBP on Strong Room Door Completion Status",
  "Assigned to RIBP on LL Scope Completion and Tenure Start Date",
  "Assigned to ZIBP on LL Scope Completion and Tenure Start Date Confirmation",
  "Assigned to HO Legal Team on Rental Start Date Confirmation",
  "Assigned to RIBP on IT Start Date",
  "Assigned to RIBP on IT Completion Date & TAT",
  "Assigned to RIBP on Branch Handover Confirmation",
  "Assigned to Business Team for the Branch Inauguration",
  "Branch Inauguration Completed",
  "Complete",
] as const;

export function displayRole(role: string): string {
  return LEGACY_ROLE_LABELS[role] ?? role;
}

export function displayState(state: string): string {
  return LEGACY_STATE_LABELS[state] ?? state;
}

export function commentRequired(action: string): boolean {
  const text = action.trim().toLowerCase();
  if (SEND_BACK_MARKERS.some((marker) => text.includes(marker))) return true;
  return ["approve", "submit", "confirm", "cleared", "complete"].includes(text);
}

export function isSendBack(action: string): boolean {
  const text = action.trim().toLowerCase();
  return text.includes("send back") || text.startsWith("return");
}

export function isForwardAction(action: string): boolean {
  const text = action.trim().toLowerCase();
  if (!text) return false;
  return !SEND_BACK_MARKERS.some((marker) => text.includes(marker));
}

export const PROPERTY_DETAILS_STATE = "Assigned to RIBP for Property Details";

const STAGES_WITH_QUERY_GATE = new Set([
  "Assigned to RLM",
  "Assigned to RIBP for RLM Approval",
  "Assigned to ZIBP",
  "Assigned to Corporate Legal Team",
  "Assigned to Infra Head",
  "Assigned to Finance Head",
  "Assigned to Business Head",
]);

export function queryBlocksAction(state: string, nextState: string, openCount: number): boolean {
  return openCount > 0 && STAGES_WITH_QUERY_GATE.has(state) && nextState !== PROPERTY_DETAILS_STATE;
}

export function ownerPercentageTotal(values: Array<string | number | null | undefined>): number {
  return values.reduce<number>((sum, value) => {
    if (value === null || value === undefined || value === "" || value === "0" || value === "0.0" || value === "0.00") {
      return sum;
    }
    return sum + Number(value);
  }, 0);
}

export function ownerPercentagesValid(values: Array<string | number | null | undefined>): boolean {
  const present = values.filter(
    (value) => value !== null && value !== undefined && value !== "" && value !== "0" && value !== "0.0" && value !== "0.00",
  );
  if (present.length === 0) return true;
  return Math.abs(ownerPercentageTotal(values) - 100) < 0.001;
}

export function stateTone(state: string): "current" | "done" | "danger" | "neutral" | "rework" {
  const text = state.toLowerCase();
  if (text.includes("reject") || text.includes("cancel") || text.includes("overdue")) return "danger";
  if (text.includes("rework") || text.includes("re-work") || text.includes("send back") || text.startsWith("return")) return "rework";
  if (text.includes("complete") || text.includes("inauguration completed") || text.includes("approved")) return "done";
  return "current";
}
