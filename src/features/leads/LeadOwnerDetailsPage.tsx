import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { saveLeadPropertyDetails, uploadLeadDmsFile } from "@/api/leads";
import { BackButton, useSmartBack } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { SiteImageThumb } from "@/components/common/SiteImageThumb";
import { PACK_CONTROL_CLASS, PackFieldShell } from "@/features/leads/LeadPackForm";
import { PropertyVerificationStepper } from "@/features/leads/PropertyVerificationStepper";
import { SectionAwaitingApproval } from "@/features/leads/SectionAwaitingApproval";
import { SectionReviewBar, useCanEditLead, useSectionReviewAccess } from "@/features/leads/SectionReviewBar";
import { sectionAwaitingApproval, sectionLocked } from "@/features/leads/sectionReview";
import { usePropertyRecord } from "@/features/leads/usePropertyRecord";
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
      { key: "owner_type", label: "Owner Type", kind: "select", options: ["Primary", "Secondary"] },
      { key: "owner_landlord_name", label: "Landlord Name", kind: "text" },
      { key: "owner_dob", label: "Landlord DOB", kind: "date" },
      { key: "owners_age", label: "Landlord Age", kind: "readonly" },
      { key: "owners_father_or_spouse_name", label: "Owner's Father/Spouse Name", kind: "text" },
      { key: "owners_guardian_name", label: "Owner's Guardian Name", kind: "text" },
      { key: "owner_passport_size_photo", label: "Owner Passport Size Photo", kind: "attach", wide: true },
      { key: "owner_email_address", label: "Owner Email Address", kind: "text" },
      { key: "owner_details_required", label: "Owner Details Required", kind: "select", options: ["Yes", "No"] },
      { key: "complete_address_of_the_owner", label: "Complete Address Of The Owner", kind: "textarea", wide: true },
      { key: "owner_pincode", label: "Owner Pincode", kind: "text" },
      { key: "owner_phone_number", label: "Owner Phone Number", kind: "text" },
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
  fields.owner_type = "Primary";
  fields.owner_details_required = "Yes";
  fields.agreement_signed_by = "Self";
  return fields;
}

function ownerTypeBadge(value: string) {
  const type = value.trim() === "Secondary" ? "Secondary" : value.trim() === "Primary" ? "Primary" : "";
  if (!type) return null;
  const tone =
    type === "Primary"
      ? "bg-[#E8F1FF] text-[#2F6FED]"
      : "bg-[#FFF1E0] text-[#C27803]";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{type}</span>
  );
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

const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

function fieldHint(key: string, value: string) {
  const text = value.trim();
  if (!text) return "";
  if (key === "owner_phone_number" && !/^\d{10}$/.test(text)) return "Enter 10 digits.";
  if (key === "pan_number" && !PAN_PATTERN.test(text.toUpperCase())) return "Format ABCDE1234F.";
  if (key === "gst_number" && !GST_PATTERN.test(text.toUpperCase())) return "15 characters, for example 22AAAAA0000A1Z5.";
  if (key === "owner_pincode" && !/^\d{6}$/.test(text)) return "Enter a 6-digit PIN code.";
  return "";
}

const SHARE_FIELDS = [
  ["rentsd_payable_percentage", "Rent/SD Payable percentage"],
  ["maintenance_charges_payable_percentage", "Maintenance Charges Payable Percentage"],
] as const;

function percentNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function limitPercent(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const next = dot === -1 ? cleaned : `${cleaned.slice(0, dot)}.${cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
  if (!next || next === ".") return next === "." ? "0." : "";
  const number = Number(next);
  if (Number.isFinite(number) && number > 100) return "100";
  return next;
}

/** How much of 100% is still unassigned, including the value being typed on this owner. */
function shareLeft(rows: OwnerRow[], index: number, key: string, value: string) {
  const others = rows.reduce((sum, row, rowIndex) => {
    if (rowIndex === index) return sum;
    return sum + percentNumber(row.fields[key] || "");
  }, 0);
  const current = value.trim() ? percentNumber(value) : 0;
  return Math.round((100 - others - current) * 100) / 100;
}

function shareHint(rows: OwnerRow[], index: number, key: string, value: string) {
  if (!SHARE_FIELDS.some(([field]) => field === key)) return "";
  const left = shareLeft(rows, index, key, value);
  if (Math.abs(left) < 0.001) return value.trim() ? "100% allocated across owners." : "0% left.";
  if (left > 0) return `${formatPercent(left)}% left.`;
  return `${formatPercent(Math.abs(left))}% over 100%.`;
}

function shareTotalError(rows: OwnerRow[]) {
  for (const [key, label] of SHARE_FIELDS) {
    const values = rows.map((row) => (row.fields[key] || "").trim());
    if (values.every((value) => !value)) continue;
    const total = Math.round(values.reduce((sum, value) => sum + (value ? percentNumber(value) : 0), 0) * 100) / 100;
    const left = Math.round((100 - total) * 100) / 100;
    if (Math.abs(left) <= 0.01) continue;
    return left > 0
      ? `${label} must total 100% across owners. ${formatPercent(left)}% is still left.`
      : `${label} must total 100% across owners. It is ${formatPercent(Math.abs(left))}% over.`;
  }
  return "";
}

function limitField(key: string, value: string) {
  if (SHARE_FIELDS.some(([field]) => field === key)) return limitPercent(value);
  if (key === "owner_phone_number" || key === "owner_pincode") {
    const max = key === "owner_phone_number" ? 10 : 6;
    return value.replace(/\D/g, "").slice(0, max);
  }
  if (key === "pan_number") return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  if (key === "gst_number") return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  return value;
}

function ownerRowError(fields: Record<string, string>, index: number) {
  const who = fields.owner_landlord_name.trim() || `Owner ${index + 1}`;
  if (!fields.owner_type.trim()) {
    return `Owner Type is required for ${who}. Choose Primary or Secondary.`;
  }
  if (underAge(fields) && !fields.owners_guardian_name.trim()) {
    return `Owner's Guardian Name is mandatory for ${who} because owner age is below 18 years.`;
  }
  if (fields.gst_applicable === "Applicable") {
    if (!fields.pan_number.trim()) return `Pan Number is mandatory for ${who} when GST is Applicable.`;
    if (!fields.owner_pincode.trim()) return `Owner Pincode is mandatory for ${who} when GST is Applicable.`;
    if (!fields.gst_number.trim()) return `GST Number is mandatory for ${who} when GST is Applicable.`;
  }
  if (fields.owner_phone_number.trim() && !/^\d{10}$/.test(fields.owner_phone_number.trim())) {
    return `Owner Phone Number for ${who} must be 10 digits.`;
  }
  if (fields.pan_number.trim() && !PAN_PATTERN.test(fields.pan_number.trim().toUpperCase())) {
    return `Invalid PAN Number for ${who}. PAN should be in the format ABCDE1234F.`;
  }
  if (fields.owner_pincode.trim() && !/^\d{6}$/.test(fields.owner_pincode.trim())) {
    return `Invalid Owner PIN Code for ${who}. Enter a valid 6-digit PIN code.`;
  }
  if (fields.gst_number.trim() && !GST_PATTERN.test(fields.gst_number.trim().toUpperCase())) {
    return `Invalid GST Number for ${who}. Use 15 characters, for example 22AAAAA0000A1Z5.`;
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
    if (key === "name" || key === "owner_details_required" || key === "agreement_signed_by" || key === "owner_type") return false;
    return typeof value === "string" ? value.trim().length > 0 : value != null && value !== "";
  });
}

const NUMBER_KEYS = new Set(
  SECTIONS.flatMap((section) => section.fields.filter((field) => field.kind === "number").map((field) => field.key)),
);
const DATE_KEYS = new Set(
  SECTIONS.flatMap((section) => section.fields.filter((field) => field.kind === "date").map((field) => field.key)),
);

function ownerPayload(row: OwnerRow) {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row.fields)) {
    if (SYSTEM_KEYS.has(key)) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (NUMBER_KEYS.has(key)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) values[key] = numeric;
      continue;
    }
    values[key] = DATE_KEYS.has(key) ? trimmed : value;
  }
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
}

