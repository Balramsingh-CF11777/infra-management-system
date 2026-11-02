import type { ReactNode } from "react";
import { FieldSelect } from "@/components/common/FieldSelect";
import type { PackField } from "@/features/leads/leadPackFields";

export function packVisible(field: PackField, values: Record<string, string>) {
  if (!field.showWhen) return true;
  return values[field.showWhen.key] === field.showWhen.equals;
}

export function packRequired(field: PackField, values: Record<string, string>) {
  if (!field.requiredWhen) return false;
  return values[field.requiredWhen.key] === field.requiredWhen.equals;
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
  return (
    <label className="block h-full min-w-0 space-y-1.5 rounded-2xl border border-ims-line bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(31,37,71,0.04)]">
      <span className="block break-words text-[13px] font-semibold leading-snug text-ims-ink">
        {field.label.trim()}
        {required ? " *" : ""}
      </span>
      <div className="min-w-0 max-w-full [&_.ims-field]:w-full [&_input]:w-full [&_textarea]:w-full">
        {field.kind === "textarea" ? (
          <textarea className="ims-field mt-1 min-h-[72px] w-full" value={value} onChange={(event) => onChange(event.target.value)} />
        ) : field.kind === "select" ? (
          <FieldSelect
            className="mt-1"
            value={value}
            placeholder="Select"
            options={options.map((option) => ({ value: option, label: option }))}
            onChange={onChange}
          />
        ) : (
          <input
            className="ims-field mt-1 w-full"
            inputMode={field.kind === "number" ? "decimal" : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </div>
    </label>
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
