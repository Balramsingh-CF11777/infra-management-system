/**
 * Read-only fallback for Frappe sites where infra_ms.portal is not installed yet
 * (currently UAT). It uses standard Frappe auth plus the existing whitelisted
 * infra_ms.api role queues that Desk already calls. Authorization stays on Frappe:
 * each queue method checks the session user's roles and scope itself.
 */
import { api } from "@/api/client";
import { isMisOnlyPortalUser } from "@/lib/misAccess";
import { filterPortalRoles } from "@/lib/portalRoles";
import { displayRole, displayState } from "@/lib/rules";
import { ApiError, type DashboardSummary, type PendingItem, type UserContext } from "@/types/api";

interface QueueSection {
  state?: string;
  doctype?: string;
  display_name?: string;
  count?: number;
  rows?: Array<Record<string, unknown>>;
  sections?: QueueSection[];
  total?: number;
}

interface QueuePayload extends QueueSection {
  allowed?: boolean;
  is_admin?: boolean;
  doctypes?: QueueSection[];
  query_queue?: QueueSection;
}

export interface RoleAccess {
  role: string;
  label: string;
  method: string;
  allowed: boolean;
  is_admin: boolean;
  total: number;
  items: PendingItem[];
  error?: string;
}

const ROLE_QUEUES: Array<{ role: string; method: string; module: string }> = [
  { role: "Regional Infra Business Partner", method: "infra_ms.api.get_ribp_workspace_queue", module: "pending" },
  { role: "Zonal Infra Business Partner", method: "infra_ms.api.get_zibp_workspace_queue", module: "pending" },
  { role: "RLM", method: "infra_ms.api.get_rlm_workspace_queue", module: "pending" },
  { role: "HO Corporate Legal Team", method: "infra_ms.api.get_ho_corporate_legal_workspace_queue", module: "pending" },
  { role: "Infra Head", method: "infra_ms.api.get_infra_head_workspace_queue", module: "pending" },
  { role: "Finance Head", method: "infra_ms.api.get_finance_head_workspace_queue", module: "pending" },
  { role: "Business Head", method: "infra_ms.api.get_business_head_workspace_queue", module: "pending" },
  { role: "HO Infra Legal Team", method: "infra_ms.api.get_ho_infra_legal_workspace_queue", module: "operations" },
  { role: "HO Infra Process Owner", method: "infra_ms.api.get_ho_process_owner_workspace_queue", module: "operations" },
  { role: "HO Infra Payment Team", method: "infra_ms.api.get_ho_payment_team_workspace_queue", module: "operations" },
  { role: "Business Team", method: "infra_ms.api.get_business_team_dashboard_data", module: "new_branch" },
  { role: "IMS MIS", method: "infra_ms.api.get_ims_mis_workspace_queue", module: "dashboard" },
  { role: "IMS MIS User", method: "infra_ms.api.get_ims_mis_workspace_queue", module: "dashboard" },
  { role: "IMS MIS Approver", method: "infra_ms.api.get_ims_mis_workspace_queue", module: "dashboard" },
];

const ADMIN_ROLES = new Set(["System Manager", "HO Infra Branch Admin", "Administrator"]);

async function call<T>(method: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<{ message?: T }>(`/api/method/${method}`, { params });
  return response.data?.message as T;
}

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]).replace(/^"|"$/g, "") : "";
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function toItem(row: Record<string, unknown>, role: string, doctype: string): PendingItem {
  const state = text(row.workflow_state);
  let resolvedDoctype = text(row.doctype) || doctype;
  let name = text(row.name);
  // Proposed Branch Details: Request ID = name, Property ID = request_no_new (New Branch link).
  // ZIBP queues often return New Branch (NBI/…); if the payload already has the reverse link, use it.
  let propertyId = text(row.request_no_new || row.property_id || "");
  const linkedProposed = text(row.proposed_branch_request_id || row.proposed_branch_id || "");
  if (
    (resolvedDoctype === "New Branch Details" || name.startsWith("NBI/")) &&
    linkedProposed
  ) {
    propertyId = name;
    name = linkedProposed;
    resolvedDoctype = "Proposed Branch Details";
  } else if (resolvedDoctype === "Proposed Branch Details" || name.startsWith("NBO/")) {
    resolvedDoctype = "Proposed Branch Details";
    propertyId = text(row.request_no_new || row.property_id || "");
  }
  return {
    module: "infra",
    doctype: resolvedDoctype,
    name,
    branch: text(row.location_details_new || row.location_details || row.location),
    product_line: text(row.product_line_new || row.product_line),
    zone: text(row.zone_new || row.zone),
    region: text(row.region_new || row.region),
    workflow_state: state,
    workflow_state_label: displayState(state),
    role,
    role_label: displayRole(role),
    pending_since: text(row.modified),
    query_status: text(row.query_status),
    reference: name,
    request_id: name,
    property_id: propertyId,
  };
}

