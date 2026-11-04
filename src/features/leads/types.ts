export type LeadWorkflowState =
  | "Draft"
  | "Awaiting Approval"
  | "Re-Work"
  | "On Hold"
  | "Approved"
  | "Rejected";

export interface LeadSummary {
  name: string;
  property_id: string;
  location_details: string;
  area?: string;
  region?: string;
  zone?: string;
  state?: string;
  product_line?: string;
  workflow_state: LeadWorkflowState | string;
  branch_opening_requirement?: string;
  proposed_branch?: string;
  complete_address_of_the_property?: string;
  geo_location?: string;
  geo_latitude?: string;
  geo_longitude?: string;
  initiated_date?: string;
  initiated_by?: string;
  owner?: string;
  arbm_email?: string;
  area_regional_business_manager?: string;
  creation?: string;
  submitted_on?: string;
  approved_on?: string;
  approved_by?: string;
  rejected_on?: string;
  rejected_by?: string;
  rework_comment?: string;
  regional_infra_business_partner?: string;
  onsite_vaastu_check?: number;
  not_low_lying_no_water_logging?: number;
  one_way_main_road?: number;
  min_area_height_rcc_ok?: number;
  no_religious_place_nearby?: number;
  southwest_clear_for_strong_room?: string;
  door_opens_north_or_east?: string;
  southwest_free_from_wet_areas?: string;
  site_verified_on?: string;
  proposed_floor_level?: string;
  pin_code?: string;
  built_up_area_sqft?: string | number;
  carpet_area_sqft?: string | number;
  monthly_rent?: string | number;
  rent_per_sq_feet?: string | number;
  security_deposit_amount?: string | number;
  lease_period?: string | number;
  lock_in_period?: string | number;
  lease_exit_notice_period_from_lessee?: string;
  brokerage_applicable?: string;
  parking_type?: string;
  parking_number_of_two_wheeler?: string | number;
  parking_number_of_four_wheeler?: string | number;
  availability_of_pantry?: string;
  furnished_status?: string;
  electricity_load_in_kva?: string | number;
  power_backup_available?: string;
  lift_availability?: string;
  fire_exit_available?: string;
  total_no_of_floors_in_the_building?: string | number;
  signage_space_and_location_details?: string;
  loi_consent_status?: string;
  loi_draft_attach?: string;
  loi_signed_copy?: string;
  loi_consent_otp_verified_on?: string;
  has_owner_details?: number;
  has_premise_document?: number;
  has_kyc_document?: number;
  has_additional_attachment?: number;
  open_tasks?: string;
  lead_milestones?: Array<{ milestone?: string; status?: string; approved_by?: string }>;
}

export interface LeadDocumentDraft {
  document_type: string;
  file?: File | null;
}

export interface LeadBranchGroup {
  /** Region/area category name (same region collapsed to one row). */
  branch: string;
  area?: string;
  region?: string;
  geo_state?: string;
  lead_count: number;
  /** Distinct locations under this region category. */
  location_count?: number;
}

export interface LeadGeoStateGroup {
  state: string;
  lead_count: number;
  branch_count: number;
}

export interface LeadHomeData {
  total: number;
  rework: number;
  rejected: number;
  approved: number;
  awaiting?: number;
  draft?: number;
  by_branch: LeadBranchGroup[];
  by_geo_state?: LeadGeoStateGroup[];
  leads: LeadSummary[];
}

export type RibPipelineBucketId =
  | "lead_creation"
  | "site_verification"
  | "design_sketch"
  | "cad_consent"
  | "ll_agreement"
  | "infra_readiness";

export interface RibPipelineBucket {
  id: RibPipelineBucketId | string;
  label: string;
  count: number;
}

export interface RibAssignedTask {
  id: string;
  doctype: string;
  property_id: string;
  location: string;
  task: string;
  workflow_state: string;
  href: string;
}

export interface RibPipelineOverview {
  buckets: RibPipelineBucket[];
  assigned_tasks: RibAssignedTask[];
}

export interface LeadCreatePayload {
  branch_opening_requirement: string;
  location_details?: string;
  product_line?: string;
  main_entrance_direction?: string;
  complete_address_of_the_property?: string;
  geo_latitude?: string;
  geo_longitude?: string;
  geo_location?: string;
  map?: string;
  regional_infra_business_partner?: string;
  area_regional_business_manager?: string;
  location_captured_by_role?: string;
  capture_checklist?: Record<string, boolean>;
  documents?: Array<{ document_type: string; document_attachment?: string }>;
}

export interface RibpOption {
  name: string;
  full_name: string;
  email?: string;
}
