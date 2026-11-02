import { buildGoldLoanHome, matchFeaturedRegion, statusBucket } from "@/lib/goldLoanHome";

describe("Gold Loan home grouping", () => {
  it("maps city names into featured regions", () => {
    expect(matchFeaturedRegion({ region: "Chennai South" })?.id).toBe("tamilnadu");
    expect(matchFeaturedRegion({ zone: "Hyderabad" })?.label).toBe("Andhra & Telangana");
    expect(matchFeaturedRegion({ zone: "Bengaluru Urban" })?.id).toBe("karnataka");
    expect(matchFeaturedRegion({ region: "Kolkata" })?.id).toBe("west-bengal");
    expect(matchFeaturedRegion({ region: "Kerala 2" })?.id).toBe("kerala");
    expect(matchFeaturedRegion({ zone: "Mumbai" })?.id).toBe("maharashtra");
  });

  it("categorizes coded and alternate region formats", () => {
    expect(matchFeaturedRegion({ region: "MH 1" })?.id).toBe("maharashtra");
    expect(matchFeaturedRegion({ region: "MH7" })?.id).toBe("maharashtra");
    expect(matchFeaturedRegion({ region: "TN 3" })?.id).toBe("tamilnadu");
    expect(matchFeaturedRegion({ region: "Tamil Nadu" })?.id).toBe("tamilnadu");
    expect(matchFeaturedRegion({ region: "AP1" })?.id).toBe("andhra-telangana");
    expect(matchFeaturedRegion({ region: "TS 2" })?.id).toBe("andhra-telangana");
    expect(matchFeaturedRegion({ region: "Secunderabad" })?.id).toBe("andhra-telangana");
    expect(matchFeaturedRegion({ region: "Blr North" })?.id).toBe("karnataka");
    expect(matchFeaturedRegion({ region: "KA" })?.id).toBe("karnataka");
    expect(matchFeaturedRegion({ region: "West Bengal 4" })?.id).toBe("west-bengal");
    expect(matchFeaturedRegion({ region: "WB" })?.id).toBe("west-bengal");
    expect(matchFeaturedRegion({ region: "Gujarat 2" })?.id).toBe("gujarat");
    expect(matchFeaturedRegion({ region: "MP 3" })?.id).toBe("madhya-pradesh");
    expect(matchFeaturedRegion({ region: "CG 1" })?.id).toBe("chhattisgarh");
    expect(matchFeaturedRegion({ region: "Orissa 2" })?.id).toBe("odisha");
    expect(matchFeaturedRegion({ region: "Uttrakhand 1" })?.id).toBe("uttarakhand");
    expect(matchFeaturedRegion({ region: "Uttarpradesh 2" })?.id).toBe("uttar-pradesh");
    expect(matchFeaturedRegion({ region: "North East 3" })?.id).toBe("north-east");
    expect(matchFeaturedRegion({ region: "J&K & Chandigarh" })?.id).toBe("punjab-hills");
    expect(matchFeaturedRegion({ region: "Himachalpradesh" })?.id).toBe("punjab-hills");
    expect(matchFeaturedRegion({ region: "Delhi 1" })?.id).toBe("delhi");
    expect(matchFeaturedRegion({ region: "Haryana 2" })?.id).toBe("haryana");
    expect(matchFeaturedRegion({ region: "Bihar 5" })?.id).toBe("bihar");
    expect(matchFeaturedRegion({ region: "Jharkhand 1" })?.id).toBe("jharkhand");
    expect(matchFeaturedRegion({ region: "Rajasthan 4" })?.id).toBe("rajasthan");
    expect(matchFeaturedRegion({ region: "Vishakapatnam" })?.id).toBe("andhra-telangana");
  });

  it("counts areas, properties, status, and launches", () => {
    const home = buildGoldLoanHome([
      { name: "NBO/1", zone: "Chennai", area: "T Nagar", workflow_state: "Assigned to RIBP for Property Details" },
      { name: "NBO/2", zone: "Chennai", area: "Anna Nagar", workflow_state: "Assigned to RLM" },
      { name: "NBO/3", zone: "Hyderabad", area: "HITEC", workflow_state: "Send Back to RIBP" },
      { name: "NBO/4", zone: "Kolkata", area: "Salt Lake", workflow_state: "Branch Inauguration Completed" },
      { name: "NBO/5", zone: "Kolkata", area: "Salt Lake", workflow_state: "Assigned to Business Team for the Branch Inauguration" },
      { name: "NBO/6", region: "MH 2", area: "Andheri", workflow_state: "Assigned to RIBP for Property Details" },
    ]);
    const tamil = home.regions.find((region) => region.id === "tamilnadu");
    const bengal = home.regions.find((region) => region.id === "west-bengal");
    const mh = home.regions.find((region) => region.id === "maharashtra");
    expect(tamil).toMatchObject({ areas: 2, properties: 2 });
    expect(bengal).toMatchObject({ areas: 1, properties: 2 });
    expect(mh).toMatchObject({ areas: 1, properties: 1 });
    expect(home.status).toEqual({ review_pending: 4, rework_raised: 1, approved: 1 });
    expect(home.launches).toBe(2);
    expect(home.regions[0].label).toBe("Andhra & Telangana");
  });

  it("keeps featured region cards even when Business Team has no properties yet", () => {
    const home = buildGoldLoanHome([]);
    expect(home.regions.length).toBeGreaterThan(4);
    expect(home.regions.find((region) => region.id === "andhra-telangana")).toMatchObject({
      label: "Andhra & Telangana",
      areas: 0,
      properties: 0,
    });
  });

  it("ignores rejected records in status tiles", () => {
    expect(statusBucket("Rejected")).toBe("ignore");
    expect(statusBucket("Complete")).toBe("approved");
    expect(statusBucket("Assigned to RIBP on Strong Room Work Completion Status")).toBe("review");
  });
});
