import { callMethod } from "@/api/client";
import type {
  DocumentActivity,
  DocumentList,
  DocumentPayload,
  RelatedDocument,
  WorkflowActionResponse,
} from "@/types/api";

/** Bound Frappe methods for each request DocType. Proposed Branch keeps its own module. */
export const RECORD_API: Record<string, string> = {
  "New Branch Details": "infra_ms.portal.new_branch",
  "MIS Product Wise Branch Initiate": "infra_ms.portal.mis_product",
  "MIS New Branch Initiation": "infra_ms.portal.mis_allocation",
  "Branch Layout Details": "infra_ms.portal.branch_layout",
  "BAZ Vendor Code Creation": "infra_ms.portal.baz_vendor",
  "PO Status Confirmation Details": "infra_ms.portal.po_status",
  "PO Payment Advance Release Details": "infra_ms.portal.po_advance",
  "Branch Interior Work Status": "infra_ms.portal.interior",
  "Branch Rejected Details": "infra_ms.portal.rejected",
  "Query Log Details": "infra_ms.portal.query_log_details",
};

function method(doctype: string, name: string, generic: string) {
  const base = RECORD_API[doctype];
  return base ? `${base}.${name}` : `infra_ms.portal.documents.${generic}`;
}

export interface RecordListFilters {
  search?: string;
  workflow_state?: string;
  start?: number;
  page_length?: number;
}

export function getRecordList(doctype: string, filters: RecordListFilters) {
  const base = RECORD_API[doctype];
  if (base) return callMethod<DocumentList>(`${base}.get_list`, filters as Record<string, unknown>);
  return callMethod<DocumentList>("infra_ms.portal.documents.get_document_list", { doctype, ...filters });
}

export function getRecord(doctype: string, name: string) {
  const base = RECORD_API[doctype];
  if (base) return callMethod<DocumentPayload>(`${base}.get`, { name });
  return callMethod<DocumentPayload>("infra_ms.portal.documents.get_document", { doctype, name });
}

export function saveRecord(doctype: string, name: string, values: Record<string, unknown>, expectedModified?: string) {
  return callMethod<DocumentPayload>(
    method(doctype, "save", "save_document"),
    RECORD_API[doctype]
      ? { name, values: JSON.stringify(values), expected_modified: expectedModified }
      : { doctype, name, values: JSON.stringify(values), expected_modified: expectedModified },
    "post",
  );
}

export function uploadRecordAttachment(doctype: string, name: string, fieldname: string, file: File, expectedModified?: string) {
  const form = new FormData();
  if (!RECORD_API[doctype]) form.append("doctype", doctype);
  form.append("name", name);
  form.append("fieldname", fieldname);
  if (expectedModified) form.append("expected_modified", expectedModified);
  form.append("file", file, file.name);
  return callMethod<DocumentPayload>(method(doctype, "upload_attachment", "upload_document_attachment"), form, "post");
}

export function getRecordActions(doctype: string, name: string) {
  const base = RECORD_API[doctype];
  if (base) return callMethod<WorkflowActionResponse>(`${base}.get_actions`, { name });
  return callMethod<WorkflowActionResponse>("infra_ms.portal.documents.get_document_actions", { doctype, name });
}

export function executeRecordAction(input: {
  doctype: string;
  name: string;
  action: string;
  comment?: string;
  expectedModified?: string;
  expectedNextState?: string;
}) {
  const base = RECORD_API[input.doctype];
  const args = {
    name: input.name,
    action: input.action,
    comment: input.comment,
    expected_modified: input.expectedModified,
    expected_next_state: input.expectedNextState,
  };
  return callMethod<{ name: string; workflow_state: string; workflow_state_label: string; modified: string }>(
    base ? `${base}.execute_action` : "infra_ms.portal.documents.execute_document_action",
    base ? args : { doctype: input.doctype, ...args },
    "post",
  );
}

export function getRecordActivity(doctype: string, name: string) {
  const base = RECORD_API[doctype];
  if (base) return callMethod<DocumentActivity>(`${base}.get_activity`, { name });
  return callMethod<DocumentActivity>("infra_ms.portal.documents.get_document_activity", { doctype, name });
}

export function getRecordRelated(doctype: string, name: string) {
  const base = RECORD_API[doctype];
  if (base) return callMethod<{ items: RelatedDocument[] }>(`${base}.get_related`, { name });
  return callMethod<{ items: RelatedDocument[] }>("infra_ms.portal.documents.get_related_documents", { doctype, name });
}
