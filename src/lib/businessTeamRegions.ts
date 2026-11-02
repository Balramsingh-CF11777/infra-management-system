import { FEATURED_REGIONS, matchFeaturedRegion, type GoldLoanHome, type HomeRegionCard } from "@/lib/goldLoanHome";
import { newBranchCreatePath, zoneForFeaturedRegionId, zoneForMasterRegion } from "@/lib/regionZoneMap";

export interface RegionAccessEntry {
  product_line: string;
  zone: string;
  region: string;
}

export interface RegionAccess {
  product_lines: string[];
  entries: RegionAccessEntry[];
}

/** Fallback when portal `region_access` is missing (compat mode): use auth scope. */
export function regionAccessFromScope(
  scope: Array<{ product_line?: string; zone?: string; region?: string }> | undefined,
  productLines?: string[],
): RegionAccess | null {
  if (!scope?.length) return null;
  const entries: RegionAccessEntry[] = [];
  const seen = new Set<string>();
  const lines = new Set<string>(productLines || []);
  for (const row of scope) {
    const product_line = (row.product_line || "").trim();
    const zone = (row.zone || "").trim();
    const region = (row.region || "").trim();
    if (!product_line) continue;
    lines.add(product_line);
    if (!zone || !region) continue;
    const key = `${product_line}|${zone}|${region}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ product_line, zone, region });
  }
  return { product_lines: [...lines], entries };
}

export interface DashboardRegionCard extends HomeRegionCard {
  /** Create-ticket or browse link. */
  href: string;
  /** Master region used for autofill when creating. */
  createRegion?: string;
  createProduct?: string;
  canCreate?: boolean;
}

/**
 * Business Team: cards from portal `region_access` (Role Master product line →
 * Regional Details rows with fk_zoneid + region). Zone on create prefers the
 * Frappe zone from that entry; client map is only a fallback.
 */
export function regionCardsForDashboard(
  home: GoldLoanHome,
  opts: {
    isBusinessTeam: boolean;
    regionAccess?: RegionAccess | null;
  },
): DashboardRegionCard[] {
  const { isBusinessTeam, regionAccess } = opts;
  const entries = regionAccess?.entries ?? [];
  const defaultProduct = regionAccess?.product_lines?.[0] || "";

  if (!isBusinessTeam) {
    return home.regions.map((region) => ({
      ...region,
      href: region.zone
        ? `/infra/requests?zone=${encodeURIComponent(region.zone)}`
        : `/infra/requests?q=${encodeURIComponent(region.label)}`,
      canCreate: false,
    }));
  }

  // Strict: no assignment entries → no geography cards.
  if (entries.length === 0) return [];

  const cards: DashboardRegionCard[] = [];
  for (const featured of FEATURED_REGIONS) {
    const matching = entries.filter(
      (entry) =>
        matchFeaturedRegion({ region: entry.region, zone: entry.zone })?.id === featured.id,
    );
    if (matching.length === 0) continue;

    const homeCard = home.regions.find((region) => region.id === featured.id);
    const pick = matching[0];
    // Prefer Regional Details Zone ID from the server entry.
    const zone =
      (pick.zone || "").trim() ||
      zoneForMasterRegion(pick.region) ||
      zoneForFeaturedRegionId(featured.id) ||
      "";
    const product = pick.product_line || defaultProduct;
    const createRegion = pick.region || "";

    cards.push({
      id: featured.id,
      label: featured.label,
      areas: homeCard?.areas ?? 0,
      properties: homeCard?.properties ?? 0,
      zone: zone || homeCard?.zone,
      createRegion,
      createProduct: product,
      canCreate: true,
      href: newBranchCreatePath({
        zone: zone || undefined,
        region: createRegion || undefined,
        product: product || undefined,
      }),
    });
  }
  return cards;
}
