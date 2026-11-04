/** Annexure A — ARBM Property Shortlisting Checklist. Sentences are the SOP benchmark, shortened. */
export const SHORTLISTING_CHECKS = [
  { key: "sl_frontage", title: "Frontage and signage", detail: "Wide frontage with space for the main glow sign board." },
  { key: "sl_owners", title: "Ownership count", detail: "No more than 3 to 4 co-owners." },
  { key: "sl_approvals", title: "Statutory approvals", detail: "Municipal and local approvals are in place." },
  { key: "sl_floor", title: "Floor level", detail: "Ground or an approved floor. Not a mezzanine." },
  { key: "sl_columns", title: "Column layout", detail: "Few columns, in a square or rectangular hall." },
  { key: "sl_parking", title: "Dedicated parking", detail: "Customer and staff parking for two- and four-wheelers." },
  { key: "sl_height", title: "Height and entrance", detail: "10 ft ceiling under an RCC slab. Entrance is 6–7 ft wide." },
  { key: "sl_adjacency", title: "Nearby use", detail: "No bar, liquor shop, lodge, or petrol pump nearby." },
  { key: "sl_locality", title: "Locality and drains", detail: "Commercial area, away from open drains and ditches." },
  { key: "sl_flood", title: "Flood risk", detail: "Not low-lying. No waterlogging or flood history." },
  { key: "sl_walls", title: "Wall finish", detail: "Walls are plastered inside and outside." },
  { key: "sl_utilities", title: "Utilities", detail: "Commercial power, a direct water line, and drainage are sanctioned." },
  { key: "sl_manholes", title: "Internal drains", detail: "No sewage manhole or open drain inside the premise." },
  { key: "sl_structure", title: "Structure", detail: "No dampness, leakage, seepage, or structural cracks." },
  { key: "sl_shutter", title: "Entrance shutter", detail: "One main shutter. Extra openings are closed with partitions." },
  { key: "sl_ground", title: "Ground floor", detail: "Ground-floor frontage on the road." },
  { key: "sl_area", title: "Premise area", detail: "At least 900–1000 sq.ft., with 10 ft clear height and an RCC slab." },
] as const;

export function emptyShortlisting(): Record<string, boolean> {
  const values: Record<string, boolean> = {};
  for (const item of SHORTLISTING_CHECKS) values[item.key] = false;
  return values;
}

/** Annexure B rows that do not already have a site-check field. Saved with the shortlisting answers. */
export const RIM_EXTRA_CHECKS = [
  { key: "rim_network", title: "Mobile network", detail: "Strong signal on site for all major operators." },
  { key: "rim_earthing", title: "Building earthing", detail: "Earth pits are present and in sound condition." },
  { key: "rim_telecom", title: "Telecom infrastructure", detail: "An Airtel or other major tower or pole is nearby." },
  { key: "rim_broadband", title: "Broadband", detail: "BSNL, ACT, Airtel, or fiber service is available." },
  { key: "rim_carpet", title: "Usable carpet area", detail: "Measured usable carpet area matches the space specification." },
  { key: "rim_video", title: "Layout sketch and video", detail: "Walk-through video marks width, length, entrance, pillars, and windows." },
] as const;

export function isRimExtraKey(key: string) {
  return RIM_EXTRA_CHECKS.some((item) => item.key === key);
}

/** Prefer the Lead Request Check fields. Fall back to the stored checklist JSON. */
export function shortlistingFromLead(lead: Record<string, unknown> | null | undefined): Record<string, boolean> {
  const next = shortlistingFrom(lead?.shortlisting_checklist);
  if (!lead) return next;
  for (const item of [...SHORTLISTING_CHECKS, ...RIM_EXTRA_CHECKS]) {
    const raw = lead[item.key];
    if (raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "Yes") next[item.key] = true;
  }
  return next;
}

