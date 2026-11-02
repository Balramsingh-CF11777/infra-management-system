/**
 * Featured dashboard regions. Masters often store the same geography as
 * state names, city names, or coded slices (MH 1, TN 2, AP1, Blr North…).
 * `needles` match free text; `codes` match abbreviations + optional digits.
 */
export const FEATURED_REGIONS = [
  {
    id: "andhra-telangana",
    label: "Andhra & Telangana",
    needles: [
      "andhra",
      "telangana",
      "hyderabad",
      "secunderabad",
      "cyberabad",
      "visakhapatnam",
      "vishakapatnam",
      "vijayawada",
      "warangal",
      "tirupati",
      "kurnool",
      "apts",
    ],
    codes: ["ap", "ts", "apts"],
  },
  {
    id: "karnataka",
    label: "Karnataka",
    needles: [
      "karnataka",
      "bangalore",
      "bengaluru",
      "blr north",
      "blr south",
      "mysore",
      "mysuru",
      "hubli",
      "hubballi",
      "mangalore",
      "mangaluru",
    ],
    codes: ["ka", "blr"],
  },
  {
    id: "tamilnadu",
    label: "TamilNadu",
    needles: [
      "tamil",
      "chennai",
      "madurai",
      "coimbatore",
      "trichy",
      "tiruchirappalli",
      "tirunelveli",
      "salem",
    ],
    codes: ["tn"],
  },
  {
    id: "kerala",
    label: "Kerala",
    needles: ["kerala", "kochi", "cochin", "trivandrum", "thiruvananthapuram", "calicut", "kozhikode"],
    codes: ["kl"],
  },
  {
    id: "west-bengal",
    label: "West Bengal",
    needles: ["west bengal", "westbengal", "bengal", "kolkata", "calcutta", "howrah", "siliguri", "durgapur"],
    codes: ["wb"],
  },
  {
    id: "maharashtra",
    label: "Maharashtra",
    needles: ["maharashtra", "mumbai", "pune", "nagpur", "nashik", "aurangabad", "thane"],
    codes: ["mh"],
  },
  {
    id: "gujarat",
    label: "Gujarat",
    needles: ["gujarat", "ahmedabad", "surat", "vadodara", "baroda", "rajkot", "gandhinagar"],
    codes: ["gj"],
  },
  {
    id: "madhya-pradesh",
    label: "Madhya Pradesh",
    needles: ["madhya pradesh", "madhyapradesh", "bhopal", "indore", "gwalior", "jabalpur"],
    codes: ["mp"],
  },
  {
    id: "rajasthan",
    label: "Rajasthan",
    needles: ["rajasthan", "jaipur", "jodhpur", "udaipur", "kota", "ajmer"],
    codes: ["rj"],
  },
  {
    id: "uttar-pradesh",
    label: "Uttar Pradesh",
    needles: ["uttar pradesh", "uttarpradesh", "lucknow", "kanpur", "varanasi", "noida", "ghaziabad", "agra"],
    codes: ["up"],
  },
  {
    id: "uttarakhand",
    label: "Uttarakhand",
    needles: ["uttarakhand", "uttrakhand", "uttaranchal", "dehradun", "haridwar", "nainital"],
    codes: ["uk", "ua"],
  },
  {
    id: "bihar",
    label: "Bihar",
    needles: ["bihar", "patna", "gaya", "muzaffarpur", "bhagalpur"],
    codes: ["br"],
  },
  {
    id: "jharkhand",
    label: "Jharkhand",
    needles: ["jharkhand", "ranchi", "jamshedpur", "dhanbad", "bokaro"],
    codes: ["jh"],
  },
  {
    id: "odisha",
    label: "Odisha",
    needles: ["odisha", "orissa", "bhubaneswar", "cuttack", "puri", "rourkela"],
    codes: ["od", "or"],
  },
  {
    id: "chhattisgarh",
    label: "Chhattisgarh",
    needles: ["chhattisgarh", "chattisgarh", "raipur", "bilaspur", "durg", "bhilai"],
    codes: ["cg"],
  },
  {
    id: "delhi",
    label: "Delhi",
    needles: ["delhi", "new delhi", "ncr", "dwarka", "rohini"],
    codes: ["dl", "ncr"],
  },
  {
    id: "haryana",
    label: "Haryana",
    needles: ["haryana", "gurgaon", "gurugram", "faridabad", "panipat", "ambala"],
    codes: ["hr"],
  },
  {
    id: "punjab-hills",
    label: "Punjab & Hills",
    needles: [
      "punjab",
      "himachal",
      "chandigarh",
      "jammu",
      "kashmir",
      "j&k",
      "j and k",
      "ludhiana",
      "amritsar",
      "shimla",
    ],
    codes: ["pb", "hp", "jk", "ch"],
  },
  {
    id: "north-east",
    label: "North East",
    needles: [
      "north east",
      "northeast",
      "north-east",
      "assam",
      "guwahati",
      "meghalaya",
      "manipur",
      "nagaland",
      "tripura",
      "mizoram",
      "arunachal",
      "sikkim",
    ],
    codes: ["ne", "as", "ml", "mn", "nl", "tr", "mz", "ar", "sk"],
  },
] as const;

