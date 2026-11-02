import { callMethod } from "@/api/client";
import type { QueryList } from "@/types/api";

export function getQueries(name: string) {
  return callMethod<QueryList>("infra_ms.portal.queries.get_queries", { name });
}

export interface RaiseQueryInput {
  subject: string;
  description: string;
  respondedBy: string;
}

export function raiseQuery(name: string, input: RaiseQueryInput) {
  return callMethod<{ name: string; query_id: string; table_field: string }>(
    "infra_ms.portal.queries.raise_query",
    { name, subject: input.subject, description: input.description, responded_by: input.respondedBy },
    "post",
  );
}

export function respondToQuery(name: string, queryName: string, response: string) {
  return callMethod<{ name: string; query_id: string }>(
    "infra_ms.portal.queries.respond_to_query",
    { name, query_name: queryName, response },
    "post",
  );
}

export function resolveQuery(name: string, queryName: string, comment: string) {
  return callMethod<{ name: string; status: string }>(
    "infra_ms.portal.queries.resolve_query",
    { name, query_name: queryName, comment },
    "post",
  );
}

export function reopenQuery(name: string, queryName: string, reason: string) {
  return callMethod<{ name: string; status: string }>(
    "infra_ms.portal.queries.reopen_query",
    { name, query_name: queryName, reason },
    "post",
  );
}
