import type { UserContext } from "@/types/api";
import { EDITOR_ROLES, editorRoles } from "@/config/leadRoles";

export const RIBP_ROLE = EDITOR_ROLES[0];

function isPrimaryEditor(role: string | null | undefined, user?: Pick<UserContext, "lead_roles"> | null) {
  return (role || "").trim() === editorRoles(user)[0];
}

export function hasRibpRole(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  return (user.roles || []).some((role) => isPrimaryEditor(role, user)) || (user.role_labels || []).some((role) => isPrimaryEditor(role, user));
}

/** True when the session should use Lead geo drill-down (state → region → requests). */
export function usesRibLeadHome(user: UserContext | null | undefined, activeRoleLabel?: string | null): boolean {
  if (!user || user.permissions?.is_admin) return false;
  if (!hasRibpRole(user)) return false;

  const workingAs = (activeRoleLabel || "").trim();
  if (workingAs && !isPrimaryEditor(workingAs, user)) return false;

  const defaultIsRib = isPrimaryEditor(user.default_role, user) || isPrimaryEditor(user.default_role_label, user);
  if (workingAs === editorRoles(user)[0] || defaultIsRib) return true;

  const meaningful = (user.roles ?? []).filter(
    (role) => role !== "All" && role !== "Guest" && role !== "Desk User",
  );
  return meaningful.length === 1 && isPrimaryEditor(meaningful[0], user);
}
