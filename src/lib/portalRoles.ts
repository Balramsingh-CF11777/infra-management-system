/** Frappe session roles that are not meaningful IMS "Working as" contexts. */
export const EXCLUDED_PORTAL_ROLES = new Set(["All", "Guest", "Desk User"]);

export function filterPortalRoles(roles: string[] | undefined): string[] {
  return (roles ?? []).filter((role) => !EXCLUDED_PORTAL_ROLES.has(role));
}

export function filterPortalRoleLabels(labels: string[] | undefined): string[] {
  return (labels ?? []).filter((label) => !EXCLUDED_PORTAL_ROLES.has(label));
}
