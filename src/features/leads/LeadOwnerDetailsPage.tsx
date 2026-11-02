import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeadDetail, saveLeadPropertyDetails } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { sectionLocked } from "@/features/leads/sectionReview";
import { ApiError } from "@/types/api";

type FieldKind = "text" | "textarea" | "number" | "date" | "select" | "attach" | "readonly";

type OwnerField = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  wide?: boolean;
};

type OwnerSection = {
  id: string;
  label: string;
  fields: OwnerField[];
};

/** Field order and labels from NBO Owner Details (Lead Request.owner_details). */
const SECTIONS: OwnerSection[] = [
  {
    id: "owner_details_section",
    label: "Owner Contact Details",
    fields: [
      { key: "owner_landlord_name", label: "Owner/Landlord Name", kind: "text" },
      { key: "owners_age", label: "Owner's Age", kind: "readonly" },
      { key: "owners_father_or_spouse_name", label: "Owner's Father/Spouse Name", kind: "text" },
      { key: "owners_guardian_name", label: "Owner's Guardian Name", kind: "text" },
      { key: "owner_passport_size_photo", label: "Owner Passport Size Photo", kind: "attach", wide: true },
      { key: "owner_email_address", label: "Owner Email Address", kind: "text" },
      { key: "owner_details_required", label: "Owner Details Required", kind: "select", options: ["Yes", "No"] },
      { key: "complete_address_of_the_owner", label: "Complete Address Of The Owner", kind: "textarea", wide: true },
      { key: "owner_pincode", label: "Owner Pincode", kind: "text" },
      { key: "owner_dob", label: "Owner DOB", kind: "date" },
      { key: "owner_phone_number", label: "Owner Phone Number", kind: "text" },
      { key: "owner_claim_number", label: "Owner Claim Number", kind: "readonly" },
    ],
  },
  {
    id: "owner_document_section",
    label: "Owner Document",
    fields: [
      { key: "pan_number", label: "Pan Number", kind: "text" },
      { key: "gst_applicable", label: "GST Applicable", kind: "select", options: ["", "Applicable", "Not Applicable"] },
      { key: "msme_applicable", label: "MSME Applicable", kind: "select", options: ["", "Applicable", "Not Applicable"] },
      { key: "gst_number", label: "GST Number", kind: "text" },
    ],
  },
  {
    id: "branch_rent_related_details_section",
    label: "Branch Rent Related Details",
    fields: [
      { key: "rentsd_payable_name", label: "Rent/SD Payable in the Name", kind: "text" },
      { key: "rentsd_payable_percentage", label: "Rent/SD Payable percentage", kind: "number" },
    ],
  },
  {
    id: "rent_maintenance_related_details_section",
    label: "Branch Maintenance Related Details",
    fields: [
      { key: "maintenance_charges_payable_name", label: "Maintenance Charges Payable in the Name", kind: "text" },
      { key: "monthly_fixed_charges", label: "Any Other Monthly Fixed Charges to be Paid in the Name of", kind: "text", wide: true },
      { key: "maintenance_charges_payable_percentage", label: "Maintenance Charges Payable Percentage", kind: "number" },
    ],
  },
  {
    id: "owner_agreement_related_section",
    label: "Owner Agreement Related",
    fields: [
      { key: "agreement_signed_by", label: "Agreement signed by", kind: "select", options: ["Self", "POA/Authorised Personnel"] },
      { key: "board_resolution_or_poa_date", label: "Board Resolution or POA Date", kind: "date" },
      { key: "legal_status", label: "Legal Status", kind: "select", options: ["", "Individual", "HUF", "Firm"] },
    ],
  },
  {
    id: "poa_or_authorised_signatory_related_section",
    label: "POA or Authorised Signatory Related",
    fields: [
      { key: "poasauthorised_signatorys_name", label: "POA's/Authorised Signatory's Name", kind: "text" },
      { key: "poasauthorised_signatorys_fathers_or_spouse_name", label: "POA's/Authorised Signatory's Father Or Spouse Name", kind: "text" },
      { key: "poas_authorised_signatorys_age", label: "POA's/Authorised Signatory's Age", kind: "number" },
      { key: "poasauthorised_signatorys_complete_address", label: "POA's/Authorised Signatory's Complete Address", kind: "textarea", wide: true },
    ],
  },
];

