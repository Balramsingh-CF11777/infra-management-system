import { callMethod } from "@/api/client";
import type { DocumentPayload } from "@/types/api";

const BASE = "infra_ms.portal.new_branch";

export interface NewBranchCreateOptions {
  doctype: string;
  can_create: boolean;
  product_lines: string[];
  years: string[];
  zones: string[];
  regions: string[];
  areas: string[];
  assignees: Record<string, string>;
}

export interface NewBranchValues {
  year: string;
  product_line: string;
  zone: string;
  region: string;
  area: string;
  location_details: string;
  /** When true, Submit skips Proposed Branch; Lead Request competition path. */
  lead_competition?: 0 | 1 | boolean;
}

export function getNewBranchCreateOptions(filters: { product_line?: string; zone?: string; region?: string } = {}) {
  return callMethod<NewBranchCreateOptions>(`${BASE}.get_create_options`, filters);
}

export function createNewBranch(values: NewBranchValues) {
  return callMethod<DocumentPayload>(`${BASE}.create`, { values: JSON.stringify(values) }, "post");
}
