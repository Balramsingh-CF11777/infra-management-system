import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, RefreshCw, Upload } from "lucide-react";
import { getLeadDetail, uploadLeadChecklistDocument, type LeadChecklistTable } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<DocSlot | null>(null);
  const [busyType, setBusyType] = useState("");
  const [error, setError] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  const lead = (detail.data || {}) as Record<string, unknown>;
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
      uploadLeadChecklistDocument(name, slot.table, slot.type, file),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not upload the document."),
    onSettled: () => setBusyType(""),
  });

  function pick(slot: DocSlot) {
    setPending(slot);
    setError("");
    inputRef.current?.click();
  }

  function onFile(file?: File) {
    const slot = pending;
    setPending(null);
    if (!slot || !file) return;
    setBusyType(slot.type);
    upload.mutate({ slot, file });
  }

  function urlFor(slot: DocSlot) {
    return (slot.table === "premise" ? files.premise : files.kyc).get(slot.type) || "";
  }

  if (!embedded && detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (!embedded && (detail.isError || !detail.data)) {
    return <EmptyState title="Lead unavailable" body="Document Upload needs a valid Lead Request." />;
  }

  return (
    <section className="w-full min-w-0 space-y-4 text-[13px]">
      {embedded ? null : (
        <div className="flex items-start gap-3">
          <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-ims-ink">Document Upload</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">Property documents and KYC for each owner.</p>
          </div>
        </div>
      )}

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

      <DocGroup title="Property Documents" slots={PROPERTY_DOCUMENTS.map((type) => ({ table: "premise", type }))} urlFor={urlFor} busyType={busyType} onPick={pick} />
      <DocGroup
        title="KYC Documents"
        slots={[...KYC_DOCUMENTS.map((type) => ({ table: "kyc" as const, type })), ...panSlots.map((type) => ({ table: "kyc" as const, type }))]}
        urlFor={urlFor}
        busyType={busyType}
        onPick={pick}
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="button"
        className="ims-btn-primary w-full min-h-12"
        onClick={() => (onProceed ? onProceed() : navigate(-1))}
      >
        Proceed
      </button>
    </section>
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
            <li
              key={`${slot.table}-${slot.type}`}
              className={[
                "flex min-h-12 min-w-0 items-center gap-2 rounded-xl bg-white px-2.5 py-2",
                url ? "border border-ims-line" : "border border-dashed border-slate-300",
              ].join(" ")}
            >
              {url ? <FileText className="h-4 w-4 shrink-0 text-rose-600" aria-hidden /> : null}
              <span className="min-w-0 flex-1 break-words text-[13px] leading-snug text-ims-ink">{slot.type}</span>
              {url ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center text-ims-primary"
                    aria-label={`View ${slot.type}`}
                    onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center text-ims-primary disabled:opacity-40"
                    aria-label={`Replace ${slot.type}`}
                    disabled={busy}
                    onClick={() => onPick(slot)}
                  >
                    <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-ims-primary disabled:opacity-40"
                  aria-label={`Upload ${slot.type}`}
                  disabled={busy}
                  onClick={() => onPick(slot)}
                >
                  <Upload className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
