import { callMethod, isPortalMissing } from "@/api/client";
import { fileToBase64 } from "@/lib/files";
import type { LeadCreatePayload, LeadHomeData, LeadSummary, RibpOption } from "@/features/leads/types";

/** Same DMS handler Desk / vendor-portal use (not a portal wrapper). */
const DMS_UPLOAD_METHOD = "infra_ms.controllers.file.dms_filehandler.upload_file_to_external_server";

const DEMO_HOME: LeadHomeData = {
  total: 7,
  rework: 2,
  rejected: 1,
  approved: 2,
  awaiting: 1,
  draft: 1,
  by_branch: [
    {
      branch: "South Chennai",
      area: "South Chennai",
      region: "Tamil Nadu",
      lead_count: 7,
      location_count: 3,
    },
  ],
  leads: [
    {
      name: "LEAD/GL/CHENNAI/0001",
      property_id: "PRCH-1001",
      location_details: "Ekkatuthangal",
      area: "South Chennai",
      region: "Tamil Nadu",
      workflow_state: "Awaiting Approval",
      submitted_on: "2026-01-05",
      approved_by: "Srinivasan R",
      complete_address_of_the_property: "27th main road, Cream Center Complex",
    },
    {
      name: "LEAD/GL/CHENNAI/0002",
      property_id: "PRCH-1002",
      location_details: "Tharamani",
      area: "South Chennai",
      region: "Tamil Nadu",
      workflow_state: "Re-Work",
      rework_comment: "The Image captured is Blurry & Documents Don't match.",
      complete_address_of_the_property: "27th main road, Cream Center Complex",
    },
  ],
};

const DEMO_BRANCH_LEADS: LeadSummary[] = [
  {
    name: "LEAD/GL/CHENNAI/1003-A",
    property_id: "PRCH-1003",
    location_details: "Ekkatuthangal",
    area: "South Chennai",
    region: "Tamil Nadu",
    workflow_state: "Approved",
    submitted_on: "2026-01-05",
    approved_on: "2026-01-06",
    approved_by: "Vidhya BS",
    complete_address_of_the_property: "27th main road, Cream Center Complex",
  },
  {
    name: "LEAD/GL/CHENNAI/1003-B",
    property_id: "PRCH-1003",
    location_details: "Ekkatuthangal",
    area: "South Chennai",
    region: "Tamil Nadu",
    workflow_state: "Awaiting Approval",
    submitted_on: "2026-01-05",
    approved_by: "Srinivasan R",
    complete_address_of_the_property: "27th main road, Cream Center Complex",
  },
  {
    name: "LEAD/GL/CHENNAI/1003-C",
    property_id: "PRCH-1003",
    location_details: "Ekkatuthangal",
    area: "South Chennai",
    region: "Tamil Nadu",
    workflow_state: "Rejected",
    submitted_on: "2026-01-05",
    rejected_on: "2026-01-05",
    rejected_by: "Aakash Kumar",
    complete_address_of_the_property: "27th main road, Cream Center Complex",
  },
  {
    name: "LEAD/GL/CHENNAI/1003-D",
    property_id: "PRCH-1003",
    location_details: "Ekkatuthangal",
    area: "South Chennai",
    region: "Tamil Nadu",
    workflow_state: "Re-Work",
    submitted_on: "2026-01-05",
    approved_by: "Srinivasan R",
    rework_comment: "The Image captured is Blurry & Documents Don't match.",
    complete_address_of_the_property: "27th main road, Cream Center Complex",
  },
];

function emptyHome(): LeadHomeData {
  return { total: 0, rework: 0, rejected: 0, approved: 0, by_branch: [], by_geo_state: [], leads: [] };
}

export async function getLeadHome(options?: { demo?: boolean }): Promise<LeadHomeData> {
  if (options?.demo) return DEMO_HOME;
  try {
    const data = await callMethod<LeadHomeData>("infra_ms.portal.lead_request.get_lead_home", {});
    return data ?? emptyHome();
  } catch (error) {
    if (isPortalMissing(error) || options?.demo === false) {
      return emptyHome();
    }
    return emptyHome();
  }
}

export async function listLeads(filters?: {
  workflow_state?: string;
  location_details?: string;
  area?: string;
  region?: string;
  geo_state?: string;
  demo?: boolean;
}): Promise<LeadSummary[]> {
  if (filters?.demo) {
    return DEMO_BRANCH_LEADS.filter((row) => {
      if (filters.location_details && row.location_details !== filters.location_details) return false;
      if (filters.area && row.area !== filters.area) return false;
      if (filters.region && row.region !== filters.region) return false;
      if (filters.geo_state && row.state !== filters.geo_state && row.zone !== filters.geo_state) return false;
      if (filters.workflow_state && row.workflow_state !== filters.workflow_state) return false;
      return true;
    });
  }
  try {
    const { demo: _demo, ...rest } = filters ?? {};
    // Frappe whitelist args on GET must be JSON strings — nested objects are dropped/mangled.
    const data = await callMethod<{ items: LeadSummary[] }>("infra_ms.portal.lead_request.list_leads", {
      filters: JSON.stringify(rest),
    });
    return data?.items ?? [];
  } catch {
    return [];
  }
}

export async function saveLeadSiteVerification(name: string, checks: Record<string, unknown>) {
  return callMethod<{ name: string; site_verification_complete: boolean }>(
    "infra_ms.portal.lead_request.save_site_verification",
    { name, checks: JSON.stringify(checks) },
    "post",
  );
}

