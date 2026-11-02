import { filterPortalRoleLabels, filterPortalRoles } from "@/lib/portalRoles";
import type { UserContext } from "@/types/api";

/** Roles that own the MIS Product Wise Branch Initiate process. */
export const MIS_ROLES = ["IMS MIS User", "IMS MIS Approver", "IMS MIS"] as const;

/** Other portal roles that keep the default infra dashboard when combined with MIS. */
const OTHER_PORTAL_ROLES = new Set([
  "System Manager",
  "HO Infra Branch Admin",
  "Business Head",
  "Finance Head",
  "Infra Head",
  "HO Corporate Legal Team",
  "Corporate Legal Team",
  "HO Infra Legal Team",
  "Zonal Infra Business Partner",
  "RLM",
  "Regional Infra Business Partner",
  "Area Regional Business Manager",
  "Business Team",
  "HO Infra Process Owner",
  "HO Infra Payment Team",
  "Approval Manager 1",
  "Approval Manager 2",
  "Approval Manager 3",
  "Approval Manager 4",
]);

const ADMIN_ROLES = new Set(["System Manager", "HO Infra Branch Admin", "Administrator"]);

export function hasMisRole(roles: string[] | undefined): boolean {
  return Boolean(roles?.some((role) => (MIS_ROLES as readonly string[]).includes(role)));
}

export function isMisOnlyPortalUser(roles: string[] | undefined): boolean {
  const set = new Set(roles ?? []);
  if (!hasMisRole(roles) || [...set].some((role) => ADMIN_ROLES.has(role))) return false;
  return ![...set].some((role) => OTHER_PORTAL_ROLES.has(role));
}

/** Prefer the server flag; fall back to roles when the portal build is older or in compat mode. */
export function usesMisDashboard(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  if (user.dashboard === "mis") return true;
  if (user.dashboard === "default") return false;
  return isMisOnlyPortalUser(user.roles);
}

export function canCreateMisRequest(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  if (typeof user.permissions.can_create_mis_request === "boolean") return user.permissions.can_create_mis_request;
  return user.roles.includes("IMS MIS User") || user.roles.includes("IMS MIS");
}

/** Stamp dashboard / create permission from roles when the API omitted them. */
export function normalizeUserContext(user: UserContext): UserContext {
  const roles = filterPortalRoles(user.roles);
  const role_labels = filterPortalRoleLabels(user.role_labels);
  const default_role = roles.includes(user.default_role) ? user.default_role : roles[0] || user.default_role;
  const default_role_label = role_labels.includes(user.default_role_label)
    ? user.default_role_label
    : role_labels[0] || roles[0] || user.default_role_label;
  const dashboard = user.dashboard ?? (isMisOnlyPortalUser(roles) ? "mis" : "default");
  const modules =
    dashboard === "mis"
      ? Array.from(new Set(["dashboard", ...(user.available_modules ?? []).filter((module) => module === "dashboard")]))
      : user.available_modules;
  return {
    ...user,
    roles,
    role_labels,
    default_role,
    default_role_label,
    dashboard,
    available_modules: modules.length ? modules : user.available_modules,
    permissions: {
      ...user.permissions,
      can_create_mis_request: user.permissions.can_create_mis_request ?? canCreateMisRequest({ ...user, roles, dashboard }),
    },
  };
}
