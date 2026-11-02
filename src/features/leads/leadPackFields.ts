export type PackWhen = { key: string; equals: string };

export type PackField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select" | "number";
  options: string[];
  wide?: boolean;
  showWhen?: PackWhen;
  requiredWhen?: PackWhen;
};

export const PROPERTY_PACK: PackField[] = [
  { key: "complete_address_of_the_property", label: "Complete Address Of The Property (With Door No)", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "proposed_floor_level", label: "Proposed Floor Level", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "main_entrance_direction", label: "Main Entrance Direction", kind: "select", options: ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "pin_code", label: "Pin Code (Number)", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "state", label: "State", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "shop_numbers", label: "Shop Numbers", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "geo_latitude", label: "Geo Latitude", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "geo_longitude", label: "Geo Longitude", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "bound_by_north", label: "Bound By North", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "bound_by_east", label: "Bound By East", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "bound_by_south", label: "Bound By South", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "bound_by_west", label: "Bound By West", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "built_up_area_sqft", label: "Built Up Area Sqft", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "carpet_area_sqft", label: "Carpet Area Sqft", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "basis_of_rent_calculation", label: "Basis Of Rent Calculation", kind: "select", options: ["Lumpsum", "Sqft Basis"], wide: false, showWhen: undefined, requiredWhen: undefined },
];

