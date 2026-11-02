import { callMethod } from "@/api/client";

/** Reverse-geocode via Frappe (Nominatim), same as Desk get_geo_location. */
export function getGeoLocation(lat: number, lon: number, documentName?: string) {
  return callMethod<string | null>("infra_ms.portal.geo.get_geo_location", {
    lat,
    lon,
    document_name: documentName || undefined,
  });
}
