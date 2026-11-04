import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Download, Phone, Upload } from "lucide-react";
import { sendLoiConsentOtp, uploadLeadDmsFile, verifyLoiConsentOtp } from "@/api/leads";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { runtimeConfig } from "@/config/runtime";
import { FixedFlowChrome } from "@/features/leads/FixedFlowChrome";
import { SectionAwaitingApproval } from "@/features/leads/SectionAwaitingApproval";
import { SectionReviewBar, useCanEditLead, useSectionReviewAccess } from "@/features/leads/SectionReviewBar";
import { sectionAwaitingApproval, sectionLocked } from "@/features/leads/sectionReview";
import { usePropertyRecord } from "@/features/leads/usePropertyRecord";
import { ApiError } from "@/types/api";

const OTP_LENGTH = 6;
const SIGNED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const SIGNED_EXT = ["pdf", "jpg", "jpeg", "png"];
const SIGNED_LIMIT = 10 * 1024 * 1024;

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

function phoneLabel(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 10) return `91-${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `91-${digits.slice(2)}`;
  return value;
}

function consentTone(status: string) {
  const key = status.toLowerCase();
  if (key === "verified" || key === "uploaded") return "bg-[#E5F8EC] text-[#1F8A4C]";
  if (key === "sent") return "bg-[#E8F1FF] text-[#2F6FED]";
  return "bg-[#FFF1E0] text-[#C27803]";
}

function clock(total: number) {
  const safe = Math.max(0, total);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ExportButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-ims-primary ${className}`}
      aria-label="Export LOI"
      onClick={() => window.print()}
    >
      <Download className="h-5 w-5" />
    </button>
  );
}

function fileUrl(path: string) {
  const base = runtimeConfig.frappeUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}

type Owner = {
  owner_type?: string;
  owner_landlord_name?: string;
  owner_phone_number?: string;
  complete_address_of_the_owner?: string;
};
type ScopeRow = { work_performed_by?: string; scope_of_work?: string; work_specification?: string };

