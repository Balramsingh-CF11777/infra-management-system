import type { UserContext } from "@/types/api";
import { usesRibLeadHome } from "@/lib/ribAccess";

export const ARBM_ROLE = "Area Regional Business Manager";

/** True when the session should use Property Leads as the primary home. */
export function usesArbmLeadHome(user: UserContext | null | undefined, activeRoleLabel?: string | null): boolean {
  if (!user || user.permissions?.is_admin) return false;

  const roles = user.roles ?? [];
  const labels = user.role_labels ?? [];
  const hasArbm = roles.includes(ARBM_ROLE) || labels.includes(ARBM_ROLE);
  if (!hasArbm) return false;

  const workingAs = (activeRoleLabel || "").trim();
  if (workingAs && workingAs !== ARBM_ROLE) return false;

  const defaultIsArbm = user.default_role === ARBM_ROLE || user.default_role_label === ARBM_ROLE;
  if (workingAs === ARBM_ROLE || defaultIsArbm) return true;

  // Single meaningful role is ARBM.
  const meaningful = roles.filter((role) => role !== "All" && role !== "Guest" && role !== "Desk User");
  return meaningful.length === 1 && meaningful[0] === ARBM_ROLE;
}

export function homePathForUser(user: UserContext | null | undefined, activeRoleLabel?: string | null): string {
  if (usesArbmLeadHome(user, activeRoleLabel) || usesRibLeadHome(user, activeRoleLabel)) {
    return "/chola360/leads";
  }
  return "/dashboard";
}