export async function saveLeadPropertyDetails(name: string, values: Record<string, unknown>) {
  return callMethod<{ name: string }>(
    "infra_ms.portal.lead_request.save_lead_property_details",
    { name, values: JSON.stringify(values) },
    "post",
  );
}

export async function createLead(payload: LeadCreatePayload): Promise<{ name: string; property_id: string }> {
  return callMethod("infra_ms.portal.lead_request.create_lead", { payload: JSON.stringify(payload) }, "post");
}

export async function listRibpOptions(filters?: {
  product_line?: string;
  region?: string;
  requirement?: string;
}): Promise<{ items: RibpOption[]; suggested?: string | null }> {
  const data = await callMethod<{ items: RibpOption[]; suggested?: string | null }>(
    "infra_ms.portal.lead_request.list_regional_infra_business_partners",
    {
      product_line: filters?.product_line || undefined,
      region: filters?.region || undefined,
      requirement: filters?.requirement || undefined,
    },
  );
  return { items: data?.items ?? [], suggested: data?.suggested ?? null };
}

export type LeadAttachmentRow = {
  name?: string;
  document_type?: string;
  document_attachment?: string;
};

export type LeadDmsUploadResult = {
  status?: string;
  dmsid: string;
  file_name: string;
  file_url: string;
  preview_url?: string;
};

/**
 * Upload one file to DMS (vendor-portal pattern):
 * POST FormData → infra_ms.controllers.file.dms_filehandler.upload_file_to_external_server
 */
export async function uploadLeadDmsFile(file: File, attachmentType: string): Promise<LeadDmsUploadResult> {
  const file_data = await fileToBase64(file);
  const form = new FormData();
  form.append("file_data", file_data);
  form.append("file_name", file.name || `${attachmentType.replace(/\s+/g, "-").toLowerCase()}.jpg`);
  form.append("attachment_type", attachmentType || "Site Photos");
  const result = await callMethod<LeadDmsUploadResult>(DMS_UPLOAD_METHOD, form, "post");
  if (!result?.file_url && !result?.dmsid) {
    throw new Error("DMS did not return a file reference.");
  }
  return {
    status: result.status,
    dmsid: result.dmsid || "",
    file_name: result.file_name || file.name,
    file_url: result.file_url || result.dmsid || "",
    preview_url: result.preview_url,
  };
}

/** Persist one DMS URL into Lead Request.additional_attachment (one child row). */
export async function saveLeadSiteImageAttachment(input: {
  name: string;
  document_type: string;
  document_attachment: string;
  dmsid?: string;
  file_name?: string;
}) {
  return callMethod<{
    name: string;
    document_type: string;
    document_attachment: string;
    dmsid?: string;
    rows?: LeadAttachmentRow[];
  }>("infra_ms.portal.lead_request.save_lead_site_image_attachment", input, "post");
}

/** Upload one slot: DMS first, then save that child-table row. */
export async function uploadLeadDocument(name: string, documentType: string, file: File) {
  const dms = await uploadLeadDmsFile(file, documentType);
  return saveLeadSiteImageAttachment({
    name,
    document_type: documentType,
    document_attachment: dms.file_url,
    dmsid: dms.dmsid,
    file_name: dms.file_name,
  });
}

export type LeadChecklistTable = "premise" | "kyc";

/** Upload one property or KYC file, then store it on that child table. */
export async function uploadLeadChecklistDocument(
  name: string,
  table: LeadChecklistTable,
  documentType: string,
  file: File,
) {
  const dms = await uploadLeadDmsFile(file, documentType);
  return callMethod<{
    name: string;
    document_type: string;
    document_attachment: string;
    rows?: LeadAttachmentRow[];
  }>(
    "infra_ms.portal.lead_request.save_lead_checklist_document",
    {
      name,
      table,
      document_type: documentType,
      document_attachment: dms.file_url,
      dmsid: dms.dmsid,
      file_name: dms.file_name || file.name,
    },
    "post",
  );
}

export async function removeLeadChecklistDocument(name: string, table: LeadChecklistTable, documentType: string) {
  return callMethod<{ name: string; rows?: LeadAttachmentRow[] }>(
    "infra_ms.portal.lead_request.remove_lead_checklist_document",
    { name, table, document_type: documentType },
    "post",
  );
}

export async function removeLeadDocument(name: string, documentType: string) {
  return callMethod<{
    name: string;
    rows?: Array<{ document_type?: string; document_attachment?: string }>;
  }>(
    "infra_ms.portal.lead_request.remove_lead_document",
    { name, document_type: documentType },
    "post",
  );
}

export async function getLeadDocumentTypes(): Promise<string[]> {
  try {
    const data = await callMethod<{ items: string[] }>("infra_ms.portal.lead_request.get_lead_document_types");
    return data?.items ?? ["Site Photos"];
  } catch {
    return ["Site Photos"];
  }
}

export async function getLeadDetail(name: string): Promise<LeadSummary & Record<string, unknown>> {
  return callMethod("infra_ms.portal.lead_request.get_lead_detail", { name });
}

export async function applySectionReview(args: {
  name: string;
  section: string;
  action: "Submit" | "Approve" | "Re-Work";
  comment?: string;
}): Promise<{ name: string; section: string; status: string; approved_by?: string; workflow_state: string }> {
  return callMethod("infra_ms.portal.lead_request.apply_section_review", args, "post");
}

export async function applyLeadWorkflowAction(args: {
  name: string;
  action: string;
  comment?: string;
}): Promise<{ name: string; workflow_state: string; proposed_branch?: string }> {
  return callMethod("infra_ms.portal.lead_request.apply_lead_workflow_action", args, "post");
}