export function LeadLoiPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const navigate = useNavigate();
  const record = usePropertyRecord(name);
  const fileRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [consent, setConsent] = useState("");
  const [signedCopy, setSignedCopy] = useState("");
  const [signedName, setSignedName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [otpLeft, setOtpLeft] = useState(0);
  const [otpError, setOtpError] = useState("");
  const detail = record.detail;

  useEffect(() => {
    if (!detail.data) return;
    const lead = detail.data as Record<string, unknown>;
    setConsent(text(lead.loi_consent_status));
    setSignedCopy(text(lead.loi_signed_copy));
  }, [detail.data]);

  useEffect(() => {
    if (!otpOpen) return;
    const timer = window.setInterval(() => {
      setOtpLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpOpen]);

  const leadForAccess = (detail.data || {}) as Record<string, unknown>;
  const { canApprove } = useSectionReviewAccess(leadForAccess);
  const leadCanEdit = useCanEditLead(leadForAccess);
  const canEdit = record.prospectMode ? !record.converted : leadCanEdit;

  const sendOtp = useMutation({
    mutationFn: () => sendLoiConsentOtp(name),
    onSuccess: async (result) => {
      setError("");
      setOtpError("");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpLeft(result.expires_in || 300);
      setConsent("Sent");
      setOtpOpen(true);
      await record.refresh();
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    },
    onError: (err) => {
      setOtpOpen(false);
      setError(err instanceof ApiError ? err.message : "Could not send the OTP.");
    },
  });

  const verifyOtp = useMutation({
    mutationFn: () => verifyLoiConsentOtp(name, otpDigits.join("")),
    onSuccess: async () => {
      setOtpError("");
      setOtpOpen(false);
      setConsent("Verified");
      setSaved("Owner OTP verified.");
      await record.refresh();
    },
    onError: (err) => {
      setOtpError(err instanceof ApiError ? err.message : "Could not verify the OTP.");
    },
  });

  const uploadSigned = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadLeadDmsFile(file, "Signed LOI");
      await record.saveDetails({
        loi_signed_copy: uploaded.file_url,
        loi_consent_status: "Uploaded",
      });
      return uploaded;
    },
    onSuccess: async (uploaded) => {
      setError("");
      setSignedCopy(uploaded.file_url);
      setSignedName(uploaded.file_name);
      setConsent("Uploaded");
      setSaved("Signed LOI uploaded.");
      await record.refresh();
    },
    onError: (err) => {
      setSaved("");
      setError(err instanceof ApiError ? err.message : "Could not upload the signed LOI.");
    },
  });

  if (detail.isError || (!detail.isLoading && !detail.data)) {
    return <EmptyState title="Lead unavailable" body="LOI generation needs a valid Lead Request." />;
  }

  const lead = leadForAccess;
  const awaiting = !record.prospectMode && sectionAwaitingApproval(lead, "LOI Generation") && !canApprove;
  const fieldsLocked = record.prospectMode ? false : sectionLocked(lead, "LOI Generation");
  const owners = (Array.isArray(lead.owner_details) ? lead.owner_details : []) as Owner[];
  const landlord = owners.find((owner) => text(owner.owner_type).toLowerCase() === "primary");
  const landlordName = text(landlord?.owner_landlord_name);
  const landlordPhone = phoneLabel(text(landlord?.owner_phone_number));
  const consentLabel = consent || "Pending";
  const backFallback = record.hub;
  const otpReady = otpDigits.every((digit) => digit.length === 1);
  const busy = sendOtp.isPending || verifyOtp.isPending || uploadSigned.isPending;

  function onSignedFile(file: File | undefined) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!SIGNED_EXT.includes(extension) && !SIGNED_TYPES.includes(file.type)) {
      setError("Upload a PDF, JPG, or PNG.");
      return;
    }
    if (file.size > SIGNED_LIMIT) {
      setError("Signed LOI must be 10 MB or smaller.");
      return;
    }
    setError("");
    setSignedName(file.name);
    uploadSigned.mutate(file);
  }

  function onOtpChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setOtpDigits((current) => current.map((item, itemIndex) => (itemIndex === index ? "" : item)));
      return;
    }
    setOtpDigits((current) => {
      const next = [...current];
      digits.slice(0, OTP_LENGTH - index).split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });
    const focusAt = Math.min(index + digits.length, OTP_LENGTH - 1);
    otpRefs.current[focusAt]?.focus();
  }

  return (
    <section className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > *:not(.loi-print) { display: none !important; }
          body > .loi-print {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: auto !important;
            max-width: 100% !important;
            min-height: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            color: #000 !important;
            background: #fff !important;
          }
        }
      `}</style>
      {embedded ? null : (
        <>
          <div className="print:hidden lg:hidden">
            <FixedFlowChrome>
              <div className="bg-[linear-gradient(110deg,#283769,#4b2448)] px-3 pb-4 pt-2 text-white sm:px-5">
                <div className="flex items-center gap-2 pt-[env(safe-area-inset-top)]">
                  <BackButton
                    fallback={backFallback}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    iconClassName="h-5 w-5"
                  />
                  <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold leading-6 text-white">LOI Generation & Consent</h1>
                </div>
              </div>
            </FixedFlowChrome>
          </div>
          <div className="hidden items-start gap-3 print:hidden lg:flex">
            <BackButton
              fallback={backFallback}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line"
            />
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-ims-ink">LOI Generation</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Filled from the fields saved on this lead.</p>
            </div>
          </div>
        </>
      )}

      {detail.isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : awaiting ? (
        <SectionAwaitingApproval lead={lead} sectionLabel="LOI Generation" />
      ) : (
        <>
          <div className="space-y-3 print:hidden">
            <article className="rounded-2xl border border-ims-line bg-white p-4 shadow-[0_4px_14px_rgba(31,37,71,0.04)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-ims-ink">Generated LOI</h2>
                <ExportButton />
              </div>
              <LoiLetter lead={lead} />
            </article>
            <article className="rounded-2xl border border-ims-line bg-white p-4 shadow-[0_4px_14px_rgba(31,37,71,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-ims-ink">Landlord LOI Consent</h2>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${consentTone(consentLabel)}`}>
                  {consentLabel}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ims-line px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold text-ims-ink">{landlordName || "No primary owner"}</p>
                  {landlordName ? <p className="mt-0.5 text-[12px] font-semibold text-ims-primary">Primary</p> : null}
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {landlordPhone || "No phone saved"}
                  </p>
                </div>
                <button
                  type="button"
                  className="ims-btn-primary min-h-11 shrink-0 rounded-xl px-5"
                  disabled={busy || fieldsLocked || !canEdit || !landlordPhone}
                  onClick={() => sendOtp.mutate()}
                >
                  {sendOtp.isPending ? "Sending…" : "Send OTP"}
                </button>
              </div>
            </article>

            <div className="flex items-center gap-3 px-2 py-1 text-[13px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <article className="rounded-2xl border border-ims-line bg-white p-4 shadow-[0_4px_14px_rgba(31,37,71,0.04)]">
              <h2 className="text-[16px] font-semibold text-ims-ink">Already Have Signed LOI ?</h2>
              <button
                type="button"
                className="mt-3 flex w-full flex-col items-center rounded-2xl border border-dashed border-[#D5D8E8] bg-[#FAFBFF] px-4 py-3 text-center disabled:opacity-60"
                disabled={busy || fieldsLocked || !canEdit}
                onClick={() => fileRef.current?.click()}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF0FF] text-ims-primary">
                  <Upload className="h-4 w-4" />
                </span>
                <span className="mt-1.5 text-[15px] font-semibold text-ims-primary">
                  {uploadSigned.isPending ? "Uploading…" : "Upload the Signed Copy"}
                </span>
                <span className="mt-1 text-[12px] text-slate-400">PDF, JPG or PNG · Upto 10 MB</span>
                {signedCopy ? (
                  <span className="mt-2 max-w-full truncate text-[12px] font-medium text-slate-500">
                    {signedName || "Signed copy saved"}
                  </span>
                ) : null}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  onSignedFile(file);
                }}
              />
            </article>

            <button type="button" className="ims-btn-primary min-h-12 w-full" onClick={() => navigate(backFallback)}>
              Done
            </button>
          </div>
          {error ? <p className="text-sm text-rose-600 print:hidden">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-700 print:hidden">{saved}</p> : null}
          <div className="print:hidden">
            {record.prospectMode ? null : <SectionReviewBar name={name} lead={lead} section="LOI Generation" />}
          </div>
          {otpOpen ? (
            <div className="fixed inset-0 z-[2200] flex items-end justify-center bg-black/45 pb-[calc(3.5rem+env(safe-area-inset-bottom))] print:hidden lg:pb-0" role="presentation">
              <button type="button" className="absolute inset-0 cursor-default" aria-label="Close OTP" onClick={() => setOtpOpen(false)} />
              <div className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="loi-otp-title">
                <span className="mx-auto mb-4 block h-1.5 w-10 shrink-0 rounded-full bg-slate-200" />
                <h2 id="loi-otp-title" className="shrink-0 text-center text-[20px] font-bold text-ims-ink">
                  Consent OTP Verification
                </h2>
                <div className="mt-6 flex justify-between gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={`otp-${index}`}
                      ref={(node) => {
                        otpRefs.current[index] = node;
                      }}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      className="h-12 w-11 rounded-xl border border-[#E4E7F2] text-center text-[18px] font-semibold text-ims-ink outline-none focus:border-ims-primary"
                      value={digit}
                      placeholder="–"
                      onChange={(event) => onOtpChange(index, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
                      }}
                    />
                  ))}
                </div>
                <p className="mt-4 text-[13px] text-slate-500">
                  {otpLeft > 0 ? `Resend OTP in ${clock(otpLeft)}` : "OTP expired."}{" "}
                  <button
                    type="button"
                    className="font-semibold text-ims-primary disabled:opacity-50"
                    disabled={sendOtp.isPending || fieldsLocked || !canEdit}
                    onClick={() => sendOtp.mutate()}
                  >
                    Resend OTP
                  </button>
                </p>
                {otpError ? <p className="mt-2 text-sm text-rose-600">{otpError}</p> : null}
                <button
                  type="button"
                  className="ims-btn-primary mt-5 min-h-12 w-full shrink-0"
                  disabled={verifyOtp.isPending}
                  onClick={() => {
                    if (!otpReady) {
                      setOtpError("Enter the 6-digit OTP.");
                      return;
                    }
                    if (otpLeft <= 0) {
                      setOtpError("This OTP has expired. Send a new one.");
                      return;
                    }
                    setOtpError("");
                    verifyOtp.mutate();
                  }}
                >
                  {verifyOtp.isPending ? "Checking…" : "Submit"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
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
      <div className="space-y-3 px-6 py-5">
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

        <table className="w-full border-collapse text-left text-[11px] leading-4">
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
        <table className="w-full border-collapse text-left text-[11px] leading-4">
          <tbody>
            <Row term="Time to complete landlord scope of work" value="Within _________ days from the date of lease deed signing" />
            <Row
              term="Implication on delay in landlord scope of work completion"
              value="If the LESSOR fails to provide possession of the premises on or before the agreed date (completion date of landlord scope of work) as mentioned above, then the LESSEE shall be entitled to charge a penalty equal to the rent payable for such delayed period."
            />
          </tbody>
        </table>

        <table className="w-full border-collapse border border-black text-left text-[11px] leading-4">
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

/** On screen the letter stays in this window and scrolls. Print uses the A4 page. */
const PREVIEW_CROP = 240;

function A4Preview({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(794);
  const [sheetHeight, setSheetHeight] = useState(1123);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const onBeforePrint = () => {
      const sheet = sheetRef.current;
      if (!sheet || sheet.parentElement === document.body) return;
      const marker = document.createElement("div");
      marker.dataset.loiPlaceholder = "1";
      sheet.replaceWith(marker);
      sheet.style.transform = "none";
      sheet.style.width = "auto";
      sheet.style.minHeight = "0";
      document.body.appendChild(sheet);
    };
    const onAfterPrint = () => {
      const sheet = sheetRef.current;
      const marker = document.querySelector("[data-loi-placeholder]");
      if (!sheet || !marker) return;
      sheet.style.transform = `scale(${scaleRef.current})`;
      sheet.style.width = "210mm";
      sheet.style.minHeight = "297mm";
      marker.replaceWith(sheet);
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      onAfterPrint();
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const measure = () => {
      const width = sheet.offsetWidth || 794;
      const available = frame.clientWidth;
      const nextScale = available > 80 ? Math.min(1, available / width) : 1;
      setPageWidth(width);
      setScale(nextScale);
      setSheetHeight(Math.max(sheet.scrollHeight, sheet.offsetHeight, 1123));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(sheet);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const fittedWidth = Math.max(pageWidth * scale, 1);
  const fittedHeight = Math.max(sheetHeight * scale, PREVIEW_CROP);

  return (
    <div
      ref={frameRef}
      className="loi-preview w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-ims-line bg-white"
      style={{ height: PREVIEW_CROP }}
    >
      <div className="loi-scale-box mx-auto overflow-hidden" style={{ width: `${fittedWidth}px`, height: `${fittedHeight}px` }}>
        <article
          ref={sheetRef}
          className="loi-print origin-top-left bg-white font-serif text-[13px] leading-6 text-black"
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
