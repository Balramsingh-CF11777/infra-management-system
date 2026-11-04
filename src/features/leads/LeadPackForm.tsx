import type { ReactNode } from "react";
import { FieldSelect } from "@/components/common/FieldSelect";
import { FloatField, floatControlClass } from "@/components/common/FloatField";
import type { PackField } from "@/features/leads/leadPackFields";

/** Value line inside the shared floating-label box. */
export const PACK_CONTROL_CLASS = floatControlClass;

/** Labelled field chrome shared by Property, Owner, and Facility details. */
export function PackFieldShell({
  label,
  required = false,
  children,
  className = "",
  autoHeight = false,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  autoHeight?: boolean;
}) {
  return (
    <FloatField label={`${label.trim()}${required ? " *" : ""}`} className={className} autoHeight={autoHeight}>
      {children}
    </FloatField>
  );
}

function rulesMatch(rule: PackField["showWhen"], values: Record<string, string>) {
  if (!rule) return true;
  const rules = Array.isArray(rule) ? rule : [rule];
  return rules.every((item) => values[item.key] === item.equals);
}

export function packVisible(field: PackField, values: Record<string, string>) {
  return rulesMatch(field.showWhen, values);
}

export function packRequired(field: PackField, values: Record<string, string>) {
  if (!field.requiredWhen) return false;
  return rulesMatch(field.requiredWhen, values);
}

export function missingPackFields(fields: PackField[], values: Record<string, string>) {
  return fields.filter((field) => packVisible(field, values) && packRequired(field, values) && !values[field.key]?.trim());
}

export function LeadPackFields({
  title,
  fields,
  values,
  onChange,
  disabled = false,
}: {
  title: string;
  fields: PackField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  const visible = fields.filter((field) => packVisible(field, values));
  if (!visible.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-semibold text-ims-ink">{title}</h2>
      <fieldset disabled={disabled} className="grid grid-cols-1 items-start gap-3 disabled:opacity-70 sm:grid-cols-2">
        {visible.map((field) => (
          <div key={field.key} className={field.wide ? "min-w-0 sm:col-span-2" : "min-w-0"}>
            <PackControl field={field} value={values[field.key] || ""} required={packRequired(field, values)} onChange={(value) => onChange(field.key, value)} />
          </div>
        ))}
      </fieldset>
    </section>
  );
}

function PackControl({
  field,
  value,
  required,
  onChange,
}: {
  field: PackField;
  value: string;
  required: boolean;
  onChange: (value: string) => void;
}) {
  const options = field.options.some((option) => option === value) || !value
    ? field.options
    : [value, ...field.options];
  const control = (
    <input
      className={PACK_CONTROL_CLASS}
      placeholder={field.key === "rent_per_sq_feet" ? "Monthly rent ÷ built-up area" : "Enter"}
      inputMode={field.kind === "number" ? "decimal" : undefined}
      readOnly={field.key === "rent_per_sq_feet"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
  if (field.kind === "select") {
    return (
      <FieldSelect
        floated
        label={`${field.label.trim()}${required ? " *" : ""}`}
        value={value}
        placeholder="Select"
        options={options.map((option) => ({ value: option, label: option }))}
        onChange={onChange}
      />
    );
  }
  return (
    <PackFieldShell label={field.label} required={required}>
      {field.kind === "textarea" ? (
        <textarea className={`${PACK_CONTROL_CLASS} resize-none`} rows={1} placeholder="Enter" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        control
      )}
    </PackFieldShell>
  );
}

export function PackSaveBar({ pending, children }: { pending: boolean; children?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-3 bg-ims-surface/95 px-3 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
      <button type="submit" className="ims-btn-primary w-full min-h-12 sm:w-auto sm:min-w-40" disabled={pending}>
        {children || (pending ? "Saving…" : "Save")}
      </button>
    </div>
  );
}
