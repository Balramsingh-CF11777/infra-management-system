import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getGeoLocation } from "@/api/geo";
import { formatCoordinate, parseGeoJsonPoint, toMapGeoJson, type GeoPoint } from "@/lib/geo";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER: GeoPoint = { latitude: 13.0108, longitude: 80.2124 };
const DEFAULT_ZOOM = 15;

export function GeoMapField({
  value,
  editable = false,
  documentName,
  address,
  onChange,
  onAddressChange,
  hideCoordinates = false,
  hideLocationLabel = false,
  className = "",
  frameClassName = "",
}: {
  /** Frappe Geolocation GeoJSON string, or empty. */
  value?: unknown;
  editable?: boolean;
  documentName?: string;
  /** Existing geo_location / address text. */
  address?: string | null;
  onChange?: (geoJson: string, point: GeoPoint) => void;
  onAddressChange?: (address: string) => void;
  /** Hide built-in lat/long chips when the parent renders its own inputs. */
  hideCoordinates?: boolean;
  /** Omit the address line under the map so the frame can sit in a tight column. */
  hideLocationLabel?: boolean;
  className?: string;
  /** Replaces the default map height. */
  frameClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const editableRef = useRef(editable);
  const applyRef = useRef<(point: GeoPoint) => void>(() => undefined);

  const point = parseGeoJsonPoint(value) ?? null;
  const [coords, setCoords] = useState<GeoPoint | null>(point);
  const [locationLabel, setLocationLabel] = useState(address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  editableRef.current = editable;

  async function applyPoint(next: GeoPoint) {
    const rounded = {
      latitude: Number(next.latitude.toFixed(6)),
      longitude: Number(next.longitude.toFixed(6)),
    };
    setCoords(rounded);
    setError("");
    onChange?.(toMapGeoJson(rounded.latitude, rounded.longitude), rounded);

    if (!editableRef.current) return;
    setBusy(true);
    try {
      const label = (await getGeoLocation(rounded.latitude, rounded.longitude, documentName) || "").trim();
      if (label) {
        setLocationLabel(label);
        onAddressChange?.(label);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve address for this point.");
    } finally {
      setBusy(false);
    }
  }

  applyRef.current = (next) => {
    void applyPoint(next);
  };

  useEffect(() => {
    setCoords(parseGeoJsonPoint(value));
  }, [value]);

  useEffect(() => {
    if (address != null) setLocationLabel(address);
  }, [address]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const start = coords ?? DEFAULT_CENTER;
    const map = L.map(containerRef.current, {
      center: [start.latitude, start.longitude],
      zoom: coords ? DEFAULT_ZOOM : 5,
      scrollWheelZoom: editableRef.current,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    if (coords) {
      markerRef.current = L.marker([coords.latitude, coords.longitude], {
        draggable: editableRef.current,
      }).addTo(map);
      markerRef.current.on("dragend", () => {
        if (!editableRef.current) return;
        const pos = markerRef.current?.getLatLng();
        if (pos) applyRef.current({ latitude: pos.lat, longitude: pos.lng });
      });
    }

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!editableRef.current) return;
      applyRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });

    const timer = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount once; marker/view updates go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.scrollWheelZoom[editable ? "enable" : "disable"]();
    if (!coords) return;
    map.setView([coords.latitude, coords.longitude], Math.max(map.getZoom(), DEFAULT_ZOOM));
    if (markerRef.current) {
      markerRef.current.setLatLng([coords.latitude, coords.longitude]);
      markerRef.current.dragging?.[editable ? "enable" : "disable"]();
    } else {
      markerRef.current = L.marker([coords.latitude, coords.longitude], { draggable: editable }).addTo(map);
      markerRef.current.on("dragend", () => {
        if (!editableRef.current) return;
        const pos = markerRef.current?.getLatLng();
        if (pos) applyRef.current({ latitude: pos.lat, longitude: pos.lng });
      });
    }
    window.setTimeout(() => map.invalidateSize(), 50);
  }, [coords, editable]);

  function captureDeviceLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot capture a location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyRef.current({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setBusy(false);
        setError("Location could not be captured. Tap the map or enter coordinates.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        ref={containerRef}
        className={`relative z-0 isolate w-full overflow-hidden rounded-2xl border border-ims-line bg-[#e8eef5] ${frameClassName || "h-56 sm:h-64"}`}
        role="img"
        aria-label="Location map"
      />
      {!hideCoordinates ? (
        <div className="grid grid-cols-2 gap-2">
          <p className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 text-sm text-ims-ink">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Latitude</span>
            <span className="mt-0.5 block truncate font-semibold">
              {coords ? formatCoordinate(coords.latitude) : "—"}
            </span>
          </p>
          <p className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 text-sm text-ims-ink">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Longitude</span>
            <span className="mt-0.5 block truncate font-semibold">
              {coords ? formatCoordinate(coords.longitude) : "—"}
            </span>
          </p>
        </div>
      ) : null}
      {!hideLocationLabel && (locationLabel || busy) && (
        <p className="text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Geo location</span>
          <span className="mt-0.5 block">{busy ? "Resolving address…" : locationLabel}</span>
        </p>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ims-btn-secondary ims-btn-sm" onClick={captureDeviceLocation} disabled={busy}>
            Use current location
          </button>
          <p className="self-center text-xs text-slate-500">Click the map or drag the marker to set the point.</p>
        </div>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
