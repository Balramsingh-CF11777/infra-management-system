import type { UserContext } from "@/types/api";
import { hasSubmitterRole, isSubmitterRole, SUBMITTER_ROLES } from "@/config/leadRoles";
import { usesRibLeadHome } from "@/lib/ribAccess";

export const ARBM_ROLE = SUBMITTER_ROLES[0];

/** True when the session should use Property Leads as the primary home. */
export function usesArbmLeadHome(user: UserContext | null | undefined, activeRoleLabel?: string | null): boolean {
  if (!user || user.permissions?.is_admin) return false;

  const roles = user.roles ?? [];
  const hasArbm = hasSubmitterRole(user);
  if (!hasArbm) return false;

  const workingAs = (activeRoleLabel || "").trim();
  if (workingAs && !isSubmitterRole(workingAs, user)) return false;

  const defaultIsArbm = isSubmitterRole(user.default_role, user) || isSubmitterRole(user.default_role_label, user);
  if (workingAs === ARBM_ROLE || defaultIsArbm) return true;

  // Single meaningful role is ARBM.
  const meaningful = roles.filter((role) => role !== "All" && role !== "Guest" && role !== "Desk User");
  return meaningful.length === 1 && isSubmitterRole(meaningful[0], user);
}

export function homePathForUser(user: UserContext | null | undefined, activeRoleLabel?: string | null): string {
  if (usesArbmLeadHome(user, activeRoleLabel) || usesRibLeadHome(user, activeRoleLabel)) {
    return "/chola360/leads";
  }
  return "/dashboard";
}
