/**
 * MIS Product Wise Branch Initiate — uses the shared Frappe APIs already on the site
 * (frappe.client.*, infra_ms.api.get_product_lines, apply_mis_product_wise_branch_workflow_action).
 * Does not require infra_ms.portal.
 */
import { callMethod } from "@/api/client";
import { fyOptions, pbiYear, yearValuesFor } from "@/lib/financialYear";
import { fileToBase64 } from "@/lib/files";
import { displayState } from "@/lib/rules";
import { ApiError, type FinancialYearChoice, type MisCreateForm, type MisDashboard, type MisRequestList, type MisRequestRow, type WorkflowAction } from "@/types/api";

export const MIS_DOCTYPE = "MIS Product Wise Branch Initiate";
const BRANCH_COUNT_FIELD = "new_branch_count_included";
const ATTACHMENTS_FIELD = "attachments";
const DMS_UPLOAD_METHOD = "infra_ms.controllers.file.controller.upload_file_to_external_server";
const WORKFLOW_METHOD =
  "infra_ms.infra_management_system.doctype.mis_product_wise_branch_initiate.mis_product_wise_branch_initiate.apply_mis_product_wise_branch_workflow_action";

export const MIS_DOCUMENT_TYPES = ["Email", "Pdf", "Others"] as const;
export type MisDocumentType = (typeof MIS_DOCUMENT_TYPES)[number];

export interface MisAttachmentDraft {
  id: string;
  document_type: MisDocumentType | "";
  file: File | null;
}

export interface MisAttachmentRow {
  name?: string;
  idx?: number;
  document_type: string;
  attachment: string;
  file_name?: string;
}

export interface DmsUploadResult {
  file_name: string;
  dmsid: string;
  file_url: string;
  preview_url?: string;
  checksum?: string;
  file_size?: number;
  content_type?: string;
}

const PRODUCT_LINE_FALLBACK = ["VF", "LAP", "HL", "HO", "CSEL", "SBPL", "SME", "CSEC", "GL", "Payswiff"];

export interface MisDashboardFilters {
  fy: FinancialYearChoice;
}

export interface MisRequestFilters {
  fy: FinancialYearChoice;
  status: "all" | "in_progress";
  search?: string;
  product_line?: string;
  workflow_state?: string;
  start: number;
  page_length: number;
}

interface FrappeRow {
  name: string;
  product_line?: string;
  year?: string;
  new_branch_count_included?: number | string;
  workflow_state?: string;
  owner?: string;
  creation?: string;
  modified?: string;
  docstatus?: number;
}

function asList(value: unknown): FrappeRow[] {
  return Array.isArray(value) ? (value as FrappeRow[]) : [];
}

function yearFilter(fy: FinancialYearChoice): unknown[] | undefined {
  const values = yearValuesFor(fy);
  if (!values) return undefined;
  return ["year", "in", values];
}

async function fetchRows(filters: unknown[], limitStart = 0, limitPageLength = 200, orFilters?: unknown[]): Promise<FrappeRow[]> {
  const args: Record<string, unknown> = {
    doctype: MIS_DOCTYPE,
    fields: JSON.stringify([
      "name",
      "product_line",
      "year",
      "new_branch_count_included",
      "workflow_state",
      "owner",
      "creation",
      "modified",
      "docstatus",
    ]),
    filters: JSON.stringify(filters),
    order_by: "creation desc",
    limit_start: limitStart,
    limit_page_length: limitPageLength,
  };
  if (orFilters?.length) args.or_filters = JSON.stringify(orFilters);
  return asList(await callMethod<FrappeRow[]>(`frappe.client.get_list`, args));
}

async function countRows(filters: unknown[], orFilters?: unknown[]): Promise<number> {
  const args: Record<string, unknown> = {
    doctype: MIS_DOCTYPE,
    filters: JSON.stringify(filters),
  };
  if (orFilters?.length) args.or_filters = JSON.stringify(orFilters);
  try {
    const total = await callMethod<number>("frappe.client.get_count", args);
    return Number(total) || 0;
  } catch {
    const rows = await fetchRows(filters, 0, 500, orFilters);
    return rows.length;
  }
}

