import { callMethod, isPortalMissing } from "@/api/client";
import { getCompatRequests } from "@/api/compat";
import { useSession } from "@/stores/session";
import type { Paginated, RelatedDocument, RequestDetail, RequestSummary } from "@/types/api";

export interface RequestFilters {
  search?: string;
  workflow_state?: string;
  product_line?: string;
  zone?: string;
  region?: string;
  /** RIBP Pipeline Overview bucket — same states as card count. */
  pipeline?: string;
  start?: number;
  page_length?: number;
}

export async function getRequests(filters: RequestFilters) {
  const user = useSession.getState().user;
  if (user?.api_mode === "compat") {
    return getCompatRequests(user, filters);
  }
  try {
    return await callMethod<Paginated<RequestSummary> & { doctype: string }>(
      "infra_ms.portal.proposed_branch.get_requests",
      filters as Record<string, unknown>,
    );
  } catch (error) {
    if (!isPortalMissing(error) || !user) throw error;
    return getCompatRequests(user, filters);
  }
}

export function getRequestDetail(name: string) {
  return callMethod<RequestDetail>("infra_ms.portal.proposed_branch.get_request_detail", { name });
}

export function savePropertySection(name: string, values: Record<string, unknown>, expectedModified?: string) {
  return callMethod<{ name: string; modified: string }>(
    "infra_ms.portal.proposed_branch.save_request_section",
    { name, section: "property", values: JSON.stringify(values), expected_modified: expectedModified },
    "post",
  );
}

export function getRelatedDocuments(name: string) {
  return callMethod<{ items: RelatedDocument[] }>(
    "infra_ms.portal.proposed_branch.get_related_documents",
    { name },
  );
}
