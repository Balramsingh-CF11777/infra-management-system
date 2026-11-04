import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, FileText, RefreshCw, Upload } from "lucide-react";
import type { LeadChecklistTable } from "@/api/leads";
import { BackButton, useSmartBack } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { frappeFileUrl } from "@/config/runtime";
import { FixedFlowChrome } from "@/features/leads/FixedFlowChrome";
import { SectionAwaitingApproval } from "@/features/leads/SectionAwaitingApproval";
import { VerificationFlowTopBar } from "@/features/leads/VerificationFlowTopBar";
import { SectionReviewBar, useCanEditLead, useSectionReviewAccess } from "@/features/leads/SectionReviewBar";
import { sectionAwaitingApproval } from "@/features/leads/sectionReview";
import { usePropertyRecord } from "@/features/leads/usePropertyRecord";
import { ApiError } from "@/types/api";

const PROPERTY_DOCUMENTS = [
  "Title Deed",
  "Building Approval Plan",
  "Property Tax",
  "EB Bill",
  "Commercial Utilization",
  "Legal Opinion",
  "Authorization Letter",
] as const;

const KYC_DOCUMENTS = ["GST Certificate", "MSME Certificate", "Bank Statement"] as const;

type DocSlot = {
  table: LeadChecklistTable;
  type: string;
};

function attachmentMap(rows: unknown) {
  const map = new Map<string, string>();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    const row = raw as { document_type?: string; document_attachment?: string };
    const type = String(row.document_type || "").trim();
    const url = String(row.document_attachment || "").trim();
    if (type && url) map.set(type, url);
  }
  return map;
}

