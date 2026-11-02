import type { LeadSummary } from "@/features/leads/types";

export type PropertyVerificationStatus = "completed" | "pending";

export type PropertyVerificationModuleId =
  | "property"
  | "owner"
  | "facility"
  | "documents"
  | "loi";

export type PropertyVerificationModule = {
  id: PropertyVerificationModuleId;
  label: string;
  hint: string;
  /** Relative path under `/chola360/leads/:id/` */
  path: string;
};

/** Figma Site Verification Steps (optional before Submit). */
export const PROPERTY_VERIFICATION_MODULES: PropertyVerificationModule[] = [
  {
    id: "property",
    label: "Property Details",
    hint: "Location, Rent & Lease",
    path: "property-details",
  },
  {
    id: "owner",
    label: "Owner Details",
    hint: "Landlord contact & Legal",
    path: "owner-details",
  },
  {
    id: "facility",
    label: "Facility Details",
    hint: "Amenities, utilities and infrastructure",
    path: "facility-details",
  },
  {
    id: "documents",
    label: "Documents",
    hint: "PAN, GST, MSME & Property Docs",
    path: "documents",
  },
  {
    id: "loi",
    label: "LOI Generation & Consent",
    hint: "Generate LOI & capture the consent",
    path: "loi",
  },
];

function filled(value: unknown) {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  return String(value).trim().length > 0;
}

function tableRows(lead: Record<string, unknown>, key: string) {
  const rows = lead[key];
  return Array.isArray(rows) ? rows : [];
}

/** Location + commercial pack from Property Verification mockup — create-only address is not enough. */
export function isPropertyDetailsModuleComplete(lead: Record<string, unknown>) {
  const locationOk =
    filled(lead.complete_address_of_the_property) &&
    filled(lead.proposed_floor_level) &&
    filled(lead.pin_code) &&
    (filled(lead.built_up_area_sqft) || filled(lead.carpet_area_sqft));

  const commercialOk =
    filled(lead.monthly_rent) &&
    filled(lead.rent_per_sq_feet) &&
    filled(lead.security_deposit_amount) &&
    filled(lead.lease_period) &&
    filled(lead.lock_in_period) &&
    filled(lead.lease_exit_notice_period_from_lessee) &&
    filled(lead.brokerage_applicable);

  return locationOk && commercialOk;
}

export function isOwnerDetailsModuleComplete(lead: Record<string, unknown>) {
  return tableRows(lead, "owner_details").some((row) => {
    const item = row as Record<string, unknown>;
    return (
      filled(item.owner_landlord_name) ||
      filled(item.owners_age) ||
      filled(item.owners_father_or_spouse_name) ||
      filled(item.complete_address_of_the_owner) ||
      filled(item.owner_phone_number) ||
      filled(item.owner_email_address) ||
      filled(item.pan_number) ||
      filled(item.gst_number) ||
      filled(item.legal_status) ||
      filled(item.rentsd_payable_percentage)
    );
  });
}

export function isFacilityDetailsModuleComplete(lead: Record<string, unknown>) {
  return (
    filled(lead.parking_type) ||
    filled(lead.parking_number_of_two_wheeler) ||
    filled(lead.parking_number_of_four_wheeler) ||
    filled(lead.availability_of_pantry) ||
    filled(lead.furnished_status) ||
    filled(lead.electricity_load_in_kva) ||
    filled(lead.power_backup_available) ||
    filled(lead.lift_availability) ||
    filled(lead.fire_exit_available) ||
    filled(lead.total_no_of_floors_in_the_building) ||
    filled(lead.signage_space_and_location_details)
  );
}

export function isDocumentsModuleComplete(lead: Record<string, unknown>) {
  const premise = tableRows(lead, "premise_related_document");
  const kyc = tableRows(lead, "kyc_related_documents");
  const extra = tableRows(lead, "additional_attachment");
  return premise.length + kyc.length + extra.length > 0;
}

export function isLoiModuleComplete(lead: Record<string, unknown>) {
  const status = String(lead.loi_consent_status || "").trim().toLowerCase();
  return (
    filled(lead.loi_draft_attach) ||
    filled(lead.loi_signed_copy) ||
    status.includes("consent") ||
    status.includes("verified") ||
    filled(lead.loi_consent_otp_verified_on)
  );
}

export function propertyVerificationStatus(
  id: PropertyVerificationModuleId,
  lead: Record<string, unknown> | LeadSummary | null | undefined,
): PropertyVerificationStatus {
  const row = (lead || {}) as Record<string, unknown>;
  switch (id) {
    case "property":
      return isPropertyDetailsModuleComplete(row) ? "completed" : "pending";
    case "owner":
      return isOwnerDetailsModuleComplete(row) ? "completed" : "pending";
    case "facility":
      return isFacilityDetailsModuleComplete(row) ? "completed" : "pending";
    case "documents":
      return isDocumentsModuleComplete(row) ? "completed" : "pending";
    case "loi":
      return isLoiModuleComplete(row) ? "completed" : "pending";
    default:
      return "pending";
  }
}

export function countCompletedPropertyVerificationModules(
  lead: Record<string, unknown> | LeadSummary | null | undefined,
) {
  return PROPERTY_VERIFICATION_MODULES.filter(
    (module) => propertyVerificationStatus(module.id, lead) === "completed",
  ).length;
}
