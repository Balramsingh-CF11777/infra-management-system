import type { GoldLoanHome } from "@/lib/goldLoanHome";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code = "ERROR", status = 400, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface UserContext {
  user: string;
  full_name: string;
  roles: string[];
  role_labels: string[];
  product_lines: string[];
  zones: string[];
  regions: string[];
  areas: string[];
  permissions: { is_admin: boolean; can_administer: boolean; can_create_new_branch?: boolean; can_create_mis_request?: boolean };
  /** "mis" for users whose only portal roles are IMS MIS User / IMS MIS Approver. */
  dashboard?: "mis" | "default";
  default_role: string;
  default_role_label: string;
  available_modules: string[];
  scope: Array<{
    role: string;
    role_label: string;
    product_line?: string;
    zone?: string;
    region?: string;
    area?: string;
    scope?: string;
  }>;
  /** "portal" when infra_ms.portal is installed; "compat" uses existing infra_ms.api read-only. */
  api_mode?: "portal" | "compat";
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  module: string;
}

export interface PendingItem {
  module: string;
  doctype: string;
  name: string;
  branch?: string;
  product_line?: string;
  zone?: string;
  region?: string;
  workflow_state: string;
  workflow_state_label: string;
  role: string;
  role_label: string;
  pending_since?: string;
  query_status?: string;
  reference?: string;
  /** Proposed Branch Details name (NBO/…) — SPA Request ID. */
  request_id?: string;
  /** Desk field request_no_new → New Branch Details (NBI/…) — SPA Property ID. */
  property_id?: string;
}

export interface DashboardHomeRow {
  name?: string;
  zone?: string;
  region?: string;
  area?: string;
  product_line?: string;
  workflow_state?: string;
}

export interface DashboardSummary {
  full_name: string;
  primary_role: string;
  primary_role_label: string;
  generated_at: string;
  kpis: Array<{ id: string; label: string; value: number; path: string }>;
  queues: Array<{ role_label: string; count: number; items: PendingItem[] }>;
  alerts: string[];
  stage_counts?: Array<{ workflow_state: string; label: string; total: number }>;
  home?: GoldLoanHome;
  /** Proposed Branch geography for Properties by Region (preferred over queue items). */
  home_rows?: DashboardHomeRow[];
  /** Business Team: Regional Details × product lines they can raise tickets for. */
  region_access?: {
    product_lines: string[];
    entries: Array<{ product_line: string; zone: string; region: string }>;
  };
}

export interface RequestSummary {
  name: string;
  request_no: string;
  request_id?: string;
  property_id?: string;
  product_line?: string;
  location?: string;
  zone?: string;
  region?: string;
  area?: string;
  workflow_state: string;
  workflow_state_label: string;
  modified?: string;
  owner?: string;
  requester?: string;
  assignee?: string;
  doctype: string;
}

export interface PropertyField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  value: string | number | null;
  read_only: boolean;
}

export interface PropertySection {
  label: string;
  tab: string;
  columns: PropertyField[][];
  fields: PropertyField[];
}

export interface RequestDetail {
  summary: RequestSummary;
  workflow_state: string;
  workflow_state_label: string;
  property: { editable: boolean; fields: PropertyField[]; sections?: PropertySection[] };
  diagnostics: Record<string, unknown> | null;
}

export interface WorkflowAction {
  action: string;
  label: string;
  next_state: string;
  next_state_label: string;
  requires_comment: boolean;
  send_back: boolean;
  blocked: boolean;
  block_reason: string;
}

export interface WorkflowActionResponse {
  doctype: string;
  name: string;
  workflow_state: string;
  workflow_state_label: string;
  modified: string;
  actions: WorkflowAction[];
  query_block_status: {
    blocked: boolean;
    count: number;
    items: Array<{ name: string; query_id: string; subject: string; status: string }>;
    table_field: string;
  };
}

export interface TimelineEntry {
  from_state: string;
  to_state: string;
  from_label?: string;
  to_label: string;
  actor: string;
  timestamp: string;
  kind: string;
}

export interface WorkflowComment {
  name: string;
  user: string;
  timestamp: string;
  comment_type: string;
  content: string;
  subject: string;
  send_back: boolean;
}

