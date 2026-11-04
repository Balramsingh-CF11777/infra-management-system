import type { UserContext } from "@/types/api";

/**
 * Lead role names. Edit the three lists in this file, and the same lists in
 * infra_ms/portal/lead_roles.py.
 *
 * approver — same job as RB Manager: approve, reject, and send for re-work.
 * submitter — Area Regional Business Manager: submit a section and edit a lead they captured.
 * editor — Regional Infra Business Partner: edit fields and submit for that New Branch Details.
 *
 * After a portal reload, login sends lead_roles and the screens use that list.
 */
export const APPROVER_ROLES = [
  "RB Manager",
  "RLM",
  "Regional Infra Manager",
  "Regional Infrastructure Manager",
] as const;

export const SUBMITTER_ROLES = ["Area Regional Business Manager"] as const;

export const EDITOR_ROLES = ["Regional Infra Business Partner", "Regional Infra Manager"] as const;

export const APPROVER_MODULES = ["dashboard", "requests", "pending", "leads"];

type LeadRoleGroup = "approver" | "submitter" | "editor";

const FALLBACK: Record<LeadRoleGroup, readonly string[]> = {
  approver: APPROVER_ROLES,
  submitter: SUBMITTER_ROLES,
  editor: EDITOR_ROLES,
};

function names(user: Pick<UserContext, "lead_roles"> | null | undefined, group: LeadRoleGroup) {
  const fromSession = user?.lead_roles?.[group];
  return fromSession?.length ? fromSession : [...FALLBACK[group]];
}

export function approverRoles(user?: Pick<UserContext, "lead_roles"> | null) {
  return names(user, "approver");
}

export function submitterRoles(user?: Pick<UserContext, "lead_roles"> | null) {
  return names(user, "submitter");
}

export function editorRoles(user?: Pick<UserContext, "lead_roles"> | null) {
  return names(user, "editor");
}

export function approverRoleLabel(user?: Pick<UserContext, "lead_roles"> | null) {
  return approverRoles(user)[0] || "RB Manager";
}

export function isApproverRole(role: string | null | undefined, user?: Pick<UserContext, "lead_roles"> | null) {
  const name = (role || "").trim();
  return Boolean(name) && approverRoles(user).includes(name);
}

export function isSubmitterRole(role: string | null | undefined, user?: Pick<UserContext, "lead_roles"> | null) {
  const name = (role || "").trim();
  return Boolean(name) && submitterRoles(user).includes(name);
}

export function isEditorRole(role: string | null | undefined, user?: Pick<UserContext, "lead_roles"> | null) {
  const name = (role || "").trim();
  return Boolean(name) && editorRoles(user).includes(name);
}

export function hasApproverRole(user: Pick<UserContext, "roles" | "role_labels" | "lead_roles"> | null | undefined) {
  if (!user) return false;
  return [...(user.roles || []), ...(user.role_labels || [])].some((role) => isApproverRole(role, user));
}

export function hasSubmitterRole(user: Pick<UserContext, "roles" | "role_labels" | "lead_roles"> | null | undefined) {
  if (!user) return false;
  return [...(user.roles || []), ...(user.role_labels || [])].some((role) => isSubmitterRole(role, user));
}

export function hasEditorRole(user: Pick<UserContext, "roles" | "role_labels" | "lead_roles"> | null | undefined) {
  if (!user) return false;
  return [...(user.roles || []), ...(user.role_labels || [])].some((role) => isEditorRole(role, user));
}