function toRow(row: FrappeRow, actions: string[] = []): MisRequestRow {
  const state = row.workflow_state || "";
  return {
    name: row.name,
    product_line: row.product_line || "",
    year: row.year || "",
    branches_requested: row.new_branch_count_included ?? null,
    workflow_state: state,
    workflow_state_label: displayState(state) || state || "Draft",
    owner: row.owner || "",
    owner_name: row.owner || "",
    creation: row.creation || "",
    modified: row.modified || "",
    actions,
  };
}

function baseFilters(fy: FinancialYearChoice): unknown[] {
  const filters: unknown[] = [];
  const year = yearFilter(fy);
  if (year) filters.push(year);
  return filters;
}

function inProgressFilters(fy: FinancialYearChoice): unknown[] {
  return [...baseFilters(fy), ["workflow_state", "!=", "Complete"], ["docstatus", "!=", 2]];
}

async function loadActionsFor(names: string[]): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  await Promise.all(
    names.slice(0, 12).map(async (name) => {
      try {
        const doc = await callMethod<Record<string, unknown>>("frappe.client.get", { doctype: MIS_DOCTYPE, name });
        const transitions = await callMethod<Array<{ action?: string }>>("frappe.model.workflow.get_transitions", { doc: JSON.stringify(doc) }, "post");
        out[name] = Array.from(new Set((transitions || []).map((row) => row.action || "").filter(Boolean)));
      } catch {
        out[name] = [];
      }
    }),
  );
  return out;
}

export async function getMisDashboard(filters: MisDashboardFilters): Promise<MisDashboard> {
  const fy = filters.fy || "current";
  const [allRows, total, inProgress] = await Promise.all([
    fetchRows(baseFilters(fy), 0, 80),
    countRows(baseFilters(fy)),
    countRows(inProgressFilters(fy)),
  ]);
  const recent = allRows.slice(0, 5);
  const actions = await loadActionsFor(recent.map((row) => row.name));
  return {
    doctype: MIS_DOCTYPE,
    fy,
    fy_options: fyOptions(),
    kpis: { total, in_progress: inProgress },
    branch_count_label: "New Branch Count Included",
    recent: recent.map((row) => toRow(row, actions[row.name] || [])),
    recent_total: total,
    can_create: true,
    sections: groupByState(allRows, actions),
  };
}

function groupByState(rows: FrappeRow[], actions: Record<string, string[]>) {
  const order = ["Draft", "Approval Pending", "Complete"];
  const buckets = new Map<string, MisRequestRow[]>();
  for (const state of order) buckets.set(state, []);
  for (const row of rows) {
    const state = row.workflow_state || "Draft";
    const key = order.includes(state) ? state : "Other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(toRow(row, actions[row.name] || []));
  }
  return order
    .concat(buckets.has("Other") ? ["Other"] : [])
    .filter((state) => (buckets.get(state) || []).length > 0)
    .map((state) => ({
      state,
      label: displayState(state) || state,
      count: (buckets.get(state) || []).length,
      items: buckets.get(state) || [],
    }));
}

