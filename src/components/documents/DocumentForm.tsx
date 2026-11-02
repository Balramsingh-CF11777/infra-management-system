import { useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Paperclip } from "lucide-react";
import { getNewBranchCreateOptions } from "@/api/newBranch";
import { queryKeys } from "@/api/keys";
import { GeoMapField } from "@/components/common/GeoMapField";
import type { DocumentField, DocumentPayload } from "@/types/api";
import { frappeFileUrl } from "@/config/runtime";
import { formatCoordinate, parseGeoJsonPoint, toMapGeoJson, type GeoPoint } from "@/lib/geo";

const NBD_OPTION_FIELDS = new Set(["product_line", "year", "zone", "region", "area"]);

function uniqueChoices(...lists: Array<Iterable<string | null | undefined> | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const text = String(raw ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
    }
  }
  return out;
}

function withCurrentChoice(field: DocumentField, value: string): DocumentField {
  const current = String(value ?? "").trim();
  if (!current) return field;

  if (field.choices?.length) {
    if (field.choices.includes(current)) return field;
    return { ...field, choices: [current, ...field.choices] };
  }

  if (field.fieldtype === "Select") {
    const options = field.options.split("\n").map((item) => item.trim());
    if (options.includes(current)) return field;
    const rest = options.filter(Boolean);
    return { ...field, options: ["", current, ...rest].join("\n"), choices: [current, ...rest] };
  }

  if (field.fieldtype === "Link") {
    return { ...field, choices: [current] };
  }

  return field;
}

const ATTACH_TYPES = new Set(["Attach", "Attach Image"]);
const NUMBER_TYPES = new Set(["Int", "Float", "Currency", "Percent"]);
const LONG_TEXT_TYPES = new Set(["Small Text", "Text", "Long Text", "Text Editor"]);
/** Shown via GeoMapField instead of separate inputs / raw GeoJSON. */
const MAP_COMPANION_FIELDS = new Set(["geo_latitude", "geo_longitude", "geo_location"]);
const COLUMN_GRID: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function isGeolocationField(field: DocumentField) {
  return field.fieldtype === "Geolocation" || field.fieldname === "map";
}