function collect(section: QueueSection | undefined, role: string, doctype: string, out: PendingItem[]) {
  if (!section) return;
  const dt = section.doctype || doctype;
  for (const row of section.rows ?? []) {
    if (row && row.name) out.push(toItem(row, role, dt));
  }
  for (const child of section.sections ?? []) collect(child, role, dt, out);
}

export function flattenQueue(payload: QueuePayload, role: string): PendingItem[] {
  const items: PendingItem[] = [];
  const doctype = payload.doctype || "Proposed Branch Details";
  // Business Team / MIS top-level rows are allocation rows, not pending requests.
  if (role !== "Business Team" && role !== "IMS MIS" && role !== "IMS MIS User" && role !== "IMS MIS Approver") {
    for (const row of payload.rows ?? []) if (row && row.name) items.push(toItem(row, role, doctype));
  }
  for (const section of payload.sections ?? []) collect(section, role, doctype, items);
  for (const block of payload.doctypes ?? []) collect(block, role, block.doctype || doctype, items);
  collect(payload.query_queue, role, "Query Log Details", items);
  return items;
}

export async function probeRoleAccess(): Promise<RoleAccess[]> {
  const results = await Promise.allSettled(ROLE_QUEUES.map((queue) => call<QueuePayload>(queue.method)));
  return results.map((result, index) => {
    const queue = ROLE_QUEUES[index];
    const base = { role: queue.role, label: displayRole(queue.role), method: queue.method };
    if (result.status === "rejected") {
      const error = result.reason instanceof ApiError ? result.reason.message : "Not available";
      return { ...base, allowed: false, is_admin: false, total: 0, items: [], error };
    }
    const payload = result.value ?? {};
    const items = payload.allowed === false ? [] : flattenQueue(payload, queue.role);
    return {
      ...base,
      allowed: payload.allowed !== false,
      is_admin: Boolean(payload.is_admin),
      total: items.length,
      items,
    };
  });
}

async function fetchRoles(user: string): Promise<string[]> {
  try {
    const roles = await call<string[]>("frappe.core.doctype.user.user.get_roles", { uid: user });
    return filterPortalRoles(Array.isArray(roles) ? roles : []);
  } catch {
    return [];
  }
}

async function fetchProductLines(): Promise<string[]> {
  try {
    const lines = await call<string[]>("infra_ms.api.get_product_lines");
    return Array.isArray(lines) ? lines : [];
  } catch {
    return [];
  }
}

let accessCache: Promise<RoleAccess[]> | null = null;

export function getRoleAccess(force = false): Promise<RoleAccess[]> {
  if (force || !accessCache) accessCache = probeRoleAccess();
  return accessCache;
}

export function clearCompatCache() {
  accessCache = null;
}

export async function getCompatUserContext(): Promise<UserContext> {
  const user = await call<string>("frappe.auth.get_logged_user");
  if (!user || user === "Guest") throw new ApiError("Please log in to continue.", "UNAUTHENTICATED", 401);

  const [roles, productLines, access] = await Promise.all([fetchRoles(user), fetchProductLines(), getRoleAccess(true)]);
  const allowedQueues = access.filter((entry) => entry.allowed);
  const isAdmin = user === "Administrator" || roles.some((role) => ADMIN_ROLES.has(role)) || allowedQueues.some((entry) => entry.is_admin);
  const effectiveRoles = roles.length > 0 ? roles : allowedQueues.map((entry) => entry.role);
  const roleLabels = Array.from(new Set(effectiveRoles.map(displayRole)));
  const primary =
    allowedQueues.find((entry) => roles.includes(entry.role))?.role || allowedQueues[0]?.role || effectiveRoles[0] || "";

  const misOnly = isMisOnlyPortalUser(effectiveRoles);
  const modules = new Set(["dashboard"]);
  if (!misOnly) modules.add("pending");
  for (const entry of allowedQueues) {
    const queue = ROLE_QUEUES.find((item) => item.role === entry.role);
    if (queue && !(misOnly && queue.module !== "dashboard")) modules.add(queue.module);
  }

  return {
    user,
    full_name: readCookie("full_name") && readCookie("full_name") !== "Guest" ? readCookie("full_name") : user,
    roles: effectiveRoles,
    role_labels: roleLabels,
    product_lines: productLines,
    zones: [],
    regions: [],
    areas: [],
    permissions: {
      is_admin: isAdmin,
      can_administer: isAdmin,
      can_create_new_branch: false,
      can_create_mis_request: effectiveRoles.includes("IMS MIS User") || effectiveRoles.includes("IMS MIS"),
    },
    dashboard: misOnly ? "mis" : "default",
    default_role: primary,
    default_role_label: displayRole(primary),
    available_modules: Array.from(modules),
    scope: [],
    api_mode: "compat",
  };
}

