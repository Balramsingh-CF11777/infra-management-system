import { describe, expect, it } from "vitest";
import { formatCoordinate, parseGeoJsonPoint, toMapGeoJson } from "@/lib/geo";

describe("geo helpers", () => {
  it("parses a Frappe FeatureCollection point as lat/lng", () => {
    const geoJson = toMapGeoJson(13.0108, 80.2124);
    expect(parseGeoJsonPoint(geoJson)).toEqual({ latitude: 13.0108, longitude: 80.2124 });
  });

  it("accepts an already-parsed object", () => {
    expect(
      parseGeoJsonPoint({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [80.2, 13.0] } }],
      }),
    ).toEqual({ latitude: 13, longitude: 80.2 });
  });

  it("rejects invalid coordinates", () => {
    expect(parseGeoJsonPoint("")).toBeNull();
    expect(parseGeoJsonPoint("{not-json")).toBeNull();
    expect(parseGeoJsonPoint(toMapGeoJson(120, 80))).toBeNull();
  });

  it("formats coordinates to six decimals", () => {
    expect(formatCoordinate(13.01081234)).toBe("13.010812");
  });
});
