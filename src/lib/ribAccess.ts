import type { UserContext } from "@/types/api";

export const RIBP_ROLE = "Regional Infra Business Partner";

export function hasRibpRole(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  const roles = user.roles ?? [];
  const labels = user.role_labels ?? [];
  return roles.includes(RIBP_ROLE) || labels.includes(RIBP_ROLE);
}

/** True when the session should use Lead geo drill-down (state → region → requests). */
export function usesRibLeadHome(user: UserContext | null | undefined, activeRoleLabel?: string | null): boolean {
  if (!user || user.permissions?.is_admin) return false;
  if (!hasRibpRole(user)) return false;

  const workingAs = (activeRoleLabel || "").trim();
  if (workingAs && workingAs !== RIBP_ROLE) return false;

  const defaultIsRib =
    user.default_role === RIBP_ROLE || user.default_role_label === RIBP_ROLE;
  if (workingAs === RIBP_ROLE || defaultIsRib) return true;

  const meaningful = (user.roles ?? []).filter(
    (role) => role !== "All" && role !== "Guest" && role !== "Desk User",
  );
  return meaningful.length === 1 && meaningful[0] === RIBP_ROLE;
}