export interface QueryItem {
  /** Child row name in the Proposed Branch query table. */
  name: string;
  doctype: string;
  query_id: string;
  table_field: string;
  table_label: string;
  subject: string;
  description: string;
  attachment: string;
  status: string;
  can_respond: boolean;
  can_close: boolean;
  can_reopen: boolean;
  raised_by: string;
  raised_on: string;
  response: string;
  response_attachment: string;
  responded_by: string;
  responded_on: string;
  reopen_reason: string;
  workflow_state: string;
  blocking: boolean;
}

export interface QueryList {
  items: QueryItem[];
  blocking_count: number;
  can_raise: boolean;
  raise_table: string;
  raise_table_label: string;
  responder_options: string[];
}

export interface Paginated<T> {
  total: number;
  start: number;
  page_length: number;
  items: T[];
}

export interface DocumentTypeInfo {
  doctype: string;
  label: string;
  group?: string;
  api?: string;
  has_workflow: boolean;
  states: string[];
  can_create: boolean;
}

export interface RelatedDocument {
  doctype: string;
  doctype_label?: string;
  name: string;
  workflow_state?: string;
  workflow_state_label?: string;
  modified?: string;
}

export interface DocumentColumn {
  fieldname: string;
  label: string;
  fieldtype: string;
}

export interface DocumentListRow {
  name: string;
  modified: string;
  owner: string;
  workflow_state?: string;
  workflow_state_label?: string;
  [fieldname: string]: unknown;
}

export interface DocumentList {
  doctype: string;
  label: string;
  columns: DocumentColumn[];
  items: DocumentListRow[];
  total: number;
  start: number;
  page_length: number;
}

export interface DocumentField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options: string;
  description: string;
  reqd: boolean;
  read_only: boolean;
  value?: unknown;
  /** Allowed values the server lists for a Link field, e.g. product lines. */
  choices?: string[];
  columns?: DocumentColumn[];
  rows?: Array<Record<string, unknown> & { name: string; idx: number }>;
}

export interface DocumentSection {
  label: string;
  tab: string;
  /** Fields split at each Column Break, in DocType field_order. */
  columns?: DocumentField[][];
  fields: DocumentField[];
}

export interface DocumentFormPayload {
  can_write: boolean;
  editable: boolean;
  sections: DocumentSection[];
  workspace_tabs?: string[];
}

export interface DocumentSummary {
  doctype: string;
  doctype_label: string;
  name: string;
  title: string;
  workflow_state: string;
  workflow_state_label: string;
  docstatus: number;
  owner: string;
  creation: string;
  modified: string;
}

export interface DocumentPayload {
  summary: DocumentSummary;
  form: DocumentFormPayload;
  related?: RelatedDocument[];
}

export type FinancialYearChoice = "current" | "last" | "all";

export interface MisRequestRow {
  name: string;
  product_line: string;
  year: string;
  branches_requested: number | string | null;
  workflow_state: string;
  workflow_state_label: string;
  owner: string;
  owner_name: string;
  creation: string;
  modified: string;
  /** Workflow actions Frappe allows the current user on this record. */
  actions: string[];
}

export interface MisRequestSection {
  state: string;
  label: string;
  count: number;
  items: MisRequestRow[];
}

export interface MisDashboard {
  doctype: string;
  fy: FinancialYearChoice;
  fy_options: Array<{ id: FinancialYearChoice; label: string; range: string }>;
  kpis: { total: number; in_progress: number };
  branch_count_label: string;
  recent: MisRequestRow[];
  recent_total: number;
  can_create: boolean;
  /** Desk-style panels grouped by workflow state. */
  sections?: MisRequestSection[];
}

export interface MisRequestList extends Paginated<MisRequestRow> {
  doctype: string;
  fy: FinancialYearChoice;
  status: "all" | "in_progress";
  fy_options: Array<{ id: FinancialYearChoice; label: string; range: string }>;
  workflow_states: Array<{ value: string; label: string }>;
  product_lines: string[];
  branch_count_label: string;
  can_create: boolean;
  kpis: { total: number; in_progress: number };
}

export interface MisCreateForm {
  doctype: string;
  year: string;
  year_label: string;
  product_lines: string[];
  branch_count_field: string;
  branch_count_label: string;
  product_field: string;
  year_field: string;
}

export interface DocumentActivity {
  comments: WorkflowComment[];
  current_state: string;
  current_state_label: string;
  entries: TimelineEntry[];
}