export async function getMisRequests(filters: MisRequestFilters): Promise<MisRequestList> {
  const fy = filters.fy || "current";
  const listFilters = filters.status === "in_progress" ? inProgressFilters(fy) : baseFilters(fy);
  if (filters.product_line) listFilters.push(["product_line", "=", filters.product_line]);
  if (filters.workflow_state) listFilters.push(["workflow_state", "=", filters.workflow_state]);
  const search = filters.search?.trim();
  const orFilters = search
    ? [
        ["name", "like", `%${search}%`],
        ["product_line", "like", `%${search}%`],
      ]
    : undefined;
  const [items, total, allForProducts, inProgress] = await Promise.all([
    fetchRows(listFilters, filters.start, filters.page_length, orFilters),
    countRows(listFilters, orFilters),
    fetchRows(baseFilters(fy), 0, 200),
    countRows(inProgressFilters(fy)),
  ]);
  const actions = await loadActionsFor(items.map((row) => row.name));
  const productLines = Array.from(new Set(allForProducts.map((row) => row.product_line || "").filter(Boolean))).sort();
  const states = Array.from(new Set(allForProducts.map((row) => row.workflow_state || "").filter(Boolean))).sort();
  return {
    doctype: MIS_DOCTYPE,
    fy,
    status: filters.status,
    fy_options: fyOptions(),
    workflow_states: states.map((value) => ({ value, label: displayState(value) || value })),
    product_lines: productLines,
    branch_count_label: "New Branch Count Included",
    items: items.map((row) => toRow(row, actions[row.name] || [])),
    total,
    start: filters.start,
    page_length: filters.page_length,
    can_create: true,
    kpis: { total: await countRows(baseFilters(fy)), in_progress: inProgress },
  };
}

export async function getMisCreateForm(): Promise<MisCreateForm> {
  let productLines = PRODUCT_LINE_FALLBACK;
  try {
    const fromApi = await callMethod<unknown>("infra_ms.api.get_product_lines");
    if (Array.isArray(fromApi) && fromApi.length) {
      productLines = fromApi.map((item) => (typeof item === "string" ? item : String((item as { name?: string }).name || ""))).filter(Boolean);
    }
  } catch {
    // use fallback
  }
  const year = pbiYear();
  return {
    doctype: MIS_DOCTYPE,
    year,
    year_label: `FY ${year}`,
    product_lines: productLines,
    branch_count_field: BRANCH_COUNT_FIELD,
    branch_count_label: "New Branch Count Included",
    product_field: "product_line",
    year_field: "year",
  };
}

export async function uploadMisDmsFile(input: {
  file: File;
  document_type: string;
  reference_name?: string;
}): Promise<DmsUploadResult> {
  const file_data = await fileToBase64(input.file);
  return callMethod<DmsUploadResult>(
    DMS_UPLOAD_METHOD,
    {
      file_data,
      file_name: input.file.name,
      attachment_type: input.document_type || "Document Attachment",
      reference_doctype: input.reference_name ? MIS_DOCTYPE : undefined,
      reference_name: input.reference_name || undefined,
    },
    "post",
  );
}

async function linkDmsFile(name: string, uploaded: DmsUploadResult) {
  try {
    await callMethod(
      "frappe.client.insert",
      {
        doc: {
          doctype: "File",
          file_name: uploaded.file_name,
          file_url: uploaded.file_url,
          content_hash: uploaded.dmsid,
          attached_to_doctype: MIS_DOCTYPE,
          attached_to_name: name,
          is_private: 1,
        },
      },
      "post",
    );
  } catch {
    // File row is preferred for DMS download ACL; child table URL still works for display.
  }
}

export async function uploadMisAttachmentDrafts(name: string, drafts: MisAttachmentDraft[]): Promise<MisAttachmentRow[]> {
  const ready = drafts.filter((row) => row.document_type && row.file);
  const rows: MisAttachmentRow[] = [];
  for (const draft of ready) {
    const uploaded = await uploadMisDmsFile({
      file: draft.file!,
      document_type: draft.document_type,
      reference_name: name,
    });
    await linkDmsFile(name, uploaded);
    rows.push({
      document_type: draft.document_type,
      attachment: uploaded.file_url,
      file_name: uploaded.file_name,
    });
  }
  return rows;
}

export async function saveMisAttachments(name: string, drafts: MisAttachmentDraft[]) {
  const rows = await uploadMisAttachmentDrafts(name, drafts);
  if (!rows.length) return [];

  const parent = await callMethod<Record<string, unknown>>("frappe.client.get", { doctype: MIS_DOCTYPE, name });
  const existing = Array.isArray(parent[ATTACHMENTS_FIELD]) ? (parent[ATTACHMENTS_FIELD] as Record<string, unknown>[]) : [];
  parent[ATTACHMENTS_FIELD] = [
    ...existing,
    ...rows.map((row, index) => ({
      document_type: row.document_type,
      attachment: row.attachment,
      idx: existing.length + index + 1,
    })),
  ];
  await callMethod("frappe.client.save", { doc: parent }, "post");
  return rows;
}

