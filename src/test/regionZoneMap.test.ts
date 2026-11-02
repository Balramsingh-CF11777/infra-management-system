import { describe, expect, it } from "vitest";
import { regionCardsForDashboard } from "@/lib/businessTeamRegions";
import { buildGoldLoanHome } from "@/lib/goldLoanHome";
import { newBranchCreatePath, zoneForFeaturedRegionId, zoneForMasterRegion } from "@/lib/regionZoneMap";

describe("region → zone map", () => {
  it("maps master region labels to East/West/North/South", () => {
    expect(zoneForMasterRegion("MH 1")).toBe("West");
    expect(zoneForMasterRegion("Gujarat 2")).toBe("West");
    expect(zoneForMasterRegion("MP 3")).toBe("West");
    expect(zoneForMasterRegion("Bihar 1")).toBe("East");
    expect(zoneForMasterRegion("West Bengal 4")).toBe("East");
    expect(zoneForMasterRegion("CG 2")).toBe("East");
    expect(zoneForMasterRegion("TN 3")).toBe("South");
    expect(zoneForMasterRegion("Hyderabad")).toBe("South");
    expect(zoneForMasterRegion("Blr North")).toBe("South");
    expect(zoneForMasterRegion("Delhi 1")).toBe("North");
    expect(zoneForMasterRegion("Uttrakhand 2")).toBe("North");
    expect(zoneForFeaturedRegionId("maharashtra")).toBe("West");
    expect(zoneForFeaturedRegionId("andhra-telangana")).toBe("South");
  });

  it("builds create URL with zone autofill params", () => {
    expect(newBranchCreatePath({ zone: "West", region: "MH 1", product: "GL" })).toBe(
      "/new-branch/new?zone=West&region=MH+1&product=GL",
    );
  });
});

describe("Business Team region cards", () => {
  it("filters to assigned product/zone/region only and links to create with zone", () => {
    const home = buildGoldLoanHome([]);
    const cards = regionCardsForDashboard(home, {
      isBusinessTeam: true,
      regionAccess: {
        product_lines: ["GL"],
        entries: [
          { product_line: "GL", zone: "West", region: "MH 1" },
          { product_line: "GL", zone: "West", region: "Gujarat 1" },
          { product_line: "GL", zone: "South", region: "TN 2" },
        ],
      },
    });
    const ids = cards.map((card) => card.id);
    expect(ids).toContain("maharashtra");
    expect(ids).toContain("gujarat");
    expect(ids).toContain("tamilnadu");
    expect(ids).not.toContain("bihar");
    const mh = cards.find((card) => card.id === "maharashtra");
    expect(mh?.href).toContain("/new-branch/new?");
    expect(mh?.href).toContain("zone=West");
    expect(mh?.canCreate).toBe(true);
  });

  it("shows no cards when Business Team has no zone/region assignment", () => {
    const home = buildGoldLoanHome([]);
    expect(
      regionCardsForDashboard(home, {
        isBusinessTeam: true,
        regionAccess: { product_lines: ["GL"], entries: [] },
      }),
    ).toEqual([]);
  });
});