function OwnerPhotoField({
  value,
  onChange,
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localUrl, setLocalUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [viewing, setViewing] = useState(false);
  const stored = value.trim();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setBusy(true);
    onBusy?.(true);
    const preview = URL.createObjectURL(file);
    setLocalUrl(preview);
    try {
      const uploaded = await uploadLeadDmsFile(file, "Owner Passport Size Photo");
      onChange(uploaded.file_url || uploaded.dmsid);
    } catch (err) {
      setLocalUrl("");
      setUploadError(err instanceof Error ? err.message : "Could not upload the owner photo.");
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {localUrl || stored ? (
        <button type="button" className="w-fit" aria-label="View owner photo" onClick={() => setViewing(true)}>
          <SiteImageThumb
            localUrl={localUrl}
            storedUrl={stored}
            alt="Owner passport size photo"
            className="h-24 w-24 rounded-lg object-cover"
          />
        </button>
      ) : (
        <p className="text-[14px] leading-[18px] text-[#333]">No photo saved on this owner.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-white px-3 text-[13px] font-semibold text-ims-primary ring-1 ring-ims-line disabled:opacity-60"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Uploading…" : stored ? "Replace photo" : "Upload photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
        {localUrl || stored ? (
          <button type="button" className="text-[13px] font-semibold text-ims-primary" onClick={() => setViewing(true)}>
            View photo
          </button>
        ) : null}
      </div>
      {uploadError ? <p className="text-sm text-rose-600">{uploadError}</p> : null}
      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Owner photo">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close photo" onClick={() => setViewing(false)} />
          <div
            className="relative z-10 max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl bg-white p-3"
            onContextMenu={(event) => event.preventDefault()}
          >
            <SiteImageThumb
              localUrl={localUrl}
              storedUrl={stored}
              alt="Owner passport size photo"
              className="max-h-[75vh] w-auto max-w-full select-none object-contain"
            />
            <button type="button" className="mt-3 w-full text-[13px] font-semibold text-ims-primary" onClick={() => setViewing(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OwnerInput({
  field,
  value,
  required,
  note,
  onChange,
  onPhotoBusy,
}: {
  field: OwnerField;
  value: string;
  required: boolean;
  note?: string;
  onChange: (value: string) => void;
  onPhotoBusy?: (busy: boolean) => void;
}) {
  const hint = fieldHint(field.key, value) || note || "";
  const noteOnly = !fieldHint(field.key, value) && Boolean(note);
  return (
    <div className="flex h-full min-w-0 flex-col lg:contents">
      <PackFieldShell label={field.label} required={required} autoHeight={field.kind === "attach"}>
      {field.kind === "textarea" ? (
        <textarea
          className={`${PACK_CONTROL_CLASS} resize-none`}
          rows={1}
          placeholder="Enter"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.kind === "select" ? (
        <FieldSelect
          bare
          value={value}
          onChange={onChange}
          placeholder="Select"
          options={(field.options || []).filter(Boolean).map((option) => ({ value: option, label: option }))}
        />
      ) : field.kind === "attach" ? (
        <div className="px-[15px] pb-3 pt-8">
          <OwnerPhotoField value={value} onChange={onChange} onBusy={onPhotoBusy} />
        </div>
      ) : (
        <input
          className={PACK_CONTROL_CLASS}
          type={field.kind === "date" ? "date" : "text"}
          placeholder={field.kind === "readonly" ? undefined : "Enter"}
          inputMode={
            field.key === "owner_phone_number" || field.key === "owner_pincode"
              ? "numeric"
              : field.kind === "number"
                ? "decimal"
                : undefined
          }
          maxLength={
            field.key === "owner_phone_number" ? 10 : field.key === "pan_number" ? 10 : field.key === "gst_number" ? 15 : field.key === "owner_pincode" ? 6 : undefined
          }
          readOnly={field.kind === "readonly"}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(limitField(field.key, event.target.value))}
        />
      )}
      </PackFieldShell>
      <p className={`mt-1 text-[12px] leading-4 ${noteOnly ? "text-slate-500" : "text-rose-600"} ${hint ? "" : "hidden lg:block lg:invisible"}`}>{hint || " "}</p>
    </div>
  );
}

export function LeadOwnerDetailsPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const record = usePropertyRecord(name);
  const goBack = useSmartBack(record.hub);
  const [error, setError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [rows, setRows] = useState<OwnerRow[]>([emptyRow()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const hydratedFor = useRef("");
  const detail = record.detail;

  useEffect(() => {
    if (!detail.data || hydratedFor.current === name) return;
    hydratedFor.current = name;
    setRows(rowsFrom(detail.data as Record<string, unknown>));
    setActiveIndex(0);
  }, [detail.data, name]);

  const leadForAccess = (detail.data || {}) as Record<string, unknown>;
  const { canApprove } = useSectionReviewAccess(leadForAccess);
  const leadCanEdit = useCanEditLead(leadForAccess);
  const canEdit = record.prospectMode ? !record.converted : leadCanEdit;

  const save = useMutation({
    mutationFn: (current: OwnerRow[]) => {
      const owner_details = current.map(ownerPayload).filter(rowHasContent);
      return record.saveDetails({ owner_details });
    },
    onSuccess: async () => {
      await record.refresh();
      goBack();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save Owner Details."),
  });

  if (detail.isError || (!detail.isLoading && !detail.data)) {
    return <EmptyState title="Lead unavailable" body="Owner Details needs a valid Lead Request." />;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const primaryCount = rows.filter((item) => item.fields.owner_type === "Primary").length;
    if (primaryCount !== 1) {
      setError(primaryCount === 0 ? "One owner must be Primary." : "Only one owner can be Primary.");
      return;
    }
    for (let index = 0; index < rows.length; index += 1) {
      const message = ownerRowError(rows[index].fields, index);
      if (message) {
        setError(message);
        return;
      }
    }
    const shareError = shareTotalError(rows);
    if (shareError) {
      setError(shareError);
      return;
    }
    setError("");
    save.mutate(rows);
  }

  function setField(index: number, key: string, value: string) {
    const nextValue = limitField(key, value);
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (key === "owner_type" && nextValue === "Primary" && rowIndex !== index && row.fields.owner_type === "Primary") {
          return { ...row, fields: { ...row.fields, owner_type: "Secondary" } };
        }
        if (rowIndex !== index) return row;
        const fields = { ...row.fields, [key]: nextValue };
        if (key === "owner_dob") fields.owners_age = ageFromDob(nextValue) || fields.owners_age;
        return { ...row, fields };
      }),
    );
  }

  const lead = leadForAccess;
  const locked = record.prospectMode ? false : sectionLocked(lead, "Owner Details");
  const awaiting = !record.prospectMode && sectionAwaitingApproval(lead, "Owner Details") && !canApprove;
  const safeIndex = Math.min(activeIndex, Math.max(rows.length - 1, 0));
  const row = rows[safeIndex] || emptyRow();
  const extraKeys = Object.keys(row.fields).filter((key) => !KNOWN_KEYS.has(key) && row.fields[key]);

  function addOwner(type: "Primary" | "Secondary" = "Secondary") {
    const next = emptyRow();
    next.fields.owner_type = type;
    setRows((current) => {
      const list = [...current, next];
      setActiveIndex(list.length - 1);
      return list;
    });
    setListOpen(false);
  }

  function removeActiveOwner() {
    if (rows.length <= 1) return;
    setRows((current) => {
      const list = current.filter((_, rowIndex) => rowIndex !== safeIndex);
      setActiveIndex(Math.max(0, safeIndex - 1));
      return list;
    });
  }

  return (
    <section className="property-details w-full min-w-0 max-w-full space-y-4 text-[13px]">
      <PropertyVerificationStepper name={name} lead={lead} current="owner" recordBase={record.recordBase} />
      <div className="hidden items-start gap-3 lg:flex">
        <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold leading-snug text-ims-ink">Owner Details</h1>
          <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">
            Each landlord is one row of the Owner Details child table.
          </p>
        </div>
      </div>

      {detail.isLoading ? <SkeletonBlock className="h-64" /> : null}
      {detail.isLoading ? null : awaiting ? (
        <SectionAwaitingApproval lead={lead} sectionLabel="Owner Details" />
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ims-ink">Owner Details</h2>
            <div className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-ims-primary">
              <button type="button" onClick={() => setListOpen(true)}>
                View Owners List
              </button>
              {canEdit && !locked ? (
                <>
                  <span className="font-normal text-slate-300" aria-hidden>
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => addOwner(rows.some((item) => item.fields.owner_type === "Primary") ? "Secondary" : "Primary")}
                  >
                    Add Owner
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <fieldset disabled={locked || !canEdit} className="min-w-0 space-y-5 disabled:opacity-80">

            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-slate-500">
                Editing owner {safeIndex + 1} of {rows.length}
                {row.fields.owner_type ? ` · ${row.fields.owner_type}` : ""}
                {row.fields.owner_landlord_name ? ` · ${row.fields.owner_landlord_name}` : ""}
              </p>
              {rows.length > 1 ? (
                <button type="button" className="text-[13px] font-semibold text-rose-700" onClick={removeActiveOwner}>
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
                  <h3 className="text-[13px] font-semibold text-ims-ink">{section.label}</h3>
                  <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3">
                    {fields.map((field) => (
                      <div key={field.key} className={field.wide ? "min-w-0 lg:col-span-2" : "min-w-0 lg:grid lg:grid-rows-subgrid lg:row-span-2"}>
                        <OwnerInput
                          field={field}
                          required={ownerRequired(field.key, row.fields)}
                          value={row.fields[field.key] || ""}
                          note={shareHint(rows, safeIndex, field.key, row.fields[field.key] || "")}
                          onChange={(value) => setField(safeIndex, field.key, value)}
                          onPhotoBusy={setPhotoUploading}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {extraKeys.length ? (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold text-ims-ink">Other saved fields</h3>
                <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2 lg:gap-x-4">
                    {extraKeys.map((key) => (
                      <div key={key} className="min-w-0">
                        <PackFieldShell label={labelFor(key)}>
                          <input
                            className={PACK_CONTROL_CLASS}
                            placeholder="Enter"
                            value={row.fields[key] || ""}
                            onChange={(event) => setField(safeIndex, key, event.target.value)}
                          />
                        </PackFieldShell>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {canEdit ? (
              <div className="sticky bottom-0 z-10 -mx-3 bg-ims-surface/95 px-3 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
                <button type="submit" className="ims-btn-primary w-full min-h-12 sm:w-auto sm:min-w-40" disabled={save.isPending || photoUploading}>
                  {photoUploading ? "Uploading photo…" : save.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </fieldset>
          {record.prospectMode ? null : (
          <SectionReviewBar
            name={name}
            lead={lead}
            section="Owner Details"
            beforeSubmit={async () => {
              const primaryCount = rows.filter((item) => item.fields.owner_type === "Primary").length;
              if (primaryCount !== 1) {
                throw new Error(primaryCount === 0 ? "One owner must be Primary." : "Only one owner can be Primary.");
              }
              for (let index = 0; index < rows.length; index += 1) {
                const message = ownerRowError(rows[index].fields, index);
                if (message) throw new Error(message);
              }
              const shareError = shareTotalError(rows);
              if (shareError) throw new Error(shareError);
              const owner_details = rows.map(ownerPayload).filter(rowHasContent);
              await saveLeadPropertyDetails(name, { owner_details });
            }}
          />
          )}
        </form>
      )}

      {listOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owners-list-title"
        >
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close owners list" onClick={() => setListOpen(false)} />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[28px] bg-white shadow-2xl sm:rounded-3xl">
            <div className="px-5 pb-2 pt-4">
              <p id="owners-list-title" className="text-[13px] font-semibold text-ims-primary">
                Owner&apos;s List
              </p>
            </div>
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-3">
              {rows.map((item, index) => {
                const label = item.fields.owner_landlord_name.trim() || `Owner ${index + 1}`;
                const selected = index === safeIndex;
                return (
                  <li key={asText(item.raw.name) || `owner-list-${index}`}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left ${
                        selected ? "border-ims-primary/40 bg-[#F5F7FF]" : "border-ims-line bg-white"
                      }`}
                      onClick={() => {
                        setActiveIndex(index);
                        setListOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ims-ink">{label}</span>
                        <span className="mt-1.5 block">{ownerTypeBadge(item.fields.owner_type)}</span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ims-line text-ims-primary">
                        <Eye className="h-4 w-4" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-3 border-t border-ims-line px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button type="button" className="ims-btn-secondary min-h-12 flex-1" onClick={() => setListOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ims-btn-primary min-h-12 flex-1"
                disabled={locked || !canEdit}
                onClick={() => addOwner(rows.some((item) => item.fields.owner_type === "Primary") ? "Secondary" : "Primary")}
              >
                Add Owner
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