export function LeadDocumentUploadPage({
  embedded = false,
  onProceed,
}: {
  embedded?: boolean;
  onProceed?: () => void;
} = {}) {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const record = usePropertyRecord(name);
  const goBack = useSmartBack(record.hub);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<DocSlot | null>(null);
  const [tab, setTab] = useState<"property" | "kyc">("property");
  const [busyType, setBusyType] = useState("");
  const [error, setError] = useState("");

  const detail = record.detail;

  const lead = (detail.data || {}) as Record<string, unknown>;
  const { canApprove } = useSectionReviewAccess(lead);
  const leadCanEdit = useCanEditLead(lead);
  const canEdit = record.prospectMode ? !record.converted : leadCanEdit;
  const awaiting = !record.prospectMode && sectionAwaitingApproval(lead, "Document Upload") && !canApprove;
  const files = useMemo(() => {
    const premise = attachmentMap(lead.premise_related_document);
    const kyc = attachmentMap(lead.kyc_related_documents);
    return { premise, kyc };
  }, [lead]);

  const panSlots = useMemo(() => {
    const owners = Array.isArray(lead.owner_details) ? lead.owner_details : [];
    const count = Math.max(owners.length, 1);
    return Array.from({ length: count }, (_, index) => `PAN – Owner ${index + 1}`);
  }, [lead]);

  const upload = useMutation({
    mutationFn: ({ slot, file }: { slot: DocSlot; file: File }) =>
      record.uploadChecklist(slot.table, slot.type, file),
    onSuccess: async () => {
      setError("");
      await record.refresh();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not upload the document."),
    onSettled: () => setBusyType(""),
  });

  function pick(slot: DocSlot) {
    if (!canEdit) return;
    pendingRef.current = slot;
    setError("");
    inputRef.current?.click();
  }

  function onFile(file?: File) {
    const slot = pendingRef.current;
    pendingRef.current = null;
    if (!slot || !file) return;
    setBusyType(slot.type);
    upload.mutate({ slot, file });
  }

  function urlFor(slot: DocSlot) {
    return (slot.table === "premise" ? files.premise : files.kyc).get(slot.type) || "";
  }

  if (!embedded && (detail.isError || (!detail.isLoading && !detail.data))) {
    return <EmptyState title="Lead unavailable" body="Document Upload needs a valid Lead Request." />;
  }

  const propertySlots = PROPERTY_DOCUMENTS.map((type) => ({ table: "premise" as const, type }));
  const kycSlots = [
    ...KYC_DOCUMENTS.map((type) => ({ table: "kyc" as const, type })),
    ...panSlots.map((type) => ({ table: "kyc" as const, type })),
  ];
  const slots = tab === "property" ? propertySlots : kycSlots;

  return (
    <section className="w-full min-w-0 space-y-4 pb-28 text-[13px] lg:pb-0">
      {embedded ? null : (
        <>
          <div className="lg:hidden">
            <FixedFlowChrome>
              <div className="bg-[linear-gradient(110deg,#283769,#4b2448)] px-3 pb-4 pt-2 text-white sm:px-5">
                <VerificationFlowTopBar
                  title={tab === "kyc" ? "KYC Documents" : "Property Documents"}
                  fallback={record.hub}
                />
              </div>
            </FixedFlowChrome>
          </div>
          <div className="hidden items-start gap-3 lg:flex">
            <BackButton
              fallback={record.hub}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line"
            />
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-ims-ink">Document Upload</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Property documents and KYC for each owner.</p>
            </div>
          </div>
        </>
      )}

      {!embedded && detail.isLoading ? <SkeletonBlock className="h-64" /> : null}
      {!embedded && detail.isLoading ? null : awaiting ? (
        <SectionAwaitingApproval lead={lead} sectionLabel="Document Upload" />
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onFile(file);
            }}
          />

          <div className="space-y-4 lg:hidden">
            <div className="flex items-end gap-1">
              <BackButton
                fallback={record.hub}
                className="mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ims-ink"
              />
              <div className="grid min-w-0 flex-1 grid-cols-2 border-b border-ims-line" role="tablist" aria-label="Document groups">
                <TabButton active={tab === "property"} onClick={() => setTab("property")}>
                  Property
                </TabButton>
                <TabButton active={tab === "kyc"} onClick={() => setTab("kyc")}>
                  KYC
                </TabButton>
              </div>
            </div>
            <ul className="space-y-3">
              {slots.map((slot) => (
                <DocRow
                  key={`${slot.table}-${slot.type}`}
                  slot={slot}
                  url={urlFor(slot)}
                  busy={busyType === slot.type}
                  onPick={pick}
                />
              ))}
            </ul>
          </div>

          <div className="hidden space-y-4 lg:block">
            <DocGroup title="Property Documents" slots={propertySlots} urlFor={urlFor} busyType={busyType} onPick={pick} />
            <DocGroup title="KYC Documents" slots={kycSlots} urlFor={urlFor} busyType={busyType} onPick={pick} />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {record.prospectMode ? null : <SectionReviewBar name={name} lead={lead} section="Document Upload" />}
          <div className="fixed inset-x-0 bottom-0 z-10 bg-ims-surface/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm lg:static lg:bg-transparent lg:px-0 lg:py-0">
            <button
              type="button"
              className="ims-btn-primary w-full min-h-12 lg:w-auto lg:min-w-40"
              onClick={() => (onProceed ? onProceed() : goBack())}
            >
              <span className="lg:hidden">Done</span>
              <span className="hidden lg:inline">Proceed</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={[
        "border-b-2 pb-3 text-[15px] font-semibold",
        active ? "border-ims-primary text-ims-primary" : "border-transparent text-slate-500",
      ].join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DocRow({
  slot,
  url,
  busy,
  onPick,
}: {
  slot: DocSlot;
  url: string;
  busy: boolean;
  onPick: (slot: DocSlot) => void;
}) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-label={url ? `Replace ${slot.type}` : `Upload ${slot.type}`}
        className={[
          "flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_4px_14px_rgba(31,37,71,0.04)]",
          url ? "border border-ims-line" : "border border-dashed border-slate-300",
          busy ? "opacity-70" : "",
        ].join(" ")}
        onClick={() => {
          if (!busy) onPick(slot);
        }}
        onKeyDown={(event) => {
          if (busy) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPick(slot);
          }
        }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ims-ink">{slot.type}</span>
            {url ? (
              <span className="rounded-full bg-[#E5F8EC] px-2 py-0.5 text-[11px] font-semibold text-[#1F8A4C]">Uploaded</span>
            ) : null}
          </span>
        </span>
        {url ? (
          <span className="flex shrink-0 items-center gap-3 text-ims-primary">
            <RefreshCw className={`h-5 w-5 ${busy ? "animate-spin" : ""}`} aria-hidden />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center"
              aria-label={`View ${slot.type}`}
              onClick={(event) => {
                event.stopPropagation();
                window.open(frappeFileUrl(url), "_blank", "noopener,noreferrer");
              }}
            >
              <Eye className="h-5 w-5" />
            </button>
          </span>
        ) : (
          <Upload className={`h-5 w-5 shrink-0 text-ims-primary ${busy ? "animate-pulse" : ""}`} aria-hidden />
        )}
      </div>
    </li>
  );
}

function DocGroup({
  title,
  slots,
  urlFor,
  busyType,
  onPick,
}: {
  title: string;
  slots: DocSlot[];
  urlFor: (slot: DocSlot) => string;
  busyType: string;
  onPick: (slot: DocSlot) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-semibold text-ims-ink">{title}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {slots.map((slot) => {
          const url = urlFor(slot);
          const busy = busyType === slot.type;
          return (
            <li key={`${slot.table}-${slot.type}`}>
              <div
                role="button"
                tabIndex={0}
                aria-label={url ? `Replace ${slot.type}` : `Upload ${slot.type}`}
                className={[
                  "flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-2.5 py-2",
                  url ? "border border-ims-line" : "border border-dashed border-slate-300",
                ].join(" ")}
                onClick={() => {
                  if (!busy) onPick(slot);
                }}
                onKeyDown={(event) => {
                  if (busy) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPick(slot);
                  }
                }}
              >
                {url ? <FileText className="h-4 w-4 shrink-0 text-rose-600" aria-hidden /> : null}
                <span className="min-w-0 flex-1 break-words text-[13px] leading-snug text-ims-ink">{slot.type}</span>
                {url ? (
                  <span className="flex shrink-0 items-center gap-1 text-ims-primary">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center"
                      aria-label={`View ${slot.type}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(frappeFileUrl(url), "_blank", "noopener,noreferrer");
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
                  </span>
                ) : (
                  <Upload className={`h-4 w-4 shrink-0 text-ims-primary ${busy ? "animate-pulse" : ""}`} aria-hidden />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
