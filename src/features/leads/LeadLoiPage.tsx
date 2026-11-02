import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeadDetail, saveLeadPropertyDetails } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { runtimeConfig } from "@/config/runtime";
import { sectionLocked } from "@/features/leads/sectionReview";
import { ApiError } from "@/types/api";

const CONSENT = [
  { value: "Pending", label: "Pending" },
  { value: "Sent", label: "Sent" },
  { value: "Verified", label: "Verified" },
  { value: "Uploaded", label: "Uploaded" },
];

const TERM = "border border-black px-2 py-2 align-top font-bold";
const VALUE = "border border-black px-2 py-2 align-top font-normal";

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function escalationLine(percent: string, months: string, basis: string) {
  if (months) return `${percent}% Every ${months} months on base rent`;
  if (basis) return `${percent}% ${basis}`;
  return `${percent}% on base rent`;
}

function exitLine(notice: string) {
  if (!notice) return "notice by Lessee to Lessor";
  if (/day/i.test(notice)) return `${notice} notice by Lessee to Lessor`;
  return `${notice} days notice by Lessee to Lessor`;
}

function formatLoiDate(value: unknown) {
  const raw = text(value);
  const date = raw ? new Date(raw.includes("T") ? raw : raw.replace(" ", "T")) : new Date();
  if (Number.isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function fileUrl(path: string) {
  const base = runtimeConfig.frappeUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}

type Owner = { owner_landlord_name?: string; complete_address_of_the_owner?: string };
type ScopeRow = { work_performed_by?: string; scope_of_work?: string; work_specification?: string };

export function LeadLoiPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const queryClient = useQueryClient();
  const [consent, setConsent] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  useEffect(() => {
    if (!detail.data) return;
    setConsent(text((detail.data as Record<string, unknown>).loi_consent_status));
  }, [detail.data]);

  const save = useMutation({
    mutationFn: () => saveLeadPropertyDetails(name, { loi_consent_status: consent }),
    onSuccess: async () => {
      setError("");
      setSaved("Consent status saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    },
    onError: (err) => {
      setSaved("");
      setError(err instanceof ApiError ? err.message : "Could not save LOI consent.");
    },
  });

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="LOI generation needs a valid Lead Request." />;
  }

  const lead = detail.data as Record<string, unknown>;

  return (
    <section className="w-full min-w-0 space-y-4">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body * { visibility: hidden; }
          .loi-print, .loi-print * { visibility: visible; }
          .loi-preview, .loi-scale-box { overflow: visible !important; width: auto !important; height: auto !important; background: white !important; padding: 0 !important; }
          .loi-print { position: absolute; left: 0; top: 0; width: 210mm !important; min-height: auto !important; transform: none !important; box-shadow: none !important; }
        }
      `}</style>
      {embedded ? null : (
        <div className="flex items-start gap-3 print:hidden">
          <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-ims-ink">LOI Generation</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">Filled from the fields saved on this lead.</p>
          </div>
        </div>
      )}

      <LoiLetter lead={lead} />

      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1.5">
          <span className="text-[13px] font-semibold text-ims-ink">Consent status</span>
          <FieldSelect value={consent} placeholder="Select" options={CONSENT} onChange={setConsent} />
        </label>
        <button type="button" className="ims-btn-secondary min-h-12 sm:w-auto" onClick={() => window.print()}>
          Print / Download
        </button>
        <button type="button" className="ims-btn-primary min-h-12 sm:w-auto" disabled={save.isPending || sectionLocked(lead, "Property Verification")} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600 print:hidden">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700 print:hidden">{saved}</p> : null}
    </section>
  );
}

function LoiLetter({ lead }: { lead: Record<string, unknown> }) {
  const showRupee = text(lead.product_line).toUpperCase() !== "GL";
  const owners = (Array.isArray(lead.owner_details) ? lead.owner_details : []) as Owner[];
  const scope = ((Array.isArray(lead.ribp_work_scope) ? lead.ribp_work_scope : []) as ScopeRow[]).filter(
    (row) => text(row.work_performed_by) === "Chola",
  );
  const money = (value: unknown) => `${showRupee ? "Rs. " : ""}${text(value)}`;
  const address = text(lead.complete_address_of_the_property);
  const escalation = text(lead.rent_escalation);
  const escalationMonths = text(lead.rent_escalation_months);
  const escalationBasis = text(lead.rent_escalation_basis);
  const stamp = text(lead.stamp_duty_and_legal_expense_sharing_ratio_for_registration);
  const rentFree = text(lead.rent_free_period_days);
  const signage = text(lead.signage_space_and_location_details);
  const floor = text(lead.proposed_floor_level) || text(lead.total_no_of_floors_in_the_building);
  const recovery = text(lead.recovery_period_months) || "____";

  return (
    <A4Preview>
      <LetterImage src={fileUrl("/files/chola_letter_head.png")} alt="Cholamandalam letterhead" />
      <div className="space-y-4 px-10 py-8">
        <p className="text-right">Date: {formatLoiDate(lead.date_of_proposal || lead.initiated_date)}</p>

        <div>
          <p>To,</p>
          {owners.length ? (
            <div className="mt-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(owners.length, 3)}, minmax(0, 1fr))` }}>
              {owners.map((owner, index) => (
                <p key={`${owner.owner_landlord_name || "owner"}-${index}`}>
                  <strong>Name:</strong> {text(owner.owner_landlord_name)}
                  <br />
                  <br />
                  <strong>Address:</strong>
                  <br />
                  <Lines text={text(owner.complete_address_of_the_owner)} />
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <p>Dear Sir/Madam,</p>
        <p className="text-center font-bold">
          Sub: Letter of Intent for office space at – {text(lead.location_details)}
        </p>
        <p>
          We confirm our intention to take the above-mentioned property on lease basis subject to fulfillment of our company norms, due legal clearance, completion of all the landlord scope of work of the said property, and all commercial payment will be after taking possession of the premises.
        </p>
        <p>The terms of the lease shall be as per below and are subject to change at the time of entering the Lease:</p>

        <table className="w-full border-collapse text-left text-[13px] leading-5">
          <tbody>
            <Row term="Proposed Premises address" value={<Lines text={address} />} />
            <Row term="Period of Lease" value={`${text(lead.lease_period)} Years`} />
            <Row term="Lock-in period" value={`${text(lead.lock_in_period)} Years`} />
            <Row term="Carpet Area" value={`${text(lead.carpet_area_sqft)} Sqft`} />
            <Row term="Buildup Area" value={`${text(lead.built_up_area_sqft)} Sqft`} />
            <Row term="Monthly Rent" value={money(lead.monthly_rent)} />
            <Row term="Maintenance" value={money(lead.maintenance)} />
            <Row term="Security Deposit" value={money(lead.security_deposit_amount)} />
            <Row
              term="Advance towards landlord scope of work completion"
              value={`${money(lead.advance_rent_amount)} – To be recovered in the initial ${recovery} month(s) rentals`}
            />
            <Row term="Escalation in Rent" value={escalationLine(escalation, escalationMonths, escalationBasis)} />
            <Row term="Lease registration Cost" value={stamp || "50% by Lessee, 50% by Lessor"} />
            <Row term="Exit Opinion" value={exitLine(text(lead.lease_exit_notice_period_from_lessee))} />
            <Row term="Taxes" value="All the taxes to be borne by landlord except GST on rent" />
            <Row
              term="Rent free period"
              value={rentFree ? `${rentFree} days. Rent will start based on the branch inauguration` : "Rent will start based on the branch inauguration"}
            />
            <Row
              term="Electricity power Load"
              value={`Lessor should provide power load of ${text(lead.electricity_load_in_kva)} KVA with three-phase connections at Lessor’s own cost`}
            />
            <Row term="Rent free space for RF pole" value="Radio Frequency pole of 3 to 12 meters on the terrace of the building" />
            <Row term="Rent free space for AC Outdoor units" value="On the side wall / Building terrace / Catwalk structure provided by the landlord" />
            <Row
              term="Space for Sign Board"
              value={
                signage ? (
                  <Lines text={signage} />
                ) : (
                  <>
                    • In front side of the main building (for main board) – min 20x5 ft
                    <br />
                    • In front side of the main building (for additional board) – min 6x4 ft
                    <br />
                    • On the side of the building – min 4x4 ft
                    <br />
                    • Painting and branding work in rolling shutter
                    <br />
                    • Branding work in facade glass
                  </>
                )
              }
            />
            <Row
              term="Rent free parking space"
              value={`Number of cars – ${text(lead.parking_number_of_four_wheeler)} & Number of 2 wheelers – ${text(lead.parking_number_of_two_wheeler)}`}
            />
            <Row term="Proposed Floor" value={`${floor} floor`} />
          </tbody>
        </table>

        <p className="font-bold underline">Landlord Scope of Work</p>
        <table className="w-full border-collapse text-left text-[13px] leading-5">
          <tbody>
            <Row term="Time to complete landlord scope of work" value="Within _________ days from the date of lease deed signing" />
            <Row
              term="Implication on delay in landlord scope of work completion"
              value="If the LESSOR fails to provide possession of the premises on or before the agreed date (completion date of landlord scope of work) as mentioned above, then the LESSEE shall be entitled to charge a penalty equal to the rent payable for such delayed period."
            />
          </tbody>
        </table>

        <table className="w-full border-collapse border border-black text-left text-[13px] leading-5">
          <thead>
            <tr>
              <th className="w-[8%] border border-black px-2 py-2 text-center">SL No</th>
              <th className="w-[46%] border border-black px-2 py-2 text-left">Landlord Scope of Work</th>
              <th className="w-[46%] border border-black px-2 py-2 text-left">Specification</th>
            </tr>
          </thead>
          <tbody>
            {scope.length ? (
              scope.map((row, index) => (
                <tr key={`${row.scope_of_work || "scope"}-${index}`}>
                  <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-black px-2 py-2">{text(row.scope_of_work)}</td>
                  <td className="border border-black px-2 py-2">{text(row.work_specification)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-2 py-2 text-center" colSpan={3}>
                  No Chola scope of work available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <table className="w-full">
          <tbody>
            <tr>
              <td className="w-1/2 align-top pr-4">
                <p>Yours faithfully,</p>
                <div className="h-16" />
                <p>
                  For <b>Cholamandalam Investment and Finance Company Ltd.</b>
                </p>
                <p>(Regional Infra Business Partner)</p>
              </td>
              <td className="w-1/2 align-bottom text-right">
                <div className="h-16" />
                <p>
                  <b>Accepted</b>
                </p>
                <p>(Landlord)</p>
              </td>
            </tr>
          </tbody>
        </table>
        <LetterImage src={fileUrl("/files/footer-LOI.png")} alt="" />
      </div>
    </A4Preview>
  );
}

/** A4 is 210mm × 297mm. The sheet stays that size and scales down to fit the screen. */
function A4Preview({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(794);
  const [sheetHeight, setSheetHeight] = useState(1123);

  useEffect(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const measure = () => {
      const width = sheet.offsetWidth || 794;
      const available = Math.max(frame.clientWidth - 32, 240);
      setPageWidth(width);
      setScale(Math.min(1, available / width));
      setSheetHeight(Math.max(sheet.scrollHeight, sheet.offsetHeight, 1123));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="loi-preview overflow-hidden rounded-xl bg-[#e4e7ee] px-4 py-5 print:rounded-none">
      <div className="loi-scale-box mx-auto overflow-hidden" style={{ width: `${pageWidth * scale}px`, height: `${sheetHeight * scale}px` }}>
        <article
          ref={sheetRef}
          className="loi-print origin-top-left bg-white font-serif text-[15px] leading-7 text-black shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
          style={{ width: "210mm", minHeight: "297mm", transform: `scale(${scale})` }}
        >
          {children}
        </article>
      </div>
    </div>
  );
}

function Row({ term, value }: { term: string; value: ReactNode }) {
  return (
    <tr>
      <td className={TERM}>{term}</td>
      <td className={VALUE}>{value}</td>
    </tr>
  );
}

function Lines({ text: value }: { text: string }) {
  const lines = value.split(/\n/);
  return (
    <>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {index ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

function LetterImage({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return <img src={src} alt={alt} className="block w-full" onError={() => setHidden(true)} />;
}
