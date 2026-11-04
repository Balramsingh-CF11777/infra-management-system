import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveLeadPropertyDetails, saveLeadSiteVerification } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { FieldSelect } from "@/components/common/FieldSelect";
import { useCanSubmitLeadSection } from "@/features/leads/SectionReviewBar";
import { ShortlistingChecklist } from "@/features/leads/ShortlistingChecklist";
import { INDIA_STATES, stateFromLead } from "@/features/leads/indiaStates";
import { rentPerSqft } from "@/features/leads/rentPerSqft";
import { SITE_CHECK_FLAGS, SITE_CHECK_YES, emptyShortlisting, shortlistingFromLead, siteCheckYesForLead } from "@/features/leads/siteVerification";
import { ApiError } from "@/types/api";

const YES_NO = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const EXIT_NOTICE = [
  { value: "30 Days", label: "30 Days" },
  { value: "60 Days", label: "60 Days" },
  { value: "90 Days", label: "90 Days" },
];

const ESCALATION_BASIS = [
  { value: "On the last paid rent", label: "On the last paid rent" },
  { value: "On the base rent", label: "On the base rent" },
];

type OwnerRow = {
  owner_landlord_name: string;
  owner_phone_number: string;
  pan_number: string;
  owner_type: string;
};

type FormState = {
  checks: Record<string, boolean>;
  shortlisting: Record<string, boolean>;
  yesNo: Record<string, string>;
  complete_address_of_the_property: string;
  proposed_floor_level: string;
  pin_code: string;
  state: string;
  rental_or_lease: string;
  built_up_area_sqft: string;
  carpet_area_sqft: string;
  monthly_rent: string;
  maintenance: string;
  rent_per_sq_feet: string;
  security_deposit_amount: string;
  rent_escalation: string;
  rent_escalation_basis: string;
  lease_period: string;
  lock_in_period: string;
  lease_exit_notice_period_from_lessee: string;
  brokerage_applicable: string;
  stamp_duty_and_legal_expense_sharing_ratio_for_registration: string;
  is_advance_amount_applicable: string;
  recovery_period_months: string;
  rent_free_period_days: string;
  advance_rent_amount: string;
  parking_type: string;
  parking_number_of_two_wheeler: string;
  parking_number_of_four_wheeler: string;
  lift_availability: string;
  power_backup_available: string;
  owners: OwnerRow[];
};

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function ownersFrom(lead: Record<string, unknown>): OwnerRow[] {
  const rows = Array.isArray(lead.owner_details) ? lead.owner_details : [];
  const mapped = rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      owner_landlord_name: text(row.owner_landlord_name),
      owner_phone_number: text(row.owner_phone_number),
      pan_number: text(row.pan_number),
      owner_type: text(row.owner_type) || "Primary",
    };
  });
  return mapped.length
    ? mapped
    : [{ owner_landlord_name: "", owner_phone_number: "", pan_number: "", owner_type: "Primary" }];
}

function formFrom(lead: Record<string, unknown>): FormState {
  const checks: Record<string, boolean> = {};
  for (const item of SITE_CHECK_FLAGS) checks[item.key] = Boolean(Number(lead[item.key]));
  const yesNo: Record<string, string> = {};
  for (const item of SITE_CHECK_YES) yesNo[item.key] = text(lead[item.key]);
  return {
    checks,
    shortlisting: shortlistingFromLead(lead),
    yesNo,
    complete_address_of_the_property: text(lead.complete_address_of_the_property),
    proposed_floor_level: text(lead.proposed_floor_level),
    pin_code: text(lead.pin_code),
    state: stateFromLead(lead),
    rental_or_lease: text(lead.rental_or_lease),
    built_up_area_sqft: text(lead.built_up_area_sqft),
    carpet_area_sqft: text(lead.carpet_area_sqft),
    monthly_rent: text(lead.monthly_rent),
    maintenance: text(lead.maintenance),
    rent_per_sq_feet: rentPerSqft(lead.monthly_rent, lead.built_up_area_sqft) || text(lead.rent_per_sq_feet),
    security_deposit_amount: text(lead.security_deposit_amount),
    rent_escalation: text(lead.rent_escalation),
    rent_escalation_basis: text(lead.rent_escalation_basis),
    lease_period: text(lead.lease_period),
    lock_in_period: text(lead.lock_in_period),
    lease_exit_notice_period_from_lessee: text(lead.lease_exit_notice_period_from_lessee),
    brokerage_applicable: text(lead.brokerage_applicable),
    stamp_duty_and_legal_expense_sharing_ratio_for_registration: text(
      lead.stamp_duty_and_legal_expense_sharing_ratio_for_registration,
    ),
    is_advance_amount_applicable: text(lead.is_advance_amount_applicable),
    recovery_period_months: text(lead.recovery_period_months),
    rent_free_period_days: text(lead.rent_free_period_days),
    advance_rent_amount: text(lead.advance_rent_amount),
    parking_type: text(lead.parking_type),
    parking_number_of_two_wheeler: text(lead.parking_number_of_two_wheeler),
    parking_number_of_four_wheeler: text(lead.parking_number_of_four_wheeler),
    lift_availability: text(lead.lift_availability),
    power_backup_available: text(lead.power_backup_available),
    owners: ownersFrom(lead),
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-[12px] font-semibold text-ims-ink">{label}</span>
      {children}
    </label>
  );
}