export async function updateMisRequest(input: {
  name: string;
  product_line: string;
  new_branch_count_included: number;
  keep_attachments?: MisAttachmentRow[];
  new_attachments?: MisAttachmentDraft[];
}) {
  const productLine = String(input.product_line || "").trim();
  const branchCount = Number(input.new_branch_count_included);
  if (!productLine) throw new ApiError("Choose a product line.", "VALIDATION", 422, { fields: ["product_line"] });
  if (!Number.isFinite(branchCount) || branchCount <= 0) {
    throw new ApiError(
      "New Branch Count Included must be greater than 0. Please enter at least 1 branch before saving the request.",
      "VALIDATION",
      422,
      { fields: [BRANCH_COUNT_FIELD] },
    );
  }
  const drafts = input.new_attachments || [];
  for (const row of drafts) {
    if (row.document_type && !row.file) {
      throw new ApiError("Attach a file for each Document Type row.", "VALIDATION", 422, { fields: ["attachments"] });
    }
    if (row.file && !row.document_type) {
      throw new ApiError("Choose a Document Type for each attachment.", "VALIDATION", 422, { fields: ["attachments"] });
    }
  }

  const parent = await callMethod<Record<string, unknown>>("frappe.client.get", { doctype: MIS_DOCTYPE, name: input.name });
  const state = String(parent.workflow_state || "Draft");
  if (state !== "Draft") {
    throw new ApiError("Only Draft requests can be edited.", "VALIDATION", 403);
  }

  const uploaded = await uploadMisAttachmentDrafts(input.name, drafts);
  const kept = input.keep_attachments || parseAttachmentRows(parent);
  parent.product_line = productLine;
  parent[BRANCH_COUNT_FIELD] = branchCount;
  parent[ATTACHMENTS_FIELD] = [...kept, ...uploaded].map((row, index) => ({
    name: row.name,
    document_type: row.document_type,
    attachment: row.attachment,
    idx: index + 1,
  }));
  await callMethod("frappe.client.save", { doc: parent }, "post");
  return getMisRequest(input.name);
}

function parseAttachmentRows(doc: Record<string, unknown>): MisAttachmentRow[] {
  const raw = doc[ATTACHMENTS_FIELD];
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = row as Record<string, unknown>;
    const attachment = String(item.attachment || item.attach || "");
    return {
      name: item.name ? String(item.name) : undefined,
      idx: Number(item.idx || index + 1),
      document_type: String(item.document_type || ""),
      attachment,
      file_name: String(item.file_name || "").trim() || undefined,
    };
  });
}

export async function createMisRequest(values: Record<string, unknown>, attachments: MisAttachmentDraft[] = []) {
  const productLine = String(values.product_line || "").trim();
  const branchCount = Number(values[BRANCH_COUNT_FIELD] ?? values.new_branch_count_included);
  if (!productLine) throw new ApiError("Choose a product line.", "VALIDATION", 422, { fields: ["product_line"] });
  if (!Number.isFinite(branchCount) || branchCount <= 0) {
    throw new ApiError(
      "New Branch Count Included must be greater than 0. Please enter at least 1 branch before saving the request.",
      "VALIDATION",
      422,
      { fields: [BRANCH_COUNT_FIELD] },
    );
  }
  for (const row of attachments) {
    if (row.document_type && !row.file) {
      throw new ApiError("Attach a file for each Document Type row.", "VALIDATION", 422, { fields: ["attachments"] });
    }
    if (row.file && !row.document_type) {
      throw new ApiError("Choose a Document Type for each attachment.", "VALIDATION", 422, { fields: ["attachments"] });
    }
  }
  const doc = await callMethod<Record<string, unknown>>(
    "frappe.client.insert",
    {
      doc: {
        doctype: MIS_DOCTYPE,
        product_line: productLine,
        year: pbiYear(),
        [BRANCH_COUNT_FIELD]: branchCount,
      },
    },
    "post",
  );
  const name = String(doc.name);
  if (attachments.some((row) => row.document_type && row.file)) {
    await saveMisAttachments(name, attachments);
  }
  return {
    name,
    summary: {
      doctype: MIS_DOCTYPE,
      doctype_label: "MIS Product Wise Branch",
      name,
      title: name,
      workflow_state: String(doc.workflow_state || "Draft"),
      workflow_state_label: displayState(String(doc.workflow_state || "Draft")) || "Draft",
      docstatus: Number(doc.docstatus || 0),
      owner: String(doc.owner || ""),
      creation: String(doc.creation || ""),
      modified: String(doc.modified || ""),
    },
  };
}