export function shortlistingFrom(value: unknown): Record<string, boolean> {
  const next: Record<string, boolean> = emptyShortlisting();
  for (const item of RIM_EXTRA_CHECKS) next[item.key] = false;
  let parsed: unknown = value;
  // Unwrap double-encoded JSON strings from older saves.
  for (let i = 0; i < 3; i += 1) {
    if (typeof parsed !== "string" || !parsed.trim()) break;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
      break;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return next;
  const record = parsed as Record<string, unknown>;
  for (const item of SHORTLISTING_CHECKS) {
    const raw = record[item.key];
    next[item.key] = raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "Yes";
  }
  for (const item of RIM_EXTRA_CHECKS) {
    const raw = record[item.key];
    next[item.key] = raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "Yes";
  }
  return next;
}

export function shortlistingComplete(value: Record<string, boolean>) {
  return SHORTLISTING_CHECKS.every((item) => value[item.key]);
}

/** Site checks. Matching Annexure B lines use the SOP benchmark. */
export const SITE_CHECK_CARDS = [
  { key: "onsite_vaastu_check", title: "Main entrance", detail: "The main entrance faces north, east, or west." },
  { key: "not_low_lying_no_water_logging", title: "Flood and waterlogging", detail: "The site is not low-lying and does not waterlog." },
  { key: "one_way_main_road", title: "Road access", detail: "On a one-way road, with easy turning access for customers." },
  { key: "min_area_height_rcc_ok", title: "Area, height, and slab", detail: "At least 900–1000 sq.ft., with 10 ft height and an RCC roof slab." },
  { key: "no_religious_place_nearby", title: "Places of worship", detail: "No religious place is nearby." },
  {
    key: "southwest_clear_for_strong_room",
    title: "Strong room position",
    detail: "South-west is clear and load-certified for a 9-inch RCC strong room, or an approved north-east fallback.",
    productLines: ["GL"] as const,
  },
  { key: "door_opens_north_or_east", title: "Strong-room door", detail: "The door swings outward to the north or east, with nothing in the way." },
  { key: "southwest_free_from_wet_areas", title: "Wet areas", detail: "South-west has no internal drains, sewage manholes, or toilets." },
] as const;

export function siteCheckCardsForLead(lead: Record<string, unknown> | null | undefined) {
  const product = productLineOf(lead);
  const gates = SITE_CHECK_CARDS.filter((item) => item.key !== "southwest_clear_for_strong_room" || product === "GL");
  return [...gates, ...RIM_EXTRA_CHECKS];
}

/** Mandatory Site Verification checks before Lead Approve. */
export const SITE_CHECK_FLAGS = [
  { key: "onsite_vaastu_check", label: "Main entrance faces north, east, or west" },
  { key: "not_low_lying_no_water_logging", label: "Not low-lying / no water-logging" },
  { key: "one_way_main_road", label: "One-way road with easy customer turning" },
  { key: "min_area_height_rcc_ok", label: "Min 900–1000 sqft, 10 ft height, RCC roof slab" },
  { key: "no_religious_place_nearby", label: "No Religious Place Nearby" },
] as const;

export const SITE_CHECK_YES = [
  {
    key: "southwest_clear_for_strong_room",
    label: "South-west clear and load-certified for the strong room",
    productLines: ["GL"] as const,
  },
  { key: "door_opens_north_or_east", label: "Strong-room door swings outward to the north or east" },
  { key: "southwest_free_from_wet_areas", label: "South-west free of drains, manholes, and toilets" },
] as const;

function productLineOf(lead: Record<string, unknown> | null | undefined) {
  return String(lead?.product_line || "").trim().toUpperCase();
}

export function siteCheckYesForLead(lead: Record<string, unknown> | null | undefined) {
  const product = productLineOf(lead);
  return SITE_CHECK_YES.filter((item) => {
    const lines = "productLines" in item ? item.productLines : undefined;
    if (!lines || lines.length === 0) return true;
    return lines.includes(product as (typeof lines)[number]);
  });
}

export function isSiteVerificationComplete(lead: Record<string, unknown> | null | undefined): boolean {
  if (!lead) return false;
  for (const item of SITE_CHECK_FLAGS) {
    if (!Number(lead[item.key])) return false;
  }
  for (const item of siteCheckYesForLead(lead)) {
    if (String(lead[item.key] || "").trim() !== "Yes") return false;
  }
  return true;
}

export function missingSiteVerificationLabels(lead: Record<string, unknown> | null | undefined): string[] {
  const yesChecks = siteCheckYesForLead(lead);
  if (!lead) return [...SITE_CHECK_FLAGS, ...yesChecks].map((item) => item.label);
  const missing: string[] = [];
  for (const item of SITE_CHECK_FLAGS) {
    if (!Number(lead[item.key])) missing.push(item.label);
  }
  for (const item of yesChecks) {
    if (String(lead[item.key] || "").trim() !== "Yes") missing.push(item.label);
  }
  return missing;
}