function Section({
  id,
  title,
  visible,
  children,
}: {
  id: string;
  title: string;
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) return null;
  return (
    <section id={`stage-${id}`} className="ims-card scroll-mt-24 px-4 py-4 sm:px-5">
      <h2 className="text-[12px] font-semibold tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export type StageAction = "submit" | "approve" | "rework" | "reject";

export function LeadVerificationForm({
  name,
  lead,
  activeStage,
  hint,
  comment,
  onComment,
  busy,
  locked = false,
  fieldsLocked = false,
  inputsLocked,
  canRework = false,
  approveDisabled,
  approveTitle,
  onAction,
  onRequestRework,
}: {
  name: string;
  lead: Record<string, unknown>;
  activeStage: string;
  hint: string;
  comment: string;
  onComment: (value: string) => void;
  busy: boolean;
  locked?: boolean;
  fieldsLocked?: boolean;
  /** Locks the inputs without hiding Approve / Re-Work. */
  inputsLocked?: boolean;
  canRework?: boolean;
  approveDisabled: boolean;
  approveTitle?: string;
  onRequestRework?: () => void;
  onAction: (
    action: StageAction,
    payload?: { checks?: Record<string, unknown>; values?: Record<string, unknown> },
  ) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const canSubmit = useCanSubmitLeadSection(lead);
  const [form, setForm] = useState(() => formFrom(lead));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);
  const fieldsReadOnly = inputsLocked ?? fieldsLocked;

  useEffect(() => {
    setForm(formFrom(lead));
  }, [lead]);

  function siteChecksPayload() {
    const yesChecks = siteCheckYesForLead(lead);
    const shortlisting = form.shortlisting || emptyShortlisting();
    return {
      ...Object.fromEntries(SITE_CHECK_FLAGS.map((item) => [item.key, Boolean(form.checks[item.key])])),
      ...Object.fromEntries(yesChecks.map((item) => [item.key, form.yesNo[item.key] || ""])),
      ...shortlisting,
      shortlisting_checklist: JSON.stringify(shortlisting),
    };
  }

  function propertyValuesPayload() {
    const { checks: _checks, shortlisting: _shortlisting, yesNo: _yesNo, owners, ...fields } = form;
    return {
      ...fields,
      owner_details: owners.filter((row) => row.owner_landlord_name || row.owner_phone_number || row.pan_number),
    };
  }

  const save = useMutation({
    mutationFn: async () => {
      if (activeStage === "site") {
        await saveLeadSiteVerification(name, siteChecksPayload());
        return;
      }
      if (activeStage === "property" || activeStage === "rent") {
        await saveLeadPropertyDetails(name, propertyValuesPayload());
      }
    },
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    },
    onError: (err) => {
      setSaved("");
      setError(err instanceof ApiError ? err.message : "Could not save verification.");
    },
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSaved("");
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "monthly_rent" || key === "built_up_area_sqft") {
        next.rent_per_sq_feet = rentPerSqft(next.monthly_rent, next.built_up_area_sqft);
      }
      return next;
    });
  }

  async function run(action: StageAction) {
    setSaved("");
    setError("");
    if (action === "reject" && !comment.trim()) {
      setError("Remarks are required to reject this request.");
      return;
    }
    setPending(true);
    try {
      // Persist form fields first so Approve never stamps an empty Onsite Vetting list.
      if (!fieldsLocked && action !== "rework" && action !== "reject") {
        if (activeStage === "site") {
          await saveLeadSiteVerification(name, siteChecksPayload());
        } else if (activeStage === "property" || activeStage === "rent") {
          await saveLeadPropertyDetails(name, propertyValuesPayload());
        }
      }
      const payload =
        !fieldsLocked && action !== "rework"
          ? activeStage === "site"
            ? { checks: siteChecksPayload() }
            : activeStage === "property" || activeStage === "rent"
              ? { values: propertyValuesPayload() }
              : undefined
          : undefined;
      if (action === "submit" || action === "approve") {
        await onAction(action, payload);
      } else {
        await onAction(action);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      setSaved(
        action === "submit"
          ? "Submitted for this section."
          : action === "approve"
            ? "Section approved. These fields are locked."
            : action === "rework"
              ? "Sent for re-work. These fields can be edited."
              : "Rejected.",
      );
    } catch (err) {
      setSaved("");
      setError(err instanceof ApiError ? err.message : "Could not complete this action.");
    } finally {
      setPending(false);
    }
  }

  const propertyStage = activeStage === "property";

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Section id="site" title="SITE VERIFICATION" visible={activeStage === "site"}>
        <ShortlistingChecklist
          title="Onsite Vetting"
          disabled={fieldsReadOnly}
          value={form.shortlisting || emptyShortlisting()}
          onToggle={(key) =>
            setForm((prev) => ({
              ...prev,
              shortlisting: { ...(prev.shortlisting || emptyShortlisting()), [key]: !prev.shortlisting?.[key] },
            }))
          }
        />
      </Section>

      <Section id="property" title="PROPERTY DETAILS" visible={propertyStage}>
        <fieldset disabled={fieldsReadOnly} className="grid grid-cols-1 gap-3 disabled:opacity-70 sm:grid-cols-2">
          <Field label="Property Address">
            <textarea
              className="ims-field min-h-[72px] w-full"
              value={form.complete_address_of_the_property}
              onChange={(e) => setField("complete_address_of_the_property", e.target.value)}
            />
          </Field>
          <Field label="Proposed Floor Level">
            <input className="ims-field w-full" value={form.proposed_floor_level} onChange={(e) => setField("proposed_floor_level", e.target.value)} />
          </Field>
          <Field label="PIN Code">
            <input className="ims-field w-full" inputMode="numeric" value={form.pin_code} onChange={(e) => setField("pin_code", e.target.value)} />
          </Field>
          <Field label="State">
            <FieldSelect
              value={form.state}
              placeholder="Select"
              options={INDIA_STATES.map((state) => ({ value: state, label: state }))}
              onChange={(next) => setField("state", next)}
              disabled={fieldsReadOnly}
            />
          </Field>
          <Field label="Rental or Lease">
            <FieldSelect
              value={form.rental_or_lease}
              placeholder="Select"
              options={[
                { value: "Rental", label: "Rental" },
                { value: "Lease", label: "Lease" },
              ]}
              onChange={(next) => setField("rental_or_lease", next)}
              disabled={fieldsReadOnly}
            />
          </Field>
          <Field label="Built-Up Area (Sq.Ft.)">
            <input className="ims-field w-full" inputMode="decimal" value={form.built_up_area_sqft} onChange={(e) => setField("built_up_area_sqft", e.target.value)} />
          </Field>
          <Field label="Carpet Area (Sq.Ft.)">
            <input className="ims-field w-full" inputMode="decimal" value={form.carpet_area_sqft} onChange={(e) => setField("carpet_area_sqft", e.target.value)} />
          </Field>
        </fieldset>
      </Section>

      <Section id="rent" title={form.rental_or_lease === "Lease" ? "LEASE" : "RENTAL"} visible={activeStage === "rent" || activeStage === "property"}>
        <fieldset disabled={fieldsReadOnly} className="grid grid-cols-1 gap-3 disabled:opacity-70 sm:grid-cols-2">
          {!form.rental_or_lease ? (
            <p className="text-sm text-slate-500 sm:col-span-2">Choose Rental or Lease in Property Details.</p>
          ) : null}
          {form.rental_or_lease === "Rental" ? (
            <>
              <Field label="Monthly Rent (₹)">
                <input className="ims-field w-full" inputMode="decimal" value={form.monthly_rent} onChange={(e) => setField("monthly_rent", e.target.value)} />
              </Field>
              <Field label="Maintenance (₹)">
                <input className="ims-field w-full" inputMode="decimal" value={form.maintenance} onChange={(e) => setField("maintenance", e.target.value)} />
              </Field>
              <Field label="Rent/Sq.Ft. (₹)">
                <input className="ims-field w-full" readOnly value={form.rent_per_sq_feet} placeholder="Monthly rent ÷ built-up area" />
              </Field>
              <Field label="Security Deposit (₹)">
                <input className="ims-field w-full" inputMode="decimal" value={form.security_deposit_amount} onChange={(e) => setField("security_deposit_amount", e.target.value)} />
              </Field>
              <Field label="Advance Amount Applicable">
                <FieldSelect value={form.is_advance_amount_applicable} placeholder="Select" options={YES_NO} onChange={(next) => setField("is_advance_amount_applicable", next)} />
              </Field>
              {form.is_advance_amount_applicable === "Yes" ? (
                <Field label="Advance Rent Amount (₹)">
                  <input className="ims-field w-full" inputMode="decimal" value={form.advance_rent_amount} onChange={(e) => setField("advance_rent_amount", e.target.value)} />
                </Field>
              ) : null}
              <Field label="Recovery Period (Months)">
                <input className="ims-field w-full" inputMode="numeric" value={form.recovery_period_months} onChange={(e) => setField("recovery_period_months", e.target.value)} />
              </Field>
            </>
          ) : null}
          {form.rental_or_lease === "Lease" ? (
            <>
              <Field label="Lease Period (Yrs.)">
                <input className="ims-field w-full" value={form.lease_period} onChange={(e) => setField("lease_period", e.target.value)} />
              </Field>
              <Field label="Lock-In Period (Yrs.)">
                <input className="ims-field w-full" value={form.lock_in_period} onChange={(e) => setField("lock_in_period", e.target.value)} />
              </Field>
              <Field label="Exit Notice Period">
                <FieldSelect value={form.lease_exit_notice_period_from_lessee} placeholder="Select" options={EXIT_NOTICE} onChange={(next) => setField("lease_exit_notice_period_from_lessee", next)} />
              </Field>
              <Field label="Rent Free Period (Days)">
                <input className="ims-field w-full" inputMode="numeric" value={form.rent_free_period_days} onChange={(e) => setField("rent_free_period_days", e.target.value)} />
              </Field>
              <Field label="Rent Escalation">
                <input className="ims-field w-full" value={form.rent_escalation} onChange={(e) => setField("rent_escalation", e.target.value)} />
              </Field>
              <Field label="Escalation Basis">
                <FieldSelect value={form.rent_escalation_basis} placeholder="Select" options={ESCALATION_BASIS} onChange={(next) => setField("rent_escalation_basis", next)} />
              </Field>
              <Field label="Stamp Duty & Legal Expense Ratio">
                <input className="ims-field w-full" value={form.stamp_duty_and_legal_expense_sharing_ratio_for_registration} onChange={(e) => setField("stamp_duty_and_legal_expense_sharing_ratio_for_registration", e.target.value)} />
              </Field>
            </>
          ) : null}
          {form.rental_or_lease ? (
            <Field label="Brokerage">
              <FieldSelect value={form.brokerage_applicable} placeholder="Select" options={YES_NO} onChange={(next) => setField("brokerage_applicable", next)} />
            </Field>
          ) : null}
        </fieldset>
      </Section>

      <Section id="facility" title="FACILITY DETAILS" visible={propertyStage}>
        <fieldset disabled={fieldsReadOnly} className="grid grid-cols-1 gap-3 disabled:opacity-70 sm:grid-cols-2">
          <Field label="Parking Type">
            <input className="ims-field w-full" value={form.parking_type} onChange={(e) => setField("parking_type", e.target.value)} />
          </Field>
          <Field label="Two-Wheeler Parking">
            <input className="ims-field w-full" inputMode="numeric" value={form.parking_number_of_two_wheeler} onChange={(e) => setField("parking_number_of_two_wheeler", e.target.value)} />
          </Field>
          <Field label="Four-Wheeler Parking">
            <input className="ims-field w-full" inputMode="numeric" value={form.parking_number_of_four_wheeler} onChange={(e) => setField("parking_number_of_four_wheeler", e.target.value)} />
          </Field>
          <Field label="Lift Availability">
            <FieldSelect value={form.lift_availability} placeholder="Select" options={YES_NO} onChange={(next) => setField("lift_availability", next)} />
          </Field>
          <Field label="Power Backup">
            <FieldSelect value={form.power_backup_available} placeholder="Select" options={YES_NO} onChange={(next) => setField("power_backup_available", next)} />
          </Field>
        </fieldset>
      </Section>

      <Section id="owner" title="OWNER DETAILS" visible={propertyStage}>
        <fieldset disabled={fieldsReadOnly} className="min-w-0 space-y-3 disabled:opacity-70">
        <div className="space-y-3">
          {form.owners.map((owner, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-ims-line p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Owner Type">
                <FieldSelect
                  value={owner.owner_type}
                  placeholder="Select"
                  options={[
                    { value: "Primary", label: "Primary" },
                    { value: "Secondary", label: "Secondary" },
                  ]}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      owners: prev.owners.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, owner_type: next } : row,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="Landlord Name">
                <input
                  className="ims-field w-full"
                  value={owner.owner_landlord_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      owners: prev.owners.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, owner_landlord_name: e.target.value } : row,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="Phone">
                <input
                  className="ims-field w-full"
                  inputMode="tel"
                  value={owner.owner_phone_number}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      owners: prev.owners.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, owner_phone_number: e.target.value } : row,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="PAN">
                <input
                  className="ims-field w-full"
                  value={owner.pan_number}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      owners: prev.owners.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, pan_number: e.target.value } : row,
                      ),
                    }))
                  }
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            className="ims-btn-secondary"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                owners: [
                  ...prev.owners,
                  {
                    owner_landlord_name: "",
                    owner_phone_number: "",
                    pan_number: "",
                    owner_type: prev.owners.some((row) => row.owner_type === "Primary") ? "Secondary" : "Primary",
                  },
                ],
              }))
            }
          >
            Add owner
          </button>
        </div>
        </fieldset>
      </Section>

      <Section id="legal" title="LEGAL CLEARANCE" visible={activeStage === "legal"}>
        <p className="text-[12px] text-slate-600">
          Stays pending until an Area Regional Business Manager or Regional Infra Business Partner approves. Further legal levels will be added later.
        </p>
      </Section>
      <Section id="vaastu" title="VAASTU CLEARANCE" visible={activeStage === "vaastu"}>
        <p className="text-[12px] text-slate-600">Pending. This level is not marked complete until that approval step is added.</p>
      </Section>
      <Section id="design" title="DESIGN CLEARANCE" visible={activeStage === "design"}>
        <p className="text-[12px] text-slate-600">Pending. This level is not marked complete until that approval step is added.</p>
      </Section>
      <Section id="ll" title="LL AGREEMENT & SCOPE OF WORK" visible={activeStage === "ll"}>
        <p className="text-[12px] text-slate-600">Pending. This level is not marked complete until that approval step is added.</p>
      </Section>
      <Section id="infra" title="INFRA READINESS" visible={activeStage === "infra"}>
        <p className="text-[12px] text-slate-600">Pending. This level is not marked complete until that approval step is added.</p>
      </Section>

      <div className="ims-card space-y-3 px-4 py-4 sm:px-5">
        <p className="text-[12px] text-slate-600">{hint}</p>
        <textarea
          className="ims-field min-h-[72px]"
          placeholder="Remarks for Reject"
          value={comment}
          onChange={(e) => onComment(e.target.value)}
        />
        {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}
        {saved ? <p className="text-[12px] text-emerald-700">{saved}</p> : null}
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <button type="button" className="ims-btn-secondary" disabled={locked || fieldsLocked || busy || pending || save.isPending} onClick={() => void run("submit")}>
              Submit for approval
            </button>
          ) : null}
          <button
            type="button"
            className="ims-btn-primary disabled:opacity-50"
            disabled={locked || fieldsLocked || busy || pending || save.isPending || approveDisabled}
            title={approveTitle}
            onClick={() => void run("approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className="ims-btn-secondary"
            disabled={locked || busy || pending || save.isPending || !canRework}
            title={
              canRework
                ? "Send this section back to the Regional Infra Business Partner for re-work"
                : "An RB Manager can send this section for re-work after it is submitted"
            }
            onClick={() => (onRequestRework ? onRequestRework() : void run("rework"))}
          >
            Re-Work
          </button>
          <button type="button" className="ims-btn-secondary" disabled={locked || busy || pending || save.isPending} onClick={() => void run("reject")}>
            Reject
          </button>
        </div>
      </div>
    </form>
  );
}
