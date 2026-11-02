import { callMethod } from "@/api/client";
import type {
  DocumentActivity,
  DocumentList,
  DocumentPayload,
  DocumentTypeInfo,
  RelatedDocument,
  WorkflowActionResponse,
} from "@/types/api";

const BASE = "infra_ms.portal.documents";

export interface DocumentListFilters {
  search?: string;
  workflow_state?: string;
  start?: number;
  page_length?: number;
}

export function getDocumentTypes() {
  return callMethod<{ items: DocumentTypeInfo[] }>(`${BASE}.get_document_types`);
}

export function getDocumentList(doctype: string, filters: DocumentListFilters) {
  return callMethod<DocumentList>(`${BASE}.get_document_list`, { doctype, ...filters });
}

export function getDocument(doctype: string, name: string) {
  return callMethod<DocumentPayload>(`${BASE}.get_document`, { doctype, name });
}

export function saveDocument(doctype: string, name: string, values: Record<string, unknown>, expectedModified?: string) {
  return callMethod<DocumentPayload>(
    `${BASE}.save_document`,
    { doctype, name, values: JSON.stringify(values), expected_modified: expectedModified },
    "post",
  );
}

export function getDocumentActions(doctype: string, name: string) {
  return callMethod<WorkflowActionResponse>(`${BASE}.get_document_actions`, { doctype, name });
}

export function executeDocumentAction(input: {
  doctype: string;
  name: string;
  action: string;
  comment?: string;
  expectedModified?: string;
  expectedNextState?: string;
}) {
  return callMethod<{ name: string; workflow_state: string; workflow_state_label: string; modified: string }>(
    `${BASE}.execute_document_action`,
    {
      doctype: input.doctype,
      name: input.name,
      action: input.action,
      comment: input.comment,
      expected_modified: input.expectedModified,
      expected_next_state: input.expectedNextState,
    },
    "post",
  );
}

export function getDocumentActivity(doctype: string, name: string) {
  return callMethod<DocumentActivity>(`${BASE}.get_document_activity`, { doctype, name });
}

export function getRelatedDocuments(doctype: string, name: string) {
  return callMethod<{ items: RelatedDocument[] }>(`${BASE}.get_related_documents`, { doctype, name });
}
