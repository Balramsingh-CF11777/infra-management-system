/** Frappe Geolocation stores GeoJSON FeatureCollection with Point [lng, lat]. */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function parseGeoJsonPoint(value: unknown): GeoPoint | null {
  if (value == null || value === "") return null;
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    const feature = data?.features?.[0] ?? (data?.type === "Feature" ? data : null);
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const longitude = Number(coords[0]);
    const latitude = Number(coords[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

export function toMapGeoJson(latitude: number | string, longitude: number | string): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [lng, lat] },
      },
    ],
  });
}

export function formatCoordinate(value: number, digits = 6): string {
  return value.toFixed(digits);
}