export interface MisRequestDetail {
  name: string;
  product_line: string;
  year: string;
  branches_requested: number | string | null;
  workflow_state: string;
  workflow_state_label: string;
  owner: string;
  creation: string;
  modified: string;
  comment: string;
  docstatus: number;
  attachments: MisAttachmentRow[];
  doc: Record<string, unknown>;
}

export async function getMisRequest(name: string): Promise<MisRequestDetail> {
  const doc = await callMethod<Record<string, unknown>>("frappe.client.get", { doctype: MIS_DOCTYPE, name });
  const state = String(doc.workflow_state || "Draft");
  return {
    name: String(doc.name || name),
    product_line: String(doc.product_line || ""),
    year: String(doc.year || ""),
    branches_requested: (doc.new_branch_count_included as number | string | null) ?? null,
    workflow_state: state,
    workflow_state_label: displayState(state) || state,
    owner: String(doc.owner || ""),
    creation: String(doc.creation || ""),
    modified: String(doc.modified || ""),
    comment: String(doc.comment || doc.transition_comment || ""),
    docstatus: Number(doc.docstatus || 0),
    attachments: parseAttachmentRows(doc),
    doc,
  };
}

export async function getMisWorkflowActions(name: string): Promise<{ modified: string; actions: WorkflowAction[]; doc: Record<string, unknown> }> {
  const doc = await callMethod<Record<string, unknown>>("frappe.client.get", { doctype: MIS_DOCTYPE, name });
  const transitions = await callMethod<Array<{ action?: string; next_state?: string }>>(
    "frappe.model.workflow.get_transitions",
    { doc: JSON.stringify(doc) },
    "post",
  );
  return {
    modified: String(doc.modified || ""),
    doc,
    actions: (transitions || []).map((transition) => ({
      action: transition.action || "",
      label: transition.action || "",
      next_state: transition.next_state || "",
      next_state_label: displayState(transition.next_state || "") || transition.next_state || "",
      requires_comment: false,
      send_back: /reject|send.?back/i.test(transition.action || ""),
      blocked: false,
      block_reason: "",
    })),
  };
}

export async function executeMisWorkflowAction(input: { name: string; action: string; comment?: string; doc?: Record<string, unknown> }) {
  const doc = input.doc || (await callMethod<Record<string, unknown>>("frappe.client.get", { doctype: MIS_DOCTYPE, name: input.name }));
  const result = await callMethod<Record<string, unknown>>(
    WORKFLOW_METHOD,
    {
      doc: JSON.stringify(doc),
      action: input.action,
      transition_comment: input.comment || "",
    },
    "post",
  );
  const state = String(result.workflow_state || result.to_state || "");
  return {
    name: input.name,
    workflow_state: state,
    workflow_state_label: displayState(state) || state,
    modified: String(result.modified || ""),
  };
}

/** Desk form URL when the portal document page is unavailable. */
export function misDeskPath(name: string): string {
  return `/app/mis-product-wise-branch-initiate/${encodeURIComponent(name)}`;
}