export const COMMERCIAL_PACK: PackField[] = [
  { key: "monthly_rent", label: "Monthly Rent ", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "security_deposit_amount", label: "Security Deposit Amount", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "maintenance", label: "Maintenance", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rent_per_sq_feet", label: "Rent Per Sq Feet", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "lock_in_period", label: "Lock In Period", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "stamp_duty_and_legal_expense_sharing_ratio_for_registration", label: "Stamp Duty & Legal Expense Sharing Ratio For Registration", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "is_advance_amount_applicable", label: "Is Advance Amount Applicable", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "advance_rent_amount", label: "Advance Rent Amount", kind: "number", options: [], wide: false, showWhen: { key: "is_advance_amount_applicable", equals: "Yes" }, requiredWhen: { key: "is_advance_amount_applicable", equals: "Yes" } },
  { key: "recovery_period_months", label: "Recovery Period (Months)", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rent_free_period_days", label: "Rent Free Period (Days)", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "reimbursement_by_landlord", label: "Reimbursement By Landlord", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "stamp_duty_legal_cost_sharing_ratio", label: "Stamp Duty & Legal Cost Sharing Ratio", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "monthly_fixed_charges_paid", label: "Any Other Monthly Fixed Charges to be Paid", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rent_escalation_percentage", label: "Rent Escalation Percentage", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rent_escalation_months", label: "Rent Escalation Months", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rent_escalation", label: "Rent Escalation", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rent_escalation_basis", label: "Rent Escalation Basis", kind: "select", options: ["On the last paid rent", "On the base rent"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "lease_period", label: "Lease Period", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "lease_exit_notice_period_from_lessee", label: "Lease Exit Notice Period From Lessee", kind: "select", options: ["30 Days", "60 Days", "90 Days"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "property_tax_liability", label: "Property Tax Liability", kind: "select", options: ["Lessor", "Lessee"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "water_sewage_tax_liability", label: "Water/Sewage Tax Liability", kind: "select", options: ["Owner", "Chola", "NA"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "brokerage_applicable", label: "Brokerage Applicable", kind: "select", options: ["No", "Yes"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "brokerage", label: "Brokerage Name", kind: "text", options: [], wide: false, showWhen: { key: "brokerage_applicable", equals: "Yes" }, requiredWhen: { key: "brokerage_applicable", equals: "Yes" } },
  { key: "broker_mobile_number", label: "Broker Mobile Number", kind: "text", options: [], wide: false, showWhen: { key: "brokerage_applicable", equals: "Yes" }, requiredWhen: { key: "brokerage_applicable", equals: "Yes" } },
  { key: "broker_value", label: "Broker Value (\u20b9)", kind: "number", options: [], wide: false, showWhen: { key: "brokerage_applicable", equals: "Yes" }, requiredWhen: { key: "brokerage_applicable", equals: "Yes" } },
];

export const FACILITY_PACK: PackField[] = [
  { key: "furnished_or_unfurnished_office", label: "Furnished/Unfurnished Office", kind: "select", options: ["Unfurnished", "Furnished", "Semi Furnished"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "electricity_load_in_kva", label: "Electricity Load In KVA", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "wiring_to_be_provided_till_db_box_in_our_premises", label: "Wiring To Be Provided Till DB Box In Our Premises", kind: "select", options: ["Lessor", "Lessee"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "water_line_specify_source", label: "Water Line Specify Source", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "sewer_line_specify_source", label: "Sewer Line Specify Source", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "parking_space_or_area", label: "Parking Space or Area", kind: "select", options: ["Reserved", "Common"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "parking_type", label: "Parking Type", kind: "select", options: ["Two Wheeler", "Four Wheeler"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "parking_number_of_two_wheeler", label: "Parking Number Of Two Wheeler", kind: "number", options: [], wide: false, showWhen: { key: "parking_type", equals: "Two Wheeler" }, requiredWhen: { key: "parking_type", equals: "Two Wheeler" } },
  { key: "parking_number_of_four_wheeler", label: "Parking Number Of Four Wheeler", kind: "number", options: [], wide: false, showWhen: { key: "parking_type", equals: "Four Wheeler" }, requiredWhen: { key: "parking_type", equals: "Four Wheeler" } },
  { key: "number_of_exclusive_toilets_available", label: "Number Of Exclusive Toilets Available", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "flooring_available_vitrifies_tile_or_ceramic_tile_or_carpet", label: "Flooring Available- Vitrifies Tile/Ceramic Tile/Carpet/Others", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "availability_of_fire_exit", label: "Availability Of Fire Exit", kind: "select", options: ["Available", "Not Available"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "furnished_status", label: "Furnished Status", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "electrical_data_cabling_available", label: "Electrical/Data Cabling Available", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "additional_load_sd_liability", label: "Additional Load SD Liability", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "refund_applicable", label: "Refund Applicable", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "wiring_till_db_box", label: "Wiring till DB Box", kind: "select", options: ["Lessor", "Lessee"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "space_creation_details", label: "Space Creation Details", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "fire_exit_available", label: "Fire Exit Available", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "signage_space_and_location_details", label: "Signage Space And Location Details", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "lift_availability", label: "Lift Availability", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rolling_shutter_in_the_front", label: "Rolling Shutter In The Front", kind: "select", options: ["Available", "To be Provided"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "space_for_generator_set", label: "Space For Generator Set", kind: "select", options: ["Available", "Not Available"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "is_space_for_generator_rent_free", label: "Is Space For Generator Rent Free", kind: "select", options: ["Yes", "No"], wide: false, showWhen: { key: "space_for_generator_set", equals: "Available" }, requiredWhen: { key: "space_for_generator_set", equals: "Available" } },
  { key: "earth_points", label: "Earth Points", kind: "select", options: ["Available", "Not Available"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "specify_space_for_ac_outdoor_unit", label: "Specify Space For AC Outdoor Unit", kind: "textarea", options: [], wide: true, showWhen: undefined, requiredWhen: undefined },
  { key: "availability_of_space_for_rf_pole", label: "Availability Of Space For RF Pole", kind: "select", options: ["Available", "Not Available"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "is_space_for_rf_pole_rent_free", label: "Is Space For RF Pole Rent Free", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "availability_of_electrical_or_data_or_voice_cabling", label: "Availability Of Electrical or Data or Voice Cabling", kind: "select", options: ["Available", "Yet to be provided"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "windows_with_safety_grills", label: "Windows With Safety Grills", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "availability_of_pantry", label: "Availability Of Pantry", kind: "select", options: ["Available", "Not Available"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "total_no_of_floors_in_the_building", label: "Total No Of Floors In The Building", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "power_backup_available", label: "Power Backup Available", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "power_backup_charges_type", label: "Power Backup Charges Type", kind: "text", options: [], wide: false, showWhen: undefined, requiredWhen: { key: "power_backup_available", equals: "Yes" } },
  { key: "rf_pole_space_available", label: "RF Pole Space Available", kind: "select", options: ["Yes", "No"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "rf_pole_rent_amount", label: "RF Pole Rent Amount", kind: "number", options: [], wide: false, showWhen: { key: "rf_pole_space_available", equals: "Yes" }, requiredWhen: { key: "rf_pole_space_available", equals: "Yes" } },
  { key: "flooring_type", label: "Flooring Type", kind: "select", options: ["Vitrifies Tile", "Ceramic Tile", "Carpet", "Others"], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "distance_indoor_to_outdoor_meters", label: "Distance Indoor to Outdoor (Meters)", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
  { key: "exclusive_toilets_count", label: "Exclusive Toilets Count", kind: "number", options: [], wide: false, showWhen: undefined, requiredWhen: undefined },
];