export type FeaturedRegionId = (typeof FEATURED_REGIONS)[number]["id"];

export interface HomePropertyRow {
  name?: string;
  zone?: string;
  region?: string;
  area?: string;
  workflow_state?: string;
  product_line?: string;
}

export interface HomeRegionCard {
  id: string;
  label: string;
  areas: number;
  properties: number;
  zone?: string;
}

export interface GoldLoanHome {
  product_line: string;
  regions: HomeRegionCard[];
  status: { review_pending: number; rework_raised: number; approved: number };
  launches: number;
}

function haystack(row: HomePropertyRow) {
  return `${row.zone || ""} ${row.region || ""} ${row.area || ""}`.toLowerCase();
}

/** Match coded masters like "MH 1", "TN2", "AP 3", "KA", "Blr North". */
function matchesCode(text: string, codes: readonly string[]) {
  return codes.some((code) => {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:\\s*\\d+)?(?=$|[^a-z])`, "i");
    return pattern.test(text);
  });
}

export function matchFeaturedRegion(row: HomePropertyRow) {
  const text = haystack(row);
  if (!text.trim()) return null;
  return (
    FEATURED_REGIONS.find(
      (region) =>
        region.needles.some((needle) => text.includes(needle)) || matchesCode(text, region.codes),
    ) ?? null
  );
}

export function statusBucket(state: string): "review" | "rework" | "approved" | "ignore" {
  const text = (state || "").toLowerCase();
  if (!text) return "review";
  if (text.includes("reject") || text.includes("cancel")) return "ignore";
  if (text.includes("rework") || text.includes("send back") || text.includes("return to")) return "rework";
  if (
    text === "complete" ||
    text.includes("inauguration completed") ||
    text.endsWith(" approved") ||
    text.includes("approved properties")
  ) {
    return "approved";
  }
  return "review";
}

export function isLaunchState(state: string) {
  return (state || "").toLowerCase().includes("inauguration");
}

export function buildGoldLoanHome(rows: HomePropertyRow[], productLine = "GL"): GoldLoanHome {
  const groups = new Map<string, { label: string; zone?: string; names: Set<string>; areas: Set<string> }>();
  for (const featured of FEATURED_REGIONS) {
    groups.set(featured.id, { label: featured.label, names: new Set(), areas: new Set() });
  }
  const status = { review_pending: 0, rework_raised: 0, approved: 0 };
  let launches = 0;

  for (const row of rows) {
    const featured = matchFeaturedRegion(row);
    const id = featured?.id || `zone-${(row.zone || row.region || "other").trim().toLowerCase().replace(/\s+/g, "-")}`;
    const label = featured?.label || (row.zone || row.region || "Other").trim() || "Other";
    if (!groups.has(id)) groups.set(id, { label, zone: row.zone, names: new Set(), areas: new Set() });
    const group = groups.get(id)!;
    if (!group.zone && row.zone) group.zone = row.zone;
    if (row.name) group.names.add(row.name);
    if (row.area) group.areas.add(row.area);
    const bucket = statusBucket(row.workflow_state || "");
    if (bucket === "review") status.review_pending += 1;
    if (bucket === "rework") status.rework_raised += 1;
    if (bucket === "approved") status.approved += 1;
    if (isLaunchState(row.workflow_state || "")) launches += 1;
  }

  const featuredIds = new Set<string>(FEATURED_REGIONS.map((region) => region.id));
  const regions = [...groups.entries()]
    .map(([id, group]) => ({
      id,
      label: group.label,
      areas: group.areas.size,
      properties: group.names.size,
      zone: group.zone,
    }))
    // Always keep featured geography cards (Figma home); drop empty ad-hoc zones only.
    .filter((region) => featuredIds.has(region.id) || region.properties > 0)
    .sort((left, right) => {
      const leftFeatured = featuredIds.has(left.id) ? 0 : 1;
      const rightFeatured = featuredIds.has(right.id) ? 0 : 1;
      if (leftFeatured !== rightFeatured) return leftFeatured - rightFeatured;
      return left.label.localeCompare(right.label);
    });

  return { product_line: productLine, regions, status, launches };
}
