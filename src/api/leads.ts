import { callMethod, isPortalMissing } from "@/api/client";
import { fileToBase64 } from "@/lib/files";
import type {
  LeadCreatePayload,
  LeadHomeData,
  LeadSummary,
  RibPipelineOverview,
  RibpOption,
} from "@/features/leads/types";

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

const EMPTY_RIB_PIPELINE: RibPipelineOverview = {
  buckets: [
    { id: "lead_creation", label: "Lead Creation", count: 0 },
    { id: "site_verification", label: "Site Verification", count: 0 },
    { id: "design_sketch", label: "Design Sketch", count: 0 },
    { id: "cad_consent", label: "CAD Consent", count: 0 },
    { id: "ll_agreement", label: "LL Agreement", count: 0 },
    { id: "infra_readiness", label: "Infra Readiness", count: 0 },
  ],
  assigned_tasks: [],
};

export async function getRibPipelineOverview(): Promise<RibPipelineOverview> {
  // Do not swallow errors into all-zero cards — that made Pipeline Overview flicker 0 vs real counts.
  const data = await callMethod<RibPipelineOverview>("infra_ms.portal.lead_request.get_rib_pipeline_overview", {});
  if (!data?.buckets?.length) {
    throw new Error("Pipeline overview returned no stage buckets.");
  }
  return {
    buckets: data.buckets,
    assigned_tasks: data.assigned_tasks ?? [],
  };
}

export { EMPTY_RIB_PIPELINE };

export async function listLeads(filters?: {
  workflow_state?: string;
  location_details?: string;
  area?: string;
  region?: string;
  geo_state?: string;
  pipeline?: string;
  rim?: string;
  demo?: boolean;
}): Promise<LeadSummary[]> {
  if (filters?.demo) {
    const states = (filters.workflow_state || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return DEMO_BRANCH_LEADS.filter((row) => {
      if (filters.location_details && row.location_details !== filters.location_details) return false;
      if (filters.area && row.area !== filters.area) return false;
      if (filters.region && row.region !== filters.region) return false;
      if (filters.geo_state && row.state !== filters.geo_state && row.zone !== filters.geo_state) return false;
      if (states.length === 1 && row.workflow_state !== states[0]) return false;
      if (states.length > 1 && !states.includes(String(row.workflow_state))) return false;
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

export type LeadProspectSummary = {
  name: string;
  property_id?: string;
  status?: string;
  location_details?: string;
  main_entrance_direction?: string;
  complete_address_of_the_property?: string;
  geo_location?: string;
  geo_latitude?: string;
  geo_longitude?: string;
  checkpoints_complete?: number | boolean;
  converted_lead?: string;
  shortlisting_checklist?: string | Record<string, boolean>;
  additional_attachment?: LeadAttachmentRow[];
};

/** Pre-lead: ARBM shortlisting lives on Lead Prospect until convert_to_lead. */
export async function createProspect(
  payload: LeadCreatePayload,
): Promise<{ name: string; property_id: string; status?: string }> {
  return callMethod("infra_ms.portal.lead_prospect.create_prospect", { payload: JSON.stringify(payload) }, "post");
}

function unpackProspectPack<T extends Record<string, unknown>>(row: T): T {
  const raw = row.property_verification;
  let pack: Record<string, unknown> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) pack = raw as Record<string, unknown>;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) pack = parsed as Record<string, unknown>;
    } catch {
      pack = {};
    }
  }
  const next = { ...row };
  for (const [key, value] of Object.entries(pack)) {
    if (value == null || value === "") continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

export async function getProspect(name: string): Promise<LeadProspectSummary & Record<string, unknown>> {
  const row = await callMethod<LeadProspectSummary & Record<string, unknown>>(
    "infra_ms.portal.lead_prospect.get_prospect",
    { name },
  );
  return unpackProspectPack(row);
}

export async function sendLoiConsentOtp(name: string) {
  return callMethod<{ expires_in: number; mobile: string }>(
    "infra_ms.portal.loi_consent.send_loi_consent_otp",
    { name },
    "post",
  );
}

export async function verifyLoiConsentOtp(name: string, otp: string) {
  return callMethod<{ loi_consent_status: string; loi_consent_otp_verified_on: string }>(
    "infra_ms.portal.loi_consent.verify_loi_consent_otp",
    { name, otp },
    "post",
  );
}

export async function saveProspectPropertyDetails(name: string, values: Record<string, unknown>) {
  return callMethod<{ name: string }>(
    "infra_ms.portal.lead_prospect.save_prospect_property_details",
    { name, values: JSON.stringify(values) },
    "post",
  );
}

export async function listProspects(filters?: {
  status?: string;
  branch_opening_requirement?: string;
  page_length?: number;
}): Promise<LeadProspectSummary[]> {
  const data = await callMethod<{ items: LeadProspectSummary[] }>("infra_ms.portal.lead_prospect.list_prospects", {
    filters: JSON.stringify(filters ?? {}),
  });
  return data?.items ?? [];
}

export async function saveProspectCheckpoints(name: string, checklist: Record<string, boolean>) {
  return callMethod<{
    name: string;
    status: string;
    checkpoints_complete: boolean;
    shortlisting_checklist: Record<string, boolean>;
  }>("infra_ms.portal.lead_prospect.save_prospect_checkpoints", { name, checklist: JSON.stringify(checklist) }, "post");
}

export async function convertProspectToLead(
  name: string,
): Promise<{
  name: string;
  property_id: string;
  prospect: string;
  already_converted?: boolean;
  workflow_state?: string;
  proposed_branch?: string;
  awaiting_rim?: boolean;
}> {
  return callMethod("infra_ms.portal.lead_prospect.convert_to_lead", { name }, "post");
}

export async function saveProspectSiteImageAttachment(input: {
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
  }>("infra_ms.portal.lead_prospect.save_prospect_site_image_attachment", input, "post");
}

export async function uploadProspectDocument(name: string, documentType: string, file: File) {
  const dms = await uploadLeadDmsFile(file, documentType);
  return saveProspectSiteImageAttachment({
    name,
    document_type: documentType,
    document_attachment: dms.file_url,
    dmsid: dms.dmsid,
    file_name: dms.file_name,
  });
}

export async function removeProspectDocument(name: string, documentType: string) {
  return callMethod<{ name: string; rows?: LeadAttachmentRow[] }>(
    "infra_ms.portal.lead_prospect.remove_prospect_document",
    { name, document_type: documentType },
    "post",
  );
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
export async function uploadProspectChecklistDocument(
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
    "infra_ms.portal.lead_prospect.save_prospect_checklist_document",
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
  /** Onsite Vetting checklist — saved in the same request as Submit/Approve. */
  checks?: Record<string, unknown>;
  /** Property / owner pack fields — saved in the same request as Submit/Approve. */
  values?: Record<string, unknown>;
}): Promise<{ name: string; section: string; status: string; approved_by?: string; workflow_state: string }> {
  const { checks, values, ...rest } = args;
  return callMethod(
    "infra_ms.portal.lead_request.apply_section_review",
    {
      ...rest,
      checks: checks ? JSON.stringify(checks) : undefined,
      values: values ? JSON.stringify(values) : undefined,
    },
    "post",
  );
}

export async function applyLeadWorkflowAction(args: {
  name: string;
  action: string;
  comment?: string;
}): Promise<{ name: string; workflow_state: string; proposed_branch?: string }> {
  return callMethod("infra_ms.portal.lead_request.apply_lead_workflow_action", args, "post");
}
