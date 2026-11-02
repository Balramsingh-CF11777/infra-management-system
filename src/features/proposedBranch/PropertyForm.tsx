import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { GeoMapField } from "@/components/common/GeoMapField";
import type { PropertyField, PropertySection } from "@/types/api";
import { formatCoordinate, toMapGeoJson } from "@/lib/geo";
import { ownerPercentagesValid } from "@/lib/rules";

const schema = z.object({
  pin_code: z.string().optional(),
  phone_number: z.string().optional(),
  pan_number: z.string().optional(),
  gst_number: z.string().optional(),
  geo_latitude: z.string().optional(),
  geo_longitude: z.string().optional(),
  geo_location: z.string().optional(),
  map: z.string().optional(),
}).passthrough();

// Rendered together in the map section instead of their DocType position.
const MAP_FIELDS = new Set(["geo_latitude", "geo_longitude", "geo_location", "map"]);
const LONG_TEXT_TYPES = new Set(["Small Text", "Text", "Long Text", "Text Editor"]);
const NUMBER_TYPES = new Set(["Int", "Float", "Currency", "Percent"]);
const COLUMN_GRID: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function PropertyForm({
  fields,
  sections,
  editable,
  saving,
  documentName,
  onSave,
}: {
  fields: PropertyField[];
  sections?: PropertySection[];
  editable: boolean;
  saving: boolean;
  documentName?: string;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const defaults: Record<string, string> = Object.fromEntries(
    fields.map((field) => [field.fieldname, field.value == null ? "" : String(field.value)]),
  );
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const [message, setMessage] = useState("");
  const latitude = form.watch("geo_latitude");
  const longitude = form.watch("geo_longitude");
  const mapValue = form.watch("map");
  const geoLocation = form.watch("geo_location");
  const byName = new Map(fields.map((field) => [field.fieldname, field]));
  const layout: PropertySection[] = sections?.length ? sections : [{ label: "", tab: "", columns: [fields], fields }];
  const mapEditable =
    editable &&
    Boolean(
      (byName.has("map") && !byName.get("map")?.read_only) ||
        (byName.has("geo_latitude") && !byName.get("geo_latitude")?.read_only) ||
        (byName.has("geo_longitude") && !byName.get("geo_longitude")?.read_only),
    );

  const geoJsonValue =
    mapValue ||
    (latitude && longitude ? toMapGeoJson(latitude, longitude) : "");

  function renderField(field: PropertyField, spanWide: boolean) {
    const name = field.fieldname;
    const long = LONG_TEXT_TYPES.has(field.fieldtype);
    const input = "ims-field mt-1";
    let control;
    if (long) {
      control = <textarea {...form.register(name)} readOnly={field.read_only} className={`${input} min-h-20`} />;
    } else if (field.fieldtype === "Select" && !field.read_only) {
      control = (
        <select {...form.register(name)} className={input}>
          {(field.options ?? "").split("\n").map((option) => (
            <option key={option} value={option}>
              {option || "Select"}
            </option>
          ))}
        </select>
      );
    } else {
      const type = field.read_only ? "text" : field.fieldtype === "Date" ? "date" : NUMBER_TYPES.has(field.fieldtype) ? "number" : "text";
      control = <input {...form.register(name)} type={type} step="any" readOnly={field.read_only} className={input} />;
    }
    return (
      <label key={name} className={long && spanWide ? "min-w-0 text-sm md:col-span-2" : "min-w-0 text-sm"}>
        <span className="font-medium text-slate-700">{field.label}</span>
        {control}
      </label>
    );
  }

  async function submit(values: Record<string, string>) {
    setMessage("");
    if (values.pin_code && !/^\d{6}$/.test(values.pin_code)) {
      setMessage("Pin code must contain only 6 digits.");
      return;
    }
    if (values.phone_number && !/^\d{10}$/.test(values.phone_number)) {
      setMessage("Phone number must contain only 10 digits.");
      return;
    }
    if (values.pan_number && !/^[A-Z0-9]{10}$/.test(values.pan_number)) {
      setMessage("PAN number must be 10 capital letters or numbers.");
      return;
    }
    if (values.gst_number && !/^[A-Z0-9]{15}$/.test(values.gst_number)) {
      setMessage("GST number must be 15 capital letters or numbers.");
      return;
    }
    const percentages = ["rentsd_payable_percentage", "rentsd_payable_percentage_2", "rentsd_payable_percentage_3", "rentsd_payable_percentage_4"].map(
      (field) => values[field],
    );
    if (!ownerPercentagesValid(percentages)) {
      setMessage("Owner payable percentages must total 100%.");
      return;
    }
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.read_only && field.fieldname !== "geo_location") continue;
      if (field.fieldname === "map") continue;
      payload[field.fieldname] = values[field.fieldname] ?? "";
    }
    if (values.geo_latitude && values.geo_longitude && byName.has("map") && !byName.get("map")?.read_only) {
      payload.map = toMapGeoJson(values.geo_latitude, values.geo_longitude);
    } else if (values.map && byName.has("map") && !byName.get("map")?.read_only) {
      payload.map = values.map;
    }
    await onSave(payload);
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
      {layout.map((section, index) => {
        const columns = section.columns
          .map((column) => column.filter((field) => !MAP_FIELDS.has(field.fieldname)))
          .filter((column) => column.length > 0);
        if (columns.length === 0) return null;
        return (
          <section key={`${section.label}-${index}`} className="rounded-2xl border border-slate-100 p-4">
            {section.label && <h3 className="mb-3 text-sm font-semibold text-ims-primary">{section.label}</h3>}
            {columns.length > 1 ? (
              <div className={`grid gap-3 ${COLUMN_GRID[Math.min(columns.length, 4)]}`}>
                {columns.map((column, columnIndex) => (
                  <div key={columnIndex} className="flex min-w-0 flex-col gap-3">
                    {column.map((field) => renderField(field, false))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">{columns[0].map((field) => renderField(field, true))}</div>
            )}
          </section>
        );
      })}
      {(byName.has("map") || byName.has("geo_latitude") || byName.has("geo_longitude")) && (
        <section className="rounded-2xl border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-ims-primary">Map location</h3>
          <p className="mt-1 text-xs text-slate-500">
            Stored as a Frappe Geolocation FeatureCollection point. Coordinates and reverse-geocoded address appear below the map.
          </p>
          <div className="mt-3">
            <GeoMapField
              value={geoJsonValue}
              editable={mapEditable}
              documentName={documentName}
              address={geoLocation || (byName.get("geo_location")?.value ? String(byName.get("geo_location")?.value) : null)}
              onChange={(geoJson, point) => {
                form.setValue("map", geoJson, { shouldDirty: true });
                form.setValue("geo_latitude", formatCoordinate(point.latitude), { shouldDirty: true });
                form.setValue("geo_longitude", formatCoordinate(point.longitude), { shouldDirty: true });
              }}
              onAddressChange={(address) => form.setValue("geo_location", address, { shouldDirty: true })}
            />
          </div>
        </section>
      )}
      {message && <p className="text-sm text-rose-700">{message}</p>}
      {editable ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-slate-100 bg-white/95 px-4 py-3 sm:-mx-5 sm:px-5 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <button
            type="submit"
            disabled={saving}
            className="ims-btn-primary w-full md:w-auto"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">This section is read-only for your role or the current stage.</p>
      )}
    </form>
  );
}
