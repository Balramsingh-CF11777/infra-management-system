/**
 * Desk Regional Details style mapping: master Region → Zone ID (East/West/North/South).
 * Used to autofill Zone when Business Team opens create from a region card.
 * Authoritative zone for a product/region still comes from Frappe Regional Details (fk_zoneid).
 */

export type InfraZone = "East" | "West" | "North" | "South";

/** Featured dashboard card id → default Zone ID. */
export const FEATURED_REGION_ZONES: Record<string, InfraZone> = {
  "andhra-telangana": "South",
  karnataka: "South",
  tamilnadu: "South",
  kerala: "South",
  "west-bengal": "East",
  maharashtra: "West",
  gujarat: "West",
  "madhya-pradesh": "West",
  rajasthan: "North",
  "uttar-pradesh": "North",
  uttarakhand: "North",
  bihar: "East",
  jharkhand: "East",
  odisha: "East",
  chhattisgarh: "East",
  delhi: "North",
  haryana: "North",
  "punjab-hills": "North",
  "north-east": "East",
};

/** Exact / prefix master region labels from Zone–Region masters. */
const REGION_TO_ZONE: Array<{ zone: InfraZone; patterns: string[] }> = [
  {
    zone: "East",
    patterns: [
      "bihar",
      "wb",
      "west bengal",
      "westbengal",
      "north east",
      "northeast",
      "orissa",
      "odisha",
      "jharkhand",
      "cg",
      "chhattisgarh",
      "chattisgarh",
    ],
  },
  {
    zone: "West",
    patterns: ["mh", "maharashtra", "mp", "madhya pradesh", "madhyapradesh", "gujarat"],
  },
  {
    zone: "North",
    patterns: [
      "uttrakhand",
      "uttarakhand",
      "uttarpradesh",
      "uttar pradesh",
      "rajasthan",
      "punjab",
      "himachalpradesh",
      "himachal pradesh",
      "haryana",
      "delhi",
      "j&k",
      "chandigarh",
    ],
  },
  {
    zone: "South",
    patterns: [
      "ap",
      "apts",
      "andhra",
      "ka",
      "karnataka",
      "hyderabad",
      "ts",
      "telangana",
      "tn",
      "tamil",
      "kerala",
      "blr",
      "hubli",
      "mysore",
      "mysuru",
      "kurnool",
      "secunderabad",
      "cyberabad",
      "tirupati",
      "vishakapatnam",
      "visakhapatnam",
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve Zone ID for a master region string (e.g. "MH 1", "TN 3", "Hyderabad"). */
export function zoneForMasterRegion(region: string | undefined | null): InfraZone | null {
  if (!region) return null;
  const text = normalize(region);
  if (!text) return null;
  if (text === "east" || text === "west" || text === "north" || text === "south") {
    return (text[0].toUpperCase() + text.slice(1)) as InfraZone;
  }
  for (const entry of REGION_TO_ZONE) {
    for (const pattern of entry.patterns) {
      if (text === pattern || text.startsWith(`${pattern} `) || text.startsWith(pattern)) {
        // Avoid "ap" matching inside unrelated words: require boundary after short codes.
        if (pattern.length <= 3 && text !== pattern && !new RegExp(`^${pattern}(\\s|\\d|$)`, "i").test(text)) {
          continue;
        }
        return entry.zone;
      }
    }
  }
  return null;
}

export function zoneForFeaturedRegionId(id: string): InfraZone | undefined {
  return FEATURED_REGION_ZONES[id];
}

/** Build create-ticket URL with zone (and optional region / product) prefilled. */
export function newBranchCreatePath(opts: {
  zone?: string | null;
  region?: string | null;
  product?: string | null;
}) {
  const params = new URLSearchParams();
  if (opts.zone) params.set("zone", opts.zone);
  if (opts.region) params.set("region", opts.region);
  if (opts.product) params.set("product", opts.product);
  const query = params.toString();
  return query ? `/new-branch/new?${query}` : "/new-branch/new";
}
