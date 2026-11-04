import { callMethod } from "@/api/client";

function asLocationLabel(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "display_name" in value) {
    return String((value as { display_name?: unknown }).display_name || "").trim();
  }
  return "";
}

/** Browser fallback when the portal Nominatim call is empty or blocked. */
async function reverseGeocodeInBrowser(lat: number, lon: number): Promise<string | null> {
  const response = await fetch(`https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    features?: Array<{ properties?: Record<string, string | undefined> }>;
  };
  const props = data.features?.[0]?.properties;
  if (!props) return null;
  const parts = [props.name, props.street, props.district, props.city, props.state, props.country]
    .map((part) => (part || "").trim())
    .filter((part, index, all) => part && all.indexOf(part) === index);
  return parts.join(", ") || null;
}

/** Reverse-geocode via Frappe (Nominatim), then a browser lookup if that returns nothing. */
export async function getGeoLocation(lat: number, lon: number, documentName?: string) {
  try {
    const label = asLocationLabel(
      await callMethod<unknown>("infra_ms.portal.geo.get_geo_location", {
        lat,
        lon,
        document_name: documentName || undefined,
      }),
    );
    if (label) return label;
  } catch {
    // The portal lookup can be refused before a document exists. Try the browser lookup below.
  }
  return reverseGeocodeInBrowser(lat, lon);
}