const KNOWN_KEYS = new Set(SECTIONS.flatMap((section) => section.fields.map((field) => field.key)));
const SYSTEM_KEYS = new Set([
  "name",
  "owner",
  "creation",
  "modified",
  "modified_by",
  "parent",
  "parentfield",
  "parenttype",
  "idx",
  "doctype",
  "docstatus",
]);

type OwnerRow = {
  raw: Record<string, unknown>;
  fields: Record<string, string>;
};

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

function labelFor(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ageFromDob(value: string) {
  if (!value) return "";
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const month = today.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
}

function emptyFields() {
  const fields: Record<string, string> = {};
  for (const key of KNOWN_KEYS) fields[key] = "";
  fields.owner_details_required = "Yes";
  fields.agreement_signed_by = "Self";
  return fields;
}

function emptyRow(): OwnerRow {
  return { raw: {}, fields: emptyFields() };
}

function rowFrom(raw: Record<string, unknown>): OwnerRow {
  const fields = emptyFields();
  for (const key of KNOWN_KEYS) {
    if (raw[key] != null && raw[key] !== "") fields[key] = asText(raw[key]);
  }
  for (const [key, value] of Object.entries(raw)) {
    if (SYSTEM_KEYS.has(key) || KNOWN_KEYS.has(key)) continue;
    if (value == null || typeof value === "object") continue;
    fields[key] = String(value);
  }
  if (!fields.owners_age && fields.owner_dob) fields.owners_age = ageFromDob(fields.owner_dob);
  return { raw, fields };
}

function rowsFrom(lead: Record<string, unknown>): OwnerRow[] {
  const rows = Array.isArray(lead.owner_details) ? lead.owner_details : [];
  const mapped = rows.map((raw) => rowFrom(raw as Record<string, unknown>));
  return mapped.length ? mapped : [emptyRow()];
}

function isPoa(fields: Record<string, string>) {
  return fields.agreement_signed_by === "POA/Authorised Personnel";
}

function underAge(fields: Record<string, string>) {
  const age = Number(fields.owners_age);
  return Number.isFinite(age) && age > 0 && age < 18;
}

function sectionVisible(id: string, fields: Record<string, string>) {
  if (id === "owner_document_section") return fields.owner_details_required === "Yes";
  if (id === "poa_or_authorised_signatory_related_section") return isPoa(fields);
  return true;
}

function fieldVisible(field: OwnerField, fields: Record<string, string>) {
  if (field.key === "owners_guardian_name") return underAge(fields);
  if (field.key === "pan_number" || field.key === "gst_applicable" || field.key === "msme_applicable") {
    return fields.owner_details_required === "Yes";
  }
  if (field.key === "gst_number") return fields.owner_details_required === "Yes" && fields.gst_applicable === "Applicable";
  if (field.key === "board_resolution_or_poa_date" || field.key.startsWith("poas")) return isPoa(fields);
  return true;
}

function ownerRequired(key: string, fields: Record<string, string>) {
  if (key === "owners_guardian_name") return underAge(fields);
  if (fields.gst_applicable === "Applicable" && (key === "pan_number" || key === "owner_pincode" || key === "gst_number")) return true;
  if (isPoa(fields) && (key === "board_resolution_or_poa_date" || key.startsWith("poas"))) return true;
  return false;
}

function ownerRowError(fields: Record<string, string>, index: number) {
  const who = fields.owner_landlord_name.trim() || `Owner ${index + 1}`;
  if (underAge(fields) && !fields.owners_guardian_name.trim()) {
    return `Owner's Guardian Name is mandatory for ${who} because owner age is below 18 years.`;
  }
  if (fields.gst_applicable === "Applicable") {
    if (!fields.pan_number.trim()) return `Pan Number is mandatory for ${who} when GST is Applicable.`;
    if (!fields.owner_pincode.trim()) return `Owner Pincode is mandatory for ${who} when GST is Applicable.`;
    if (!fields.gst_number.trim()) return `GST Number is mandatory for ${who} when GST is Applicable.`;
  }
  if (fields.pan_number.trim() && !/^[A-Z]{5}\d{4}[A-Z]$/.test(fields.pan_number.trim().toUpperCase())) {
    return `Invalid PAN Number for ${who}. PAN should be in the format ABCDE1234F.`;
  }
  if (fields.owner_pincode.trim() && !/^\d{6}$/.test(fields.owner_pincode.trim())) {
    return `Invalid Owner PIN Code for ${who}. Enter a valid 6-digit PIN code.`;
  }
  if (fields.gst_applicable === "Applicable" && fields.gst_number.trim().length !== 15) {
    return `GST Number for ${who} must be 15 characters.`;
  }
  if (isPoa(fields)) {
    const poa: [string, string][] = [
      ["board_resolution_or_poa_date", "Board Resolution or POA Date"],
      ["poasauthorised_signatorys_name", "POA's/Authorised Signatory's Name"],
      ["poasauthorised_signatorys_fathers_or_spouse_name", "POA's/Authorised Signatory's Father Or Spouse Name"],
      ["poas_authorised_signatorys_age", "POA's/Authorised Signatory's Age"],
      ["poasauthorised_signatorys_complete_address", "POA's/Authorised Signatory's Complete Address"],
    ];
    for (const [key, label] of poa) {
      if (!fields[key]?.trim()) return `${label} is mandatory for ${who} when Agreement signed by is POA/Authorised Personnel.`;
    }
    if (fields.board_resolution_or_poa_date > new Date().toISOString().slice(0, 10)) {
      return `Board Resolution or POA Date for ${who} cannot be a future date.`;
    }
  }
  if (fields.owner_dob && fields.owner_dob > new Date().toISOString().slice(0, 10)) {
    return `Date of Birth cannot be in the future for ${who}.`;
  }
  return "";
}

function rowHasContent(row: Record<string, unknown>) {
  return Object.entries(row).some(([key, value]) => {
    if (key === "name" || key === "owner_details_required" || key === "agreement_signed_by") return false;
    return typeof value === "string" ? value.trim().length > 0 : value != null && value !== "";
  });
}

export function LeadOwnerDetailsPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [rows, setRows] = useState<OwnerRow[]>([emptyRow()]);

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  useEffect(() => {
    if (!detail.data) return;
    setRows(rowsFrom(detail.data as Record<string, unknown>));
  }, [detail.data]);

  const save = useMutation({
    mutationFn: () => {
      const owner_details = rows
        .map((row) => {
          const values: Record<string, unknown> = { ...row.raw };
          for (const key of SYSTEM_KEYS) {
            if (key !== "name") delete values[key];
          }
          for (const [key, value] of Object.entries(row.fields)) values[key] = value;
          if (!isPoa(row.fields)) {
            values.board_resolution_or_poa_date = "";
            values.poasauthorised_signatorys_name = "";
            values.poasauthorised_signatorys_fathers_or_spouse_name = "";
            values.poas_authorised_signatorys_age = "";
            values.poasauthorised_signatorys_complete_address = "";
          }
          if (!underAge(row.fields)) values.owners_guardian_name = "";
          if (row.fields.gst_applicable !== "Applicable") values.gst_number = "";
          return values;
        })
        .filter(rowHasContent);
      return saveLeadPropertyDetails(name, { owner_details });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      navigate(-1);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save Owner Details."),
  });

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="Owner Details needs a valid Lead Request." />;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    for (let index = 0; index < rows.length; index += 1) {
      const message = ownerRowError(rows[index].fields, index);
      if (message) {
        setError(message);
        return;
      }
    }
    setError("");
    save.mutate();
  }

  function setField(index: number, key: string, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const fields = { ...row.fields, [key]: value };
        if (key === "owner_dob") fields.owners_age = ageFromDob(value) || fields.owners_age;
        return { ...row, fields };
      }),
    );
  }

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
      <label className="block h-full min-w-0 space-y-1.5 rounded-2xl border border-ims-line bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(31,37,71,0.04)]">
        <span className="block break-words text-[13px] font-semibold leading-snug text-ims-ink">{label}</span>
        <div className="min-w-0 max-w-full [&_.ims-field]:w-full [&_input]:w-full [&_textarea]:w-full">{children}</div>
      </label>
    );
  }

  return (
    <section className="property-details w-full min-w-0 max-w-full space-y-4 text-[13px]">
      <div className="flex items-start gap-3">
        <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold leading-snug text-ims-ink">Owner Details</h1>
          <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">
            Each landlord is one row of the Owner Details child table.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <fieldset disabled={sectionLocked(detail.data as Record<string, unknown>, "Property Verification")} className="min-w-0 space-y-5 disabled:opacity-70">
        {rows.map((row, index) => {
          const extraKeys = Object.keys(row.fields).filter((key) => !KNOWN_KEYS.has(key) && row.fields[key]);
          return (
            <section key={asText(row.raw.name) || `owner-${index}`} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold text-ims-ink">
                  Owner {index + 1}
                  {row.fields.owner_landlord_name ? ` · ${row.fields.owner_landlord_name}` : ""}
                </h2>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    className="text-[13px] font-semibold text-rose-700"
                    onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              {SECTIONS.map((section) => {
                if (!sectionVisible(section.id, row.fields)) return null;
                const fields = section.fields.filter((field) => fieldVisible(field, row.fields));
                if (!fields.length) return null;
                return (
                  <div key={section.id} className="space-y-3">
                    <h3 className="text-[13px] font-semibold text-slate-500">{section.label}</h3>
                    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                      {fields.map((field) => (
                        <div key={field.key} className={field.wide ? "min-w-0 sm:col-span-2" : "min-w-0"}>
                          <OwnerInput field={field} required={ownerRequired(field.key, row.fields)} value={row.fields[field.key] || ""} onChange={(value) => setField(index, field.key, value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {extraKeys.length ? (
                <div className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-slate-500">Other saved fields</h3>
                  <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                    {extraKeys.map((key) => (
                      <div key={key} className="min-w-0">
                        <Field label={labelFor(key)}>
                          <input
                            className="ims-field mt-1 w-full"
                            value={row.fields[key] || ""}
                            onChange={(event) => setField(index, key, event.target.value)}
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}

        <button type="button" className="ims-btn-secondary" onClick={() => setRows((current) => [...current, emptyRow()])}>
          Add owner
        </button>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="sticky bottom-0 z-10 -mx-3 bg-ims-surface/95 px-3 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
          <button type="submit" className="ims-btn-primary w-full min-h-12 sm:w-auto sm:min-w-40" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
        </fieldset>
      </form>
    </section>
  );

  function OwnerInput({
    field,
    value,
    required,
    onChange,
  }: {
    field: OwnerField;
    value: string;
    required: boolean;
    onChange: (value: string) => void;
  }) {
    return (
                      <Field label={`${field.label}${required ? " *" : ""}`}>
        {field.kind === "textarea" ? (
          <textarea className="ims-field mt-1 min-h-[72px] w-full" value={value} onChange={(event) => onChange(event.target.value)} />
        ) : field.kind === "select" ? (
          <FieldSelect
            className="mt-1"
            value={value}
            onChange={onChange}
            placeholder="Select"
            options={(field.options || []).filter(Boolean).map((option) => ({ value: option, label: option }))}
          />
        ) : field.kind === "attach" ? (
          <p className="mt-1 break-all text-[13px] text-slate-600">{value || "No photo saved on this owner."}</p>
        ) : (
          <input
            className="ims-field mt-1 w-full"
            type={field.kind === "date" ? "date" : "text"}
            inputMode={field.kind === "number" ? "decimal" : undefined}
            readOnly={field.kind === "readonly"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
    );
  }
}