export async function getCompatPending(): Promise<{ total: number; items: PendingItem[] }> {
  const access = await getRoleAccess();
  const seen = new Set<string>();
  const items: PendingItem[] = [];
  for (const entry of access) {
    for (const item of entry.items) {
      const key = `${item.doctype}::${item.name}::${item.role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  return { total: items.length, items };
}

async function fetchCompatHomeRows(userName: string) {
  const out: Array<{
    name: string;
    zone: string;
    region: string;
    area: string;
    product_line: string;
    workflow_state: string;
  }> = [];
  const seen = new Set<string>();

  // Business Team inventory is New Branch Details they own (PBD often has no BT read perm).
  try {
    const nbi = await call<Array<Record<string, unknown>>>("frappe.client.get_list", {
      doctype: "New Branch Details",
      fields: JSON.stringify([
        "name",
        "workflow_state",
        "zone",
        "region",
        "area",
        "location_details",
        "product_line",
      ]),
      filters: JSON.stringify([["owner", "=", userName]]),
      limit_page_length: 500,
      order_by: "modified desc",
    });
    for (const row of Array.isArray(nbi) ? nbi : []) {
      const name = text(row.name);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({
        name,
        zone: text(row.zone),
        region: text(row.region),
        area: text(row.area) || text(row.location_details),
        product_line: text(row.product_line),
        workflow_state: text(row.workflow_state),
      });
    }
  } catch {
    /* ignore — fall through to Proposed Branch attempt */
  }

  try {
    const pbd = await call<Array<Record<string, unknown>>>("frappe.client.get_list", {
      doctype: "Proposed Branch Details",
      fields: JSON.stringify([
        "name",
        "workflow_state",
        "zone_new",
        "region_new",
        "location_details_new",
        "product_line_new",
        "request_no_new",
      ]),
      limit_page_length: 500,
      order_by: "modified desc",
    });
    for (const row of Array.isArray(pbd) ? pbd : []) {
      const name = text(row.name);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({
        name,
        zone: text(row.zone_new),
        region: text(row.region_new),
        area: text(row.location_details_new),
        product_line: text(row.product_line_new),
        workflow_state: text(row.workflow_state),
      });
    }
  } catch {
    /* BT often cannot read Proposed Branch Details */
  }

  return out;
}

export async function getCompatRequests(
  user: UserContext,
  filters: {
    search?: string;
    workflow_state?: string;
    product_line?: string;
    zone?: string;
    region?: string;
    start?: number;
    page_length?: number;
  },
) {
  const start = Math.max(filters.start || 0, 0);
  const pageLength = Math.min(Math.max(filters.page_length || 20, 1), 50);
  const needle = (filters.search || "").trim().toLowerCase();
  const rows = await fetchCompatHomeRows(user.user);
  const filtered = rows.filter((row) => {
    if (filters.workflow_state && row.workflow_state !== filters.workflow_state) return false;
    if (filters.product_line && row.product_line !== filters.product_line) return false;
    if (filters.zone && row.zone !== filters.zone) return false;
    if (filters.region && row.region !== filters.region) return false;
    if (!needle) return true;
    return `${row.name} ${row.zone} ${row.region} ${row.area} ${row.product_line}`.toLowerCase().includes(needle);
  });
  const page = filtered.slice(start, start + pageLength);
  return {
    doctype: "Proposed Branch Details",
    total: filtered.length,
    start,
    page_length: pageLength,
    items: page.map((row) => ({
      name: row.name,
      request_no: row.name,
      request_id: row.name,
      property_id: row.name.startsWith("NBI/") ? row.name : "",
      product_line: row.product_line,
      location: row.area,
      zone: row.zone,
      region: row.region,
      area: row.area,
      workflow_state: row.workflow_state,
      workflow_state_label: displayState(row.workflow_state),
      modified: "",
      doctype: row.name.startsWith("NBI/") ? "New Branch Details" : "Proposed Branch Details",
    })),
  };
}

export async function getCompatDashboard(user: UserContext): Promise<DashboardSummary> {
  const access = await getRoleAccess();
  const allowed = access.filter((entry) => entry.allowed);
  const pending = allowed.reduce((sum, entry) => sum + entry.total, 0);
  const home_rows = await fetchCompatHomeRows(user.user);
  return {
    full_name: user.full_name,
    primary_role: user.default_role,
    primary_role_label: user.default_role_label,
    generated_at: new Date().toISOString(),
    kpis: [
      { id: "pending", label: "Pending with me", value: pending, path: "/pending" },
      { id: "roles", label: "Role queues available", value: allowed.length, path: "/dashboard" },
    ],
    queues: allowed.map((entry) => ({ role_label: entry.label, count: entry.total, items: entry.items.slice(0, 8) })),
    alerts: [],
    home_rows,
  };
}