export function toInputValue(field: DocumentField): string {
  const value = field.value;
  if (value === null || value === undefined) return "";
  if (field.fieldtype === "Check") return value ? "1" : "0";
  if (field.fieldtype === "Datetime") return String(value).replace(" ", "T").slice(0, 16);
  if (field.fieldtype === "Geolocation" && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function fromInputValue(field: DocumentField, value: string): unknown {
  if (field.fieldtype === "Check") return value === "1" ? 1 : 0;
  if (NUMBER_TYPES.has(field.fieldtype)) return value === "" ? null : Number(value);
  if (field.fieldtype === "Datetime") return value ? `${value.replace("T", " ")}:00` : null;
  if (field.fieldtype === "Date" || field.fieldtype === "Time") return value || null;
  return value;
}

export function displayValue(field: DocumentField, value: unknown) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;
  if (field.fieldtype === "Check") return value ? "Yes" : "No";
  if (field.fieldtype === "Attach" || field.fieldtype === "Attach Image") {
    return (
      <a href={frappeFileUrl(String(value))} target="_blank" rel="noopener noreferrer" className="text-ims-primary underline">
        View attachment
      </a>
    );
  }
  if (field.fieldtype === "Currency" && typeof value === "number") {
    return value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  }
  if (isGeolocationField(field) || field.fieldname === "geo_location") {
    const point = parseGeoJsonPoint(value);
    if (point) {
      return (
        <span>
          {formatCoordinate(point.latitude)}, {formatCoordinate(point.longitude)}
        </span>
      );
    }
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function TableField({
  field,
  editing,
  value,
  onChange,
}: {
  field: DocumentField;
  editing: boolean;
  value?: Array<Record<string, unknown> & { name: string; idx: number }>;
  onChange?: (rows: Array<Record<string, unknown> & { name: string; idx: number }>) => void;
}) {
  const columns = field.columns ?? [];
  const rows = value ?? field.rows ?? [];
  if (rows.length === 0 && !editing) return <p className="text-sm text-slate-400">No rows</p>;

  function updateCell(rowIndex: number, fieldname: string, next: string) {
    if (!onChange) return;
    onChange(
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [fieldname]: next } : row,
      ),
    );
  }

  function addRow() {
    if (!onChange) return;
    const blank: Record<string, unknown> & { name: string; idx: number } = {
      name: "",
      idx: rows.length + 1,
    };
    for (const column of columns) blank[column.fieldname] = "";
    onChange([...rows, blank]);
  }

  function removeRow(rowIndex: number) {
    if (!onChange) return;
    onChange(rows.filter((_, index) => index !== rowIndex).map((row, index) => ({ ...row, idx: index + 1 })));
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">#</th>
              {columns.map((column) => (
                <th key={column.fieldname} className="px-3 py-2 font-semibold">
                  {column.label}
                </th>
              ))}
              {editing ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (editing ? 2 : 1)} className="px-3 py-3 text-slate-400">
                  No rows yet. Add a row to capture owner / premise details.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500">{row.idx}</td>
                  {columns.map((column) => (
                    <td key={column.fieldname} className="px-3 py-2 align-top">
                      {editing ? (
                        <input
                          className="ims-field min-h-9 px-2 py-1 text-xs"
                          value={String(row[column.fieldname] ?? "")}
                          onChange={(event) => updateCell(rowIndex, column.fieldname, event.target.value)}
                        />
                      ) : (
                        displayValue({ ...field, fieldtype: column.fieldtype }, row[column.fieldname])
                      )}
                    </td>
                  ))}
                  {editing ? (
                    <td className="px-3 py-2">
                      <button type="button" className="text-xs font-medium text-rose-700" onClick={() => removeRow(rowIndex)}>
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {editing ? (
        <button type="button" className="ims-btn-secondary ims-btn-sm" onClick={addRow}>
          Add row
        </button>
      ) : null}
    </div>
  );
}

function AttachInput({
  field,
  blockedReason,
  onUpload,
}: {
  field: DocumentField;
  blockedReason: string;
  onUpload: (file: File) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasFile = Boolean(field.value);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3">
      {hasFile ? (
        <div className="text-sm">{displayValue(field, field.value)}</div>
      ) : (
        <span className="text-sm text-slate-400">No file attached</span>
      )}
      <input
        ref={input}
        id={`field-${field.fieldname}`}
        type="file"
        accept={field.fieldtype === "Attach Image" ? "image/*" : undefined}
        className="sr-only"
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading || Boolean(blockedReason)}
        title={blockedReason || undefined}
        onClick={() => input.current?.click()}
        className="ims-btn-secondary min-h-9 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Paperclip size={16} />}
        {uploading ? "Uploading…" : hasFile ? "Replace" : "Upload"}
      </button>
      {blockedReason && <p className="basis-full text-xs text-slate-500">{blockedReason}</p>}
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: DocumentField;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.fieldname}`;
  const base = "ims-field mt-1";
  const resolved = withCurrentChoice(field, value);
  if (resolved.choices?.length) {
    return (
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={base} required={resolved.reqd}>
        <option value="">Select {resolved.label.toLowerCase()}</option>
        {resolved.choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }
  if (resolved.fieldtype === "Check") {
    return (
      <input
        id={id}
        type="checkbox"
        checked={value === "1"}
        onChange={(event) => onChange(event.target.checked ? "1" : "0")}
        className="mt-2 h-4 w-4"
      />
    );
  }
  if (resolved.fieldtype === "Select") {
    const options = resolved.options.split("\n");
    return (
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={base} required={resolved.reqd}>
        {options.map((option) => (
          <option key={option || "__blank"} value={option}>
            {option || "Select"}
          </option>
        ))}
      </select>
    );
  }
  if (LONG_TEXT_TYPES.has(field.fieldtype)) {
    return <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${base} min-h-20`} required={field.reqd} />;
  }
  const type = NUMBER_TYPES.has(field.fieldtype)
    ? "number"
    : field.fieldtype === "Date"
      ? "date"
      : field.fieldtype === "Datetime"
        ? "datetime-local"
        : field.fieldtype === "Time"
          ? "time"
          : "text";
  return (
    <input
      id={id}
      type={type}
      step={field.fieldtype === "Int" ? 1 : "any"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={base}
      required={field.reqd}
      placeholder={field.fieldtype === "Link" ? `${field.options} name` : undefined}
    />
  );
}

export function DocumentForm({
  payload,
  saving,
  onSave,
  onUpload,
  initialEditing = false,
  initialTab,
  onTabChange,
  hideTabs = false,
}: {
  payload: DocumentPayload;
  saving: boolean;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
  onUpload?: (fieldname: string, file: File) => Promise<boolean>;
  initialEditing?: boolean;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  hideTabs?: boolean;
}) {
  const { sections, editable } = payload.form;
  const tabs = useMemo(() => Array.from(new Set(sections.map((section) => section.tab))), [sections]);
  const [activeTab, setActiveTabState] = useState(initialTab ?? tabs[0] ?? "");
  const [editing, setEditing] = useState(initialEditing && editable);
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tableDrafts, setTableDrafts] = useState<Record<string, Array<Record<string, unknown> & { name: string; idx: number }>>>({});
  const fieldsByName = useMemo(
    () => new Map(sections.flatMap((section) => section.fields).map((field) => [field.fieldname, field])),
    [sections],
  );
  const isNewBranch = payload.summary.doctype === "New Branch Details";
  const nbdProductLine = drafts.product_line ?? toInputValue(fieldsByName.get("product_line") || ({ value: "" } as DocumentField));
  const nbdZone = drafts.zone ?? toInputValue(fieldsByName.get("zone") || ({ value: "" } as DocumentField));
  const nbdRegion = drafts.region ?? toInputValue(fieldsByName.get("region") || ({ value: "" } as DocumentField));
  const nbdOptions = useQuery({
    queryKey: queryKeys.newBranchOptions({ product_line: nbdProductLine, zone: nbdZone, region: nbdRegion }),
    queryFn: () => getNewBranchCreateOptions({ product_line: nbdProductLine, zone: nbdZone, region: nbdRegion }),
    enabled: isNewBranch && editing,
  });

  function nbdField(field: DocumentField, value: string): DocumentField {
    if (!isNewBranch || !NBD_OPTION_FIELDS.has(field.fieldname)) {
      return withCurrentChoice(field, value);
    }
    const data = nbdOptions.data;
    const fromServer = field.choices || [];
    const fromMasters =
      field.fieldname === "product_line"
        ? data?.product_lines
        : field.fieldname === "year"
          ? data?.years
          : field.fieldname === "zone"
            ? data?.zones
            : field.fieldname === "region"
              ? data?.regions
              : field.fieldname === "area"
                ? data?.areas
                : undefined;
    const choices = uniqueChoices([value], fromMasters, fromServer);
    return withCurrentChoice({ ...field, choices }, value);
  }

  function onNbdFieldChange(fieldname: string, value: string) {
    setDrafts((current) => {
      const next = { ...current, [fieldname]: value };
      if (fieldname === "product_line") {
        next.year = "";
        next.zone = "";
        next.region = "";
        next.area = "";
      } else if (fieldname === "zone") {
        next.region = "";
        next.area = "";
      } else if (fieldname === "region") {
        next.area = "";
      }
      return next;
    });
  }
  const hasMapField = useMemo(
    () => Array.from(fieldsByName.values()).some(isGeolocationField),
    [fieldsByName],
  );
  const visibleTab = tabs.includes(activeTab) ? activeTab : tabs[0] ?? "";
  const changedScalars = Object.keys(drafts).filter((fieldname) => {
    const field = fieldsByName.get(fieldname);
    return field && drafts[fieldname] !== toInputValue(field);
  });
  const changedTables = Object.keys(tableDrafts);
  const changedCount = changedScalars.length + changedTables.length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const values: Record<string, unknown> = {};
    for (const fieldname of changedScalars) {
      const field = fieldsByName.get(fieldname);
      if (!field) continue;
      // geo_location is form read-only / auto-filled; backend allows it with map/lat/lng.
      if (field.read_only && field.fieldname !== "geo_location") continue;
      values[fieldname] = fromInputValue(field, drafts[fieldname]);
    }
    for (const fieldname of changedTables) {
      values[fieldname] = tableDrafts[fieldname];
    }
    if (await onSave(values)) {
      setDrafts({});
      setTableDrafts({});
      setEditing(false);
    }
  }

  function draftOrField(fieldname: string) {
    const field = fieldsByName.get(fieldname);
    if (!field) return "";
    return drafts[fieldname] ?? toInputValue(field);
  }

  function mapGeoValue(mapField: DocumentField) {
    const raw = draftOrField(mapField.fieldname);
    if (parseGeoJsonPoint(raw)) return raw;
    const lat = draftOrField("geo_latitude");
    const lng = draftOrField("geo_longitude");
    if (lat && lng && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return toMapGeoJson(lat, lng);
    }
    return raw;
  }

  function canEditMap(mapField: DocumentField) {
    if (!editing) return false;
    if (!mapField.read_only) return true;
    const lat = fieldsByName.get("geo_latitude");
    const lng = fieldsByName.get("geo_longitude");
    return Boolean((lat && !lat.read_only) || (lng && !lng.read_only));
  }

  function applyMapChange(mapField: DocumentField, geoJson: string, point: GeoPoint, address?: string) {
    setDrafts((current) => {
      const next = { ...current, [mapField.fieldname]: geoJson };
      if (fieldsByName.has("geo_latitude")) next.geo_latitude = formatCoordinate(point.latitude);
      if (fieldsByName.has("geo_longitude")) next.geo_longitude = formatCoordinate(point.longitude);
      if (address != null && fieldsByName.has("geo_location")) next.geo_location = address;
      return next;
    });
  }

  function renderField(field: DocumentField, spanWide: boolean) {
    if (hasMapField && MAP_COMPANION_FIELDS.has(field.fieldname)) return null;
    const isMap = isGeolocationField(field);
    const wide = spanWide && (isMap || field.fieldtype === "Table" || LONG_TEXT_TYPES.has(field.fieldtype));
    const canEdit = editing && !field.read_only;
    const mapEditable = isMap && canEditMap(field);
    return (
      <div key={field.fieldname} className={wide ? "min-w-0 md:col-span-2" : "min-w-0"}>
        <label htmlFor={`field-${field.fieldname}`} className="block text-xs font-medium text-slate-500">
          {field.label}
          {(canEdit || mapEditable) && field.reqd ? <span className="text-red-600"> *</span> : null}
        </label>
        {isMap ? (
          <div className="mt-1">
            <GeoMapField
              value={mapGeoValue(field)}
              editable={mapEditable}
              documentName={payload.summary.name}
              address={draftOrField("geo_location") || null}
              onChange={(geoJson, point) => applyMapChange(field, geoJson, point)}
              onAddressChange={(address) => {
                if (!fieldsByName.has("geo_location")) return;
                setDrafts((current) => ({ ...current, geo_location: address }));
              }}
            />
          </div>
        ) : field.fieldtype === "Table" ? (
          <div className="mt-1">
            <TableField
              field={field}
              editing={canEdit}
              value={tableDrafts[field.fieldname] ?? field.rows}
              onChange={(rows) => setTableDrafts((current) => ({ ...current, [field.fieldname]: rows }))}
            />
          </div>
        ) : canEdit && ATTACH_TYPES.has(field.fieldtype) ? (
          onUpload ? (
            <AttachInput
              field={field}
              blockedReason={changedCount ? "Save or cancel your other changes before uploading a file." : ""}
              onUpload={(file) => onUpload(field.fieldname, file)}
            />
          ) : (
            <div className="mt-1 text-sm text-slate-800">{displayValue(field, field.value)}</div>
          )
        ) : canEdit ? (
          <FieldInput
            field={nbdField(field, drafts[field.fieldname] ?? toInputValue(field))}
            value={drafts[field.fieldname] ?? toInputValue(field)}
            onChange={(value) =>
              isNewBranch && NBD_OPTION_FIELDS.has(field.fieldname)
                ? onNbdFieldChange(field.fieldname, value)
                : setDrafts((current) => ({ ...current, [field.fieldname]: value }))
            }
          />
        ) : (
          <div className="mt-1 text-sm text-slate-800">{displayValue(field, field.value)}</div>
        )}
        {(canEdit || mapEditable) && field.description && <p className="mt-1 text-xs text-slate-500">{field.description}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`space-y-4 ${editing ? "pb-20 md:pb-0" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!hideTabs && tabs.length > 1 ? (
          <div className="scroll-row -mx-1 flex max-w-full gap-2 overflow-x-auto px-1" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab || "main"}
                type="button"
                role="tab"
                aria-selected={tab === visibleTab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium ${
                  tab === visibleTab ? "bg-ims-drawer text-ims-ink ring-1 ring-ims-field-line" : "bg-white text-slate-600 ring-1 ring-ims-line hover:text-ims-ink"
                }`}
              >
                {tab || "Details"}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        {editable && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="ims-btn-primary">
            Edit
          </button>
        )}
        {editing && (
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 [&>button]:min-h-11 [&>button]:flex-1 md:[&>button]:flex-none">
            <button
              type="button"
              onClick={() => {
                setDrafts({});
                setTableDrafts({});
                setEditing(false);
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm ring-1 ring-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || changedCount === 0}
              className="ims-btn-primary disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save${changedCount ? ` (${changedCount})` : ""}`}
            </button>
          </div>
        )}
      </div>
      {!editable && (
        <p className="text-xs text-slate-500">Read only. Your role cannot edit this record at its current stage.</p>
      )}
      {(hideTabs ? sections : sections.filter((section) => section.tab === visibleTab)).length === 0 ? (
        <p className="text-sm text-slate-500">No fields are available on this tab for the current stage and role.</p>
      ) : null}
      {(hideTabs ? sections : sections.filter((section) => section.tab === visibleTab)).map((section, index) => {
          const columns = (section.columns?.length ? section.columns : [section.fields])
            .map((column) =>
              column.filter((field) => !(hasMapField && MAP_COMPANION_FIELDS.has(field.fieldname))),
            )
            .filter((column) => column.length > 0);
          if (columns.length === 0) return null;
          return (
            <fieldset key={`${section.label}-${index}`} className="min-w-0 rounded-2xl border border-slate-100 p-3 sm:p-4">
              {section.label && <legend className="px-1 text-sm font-semibold text-ims-primary">{section.label}</legend>}
              {columns.length > 1 ? (
                <div className={`grid gap-4 ${COLUMN_GRID[Math.min(columns.length, 4)]}`}>
                  {columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="flex min-w-0 flex-col gap-4">
                      {column.map((field) => renderField(field, false))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">{columns[0].map((field) => renderField(field, true))}</div>
              )}
            </fieldset>
          );
        })}
    </form>
  );
}
