import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageDown, Plus, X } from "lucide-react";
import { getLeadDetail, removeLeadDocument, uploadLeadDocument } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { SiteImageThumb } from "@/components/common/SiteImageThumb";
import { WebcamCaptureDialog, canUseWebcam } from "@/components/common/WebcamCaptureDialog";
import {
  SITE_IMAGE_SLOTS,
  extraSiteImageSlots,
  isFixedSiteImageSlot,
  nextAdditionalSlot,
  type SiteImageSlot,
} from "@/features/leads/siteImageSlots";
import { ApiError } from "@/types/api";

type AttachmentRow = {
  document_type?: string;
  document_attachment?: string;
};

export function SiteImageCapturePage({
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedSlot, setSelectedSlot] = useState<SiteImageSlot | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const [error, setError] = useState("");
  const [localPreviews, setLocalPreviews] = useState<Partial<Record<SiteImageSlot, string>>>({});
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<SiteImageSlot, File>>>({});
  const [extraSlots, setExtraSlots] = useState<string[]>([]);

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  const bySlot = useMemo(() => {
    const map = new Map<string, string>();
    const rows = (detail.data?.additional_attachment as AttachmentRow[] | undefined) || [];
    for (const row of rows) {
      const type = String(row.document_type || "").trim();
      const url = String(row.document_attachment || "").trim();
      if (type && url) map.set(type, url);
    }
    return map;
  }, [detail.data]);

  useEffect(() => {
    const rows = (detail.data?.additional_attachment as AttachmentRow[] | undefined) || [];
    const saved = extraSiteImageSlots(rows.map((row) => String(row.document_type || "")));
    setExtraSlots((prev) => {
      const merged = [...saved];
      for (const slot of prev) {
        if (!merged.includes(slot)) merged.push(slot);
      }
      return merged.length === prev.length && merged.every((slot, index) => slot === prev[index]) ? prev : merged;
    });
  }, [detail.data]);

  const slots = useMemo(() => [...SITE_IMAGE_SLOTS, ...extraSlots], [extraSlots]);

  useEffect(() => {
    return () => {
      Object.values(localPreviews).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  const remove = useMutation({
    mutationFn: (slot: SiteImageSlot) => removeLeadDocument(name, slot),
    onSuccess: async (_data, slot) => {
      clearSlotLocal(slot);
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      setError("");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Could not remove the image.");
    },
  });

  function clearSlotLocal(slot: SiteImageSlot) {
    setLocalPreviews((prev) => {
      const current = prev[slot];
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  /** Queue image on the slot (thumbnail now; upload on Proceed / Upload). */
  function queueFile(slot: SiteImageSlot, file: File) {
    const blobUrl = URL.createObjectURL(file);
    setLocalPreviews((prev) => {
      const previous = prev[slot];
      if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
      return { ...prev, [slot]: blobUrl };
    });
    setPendingFiles((prev) => ({ ...prev, [slot]: file }));
    setError("");
  }

  async function uploadPendingSlots(slots: SiteImageSlot[]) {
    const ready = slots.filter((slot) => Boolean(pendingFiles[slot]));
    if (!ready.length) return [] as string[];

    // Vendor-portal DMS pattern: each slot → dms_filehandler → then save one child row.
    const failures: string[] = [];
    for (const slot of ready) {
      const file = pendingFiles[slot];
      if (!file) continue;
      setBusySlot(slot);
      try {
        await uploadLeadDocument(name, slot, file);
        setPendingFiles((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
      } catch (err) {
        failures.push(slot);
        setError(
          err instanceof ApiError
            ? err.message
            : `Could not upload ${slot}. Check connection and try Proceed again.`,
        );
      }
    }
    setBusySlot(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
    return failures;
  }

  function openCapture(slot: SiteImageSlot) {
    setSelectedSlot(slot);
    if (canUseWebcam()) {
      setWebcamOpen(true);
      return;
    }
    cameraInputRef.current?.click();
  }

  function openGallery(slot: SiteImageSlot) {
    setSelectedSlot(slot);
    galleryInputRef.current?.click();
  }

  function onUploadClick() {
    if (!selectedSlot) {
      setError("Select a slot, then tap Upload.");
      return;
    }
    // If a file is already queued for this slot, push it now; otherwise open capture.
    if (pendingFiles[selectedSlot]) {
      void (async () => {
        const failures = await uploadPendingSlots([selectedSlot]);
        if (!failures.length) setError("");
      })();
      return;
    }
    openCapture(selectedSlot);
  }

  function onSlotActivate(slot: SiteImageSlot) {
    setSelectedSlot(slot);
    setError("");
    if (!bySlot.has(slot) && !localPreviews[slot]) openCapture(slot);
  }

  async function proceed() {
    setError("");
    const pendingSlots = slots.filter((slot) => Boolean(pendingFiles[slot]));
    setProceeding(true);
    try {
      if (pendingSlots.length) {
        const failures = await uploadPendingSlots(pendingSlots);
        if (failures.length) {
          setError(`Could not upload: ${failures.join(", ")}. Fix those slots and tap Proceed again.`);
          return;
        }
      }
      if (onProceed) onProceed();
      else navigate(`/chola360/leads/${encodeURIComponent(name)}`, { replace: true });
    } finally {
      setProceeding(false);
    }
  }

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title="Lead unavailable"
        body={detail.error instanceof ApiError ? detail.error.message : "This Lead Request could not be loaded."}
      />
    );
  }

  const lead = detail.data;
  const uploading = Boolean(busySlot) || remove.isPending || proceeding;
  const pendingCount = Object.keys(pendingFiles).length;
  const leadLabel = String(lead.property_id || lead.location_details || lead.name);
  const showGalleryHint = Boolean(selectedSlot && !bySlot.has(selectedSlot) && !localPreviews[selectedSlot]);

  function addImageSpace() {
    const slot = nextAdditionalSlot(slots);
    setExtraSlots((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
    setSelectedSlot(slot);
    setError("");
    openCapture(slot);
  }

  function dropExtraSlot(slot: string) {
    if (isFixedSiteImageSlot(slot)) return;
    clearSlotLocal(slot);
    setExtraSlots((prev) => prev.filter((item) => item !== slot));
    if (selectedSlot === slot) setSelectedSlot(null);
  }

  function renderSlotGrid() {
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
        {slots.map((slot) => {
          const stored = bySlot.get(slot);
          const local = localPreviews[slot];
          const hasImage = Boolean(local || stored);
          const selected = selectedSlot === slot;
          const busy = busySlot === slot;
          const queued = Boolean(pendingFiles[slot]);
          return (
            <button
              key={slot}
              type="button"
              disabled={uploading}
              onClick={() => onSlotActivate(slot)}
              className={[
                "group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white p-2 text-center transition",
                selected ? "border-ims-primary ring-2 ring-ims-primary/30" : "border-slate-300 hover:border-ims-primary/60",
                busy ? "opacity-60" : "",
              ].join(" ")}
            >
              {hasImage ? (
                <>
                  <SiteImageThumb
                    localUrl={local}
                    storedUrl={stored}
                    alt={slot}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 z-[1] bg-black/55 px-1 py-0.5 text-[10px] font-medium text-white">
                    {slot}
                    {queued ? " · pending" : ""}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute right-1 top-1 z-[1] inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlot(slot);
                      if (pendingFiles[slot] || localPreviews[slot]) {
                        clearSlotLocal(slot);
                        if (!bySlot.has(slot)) return;
                      }
                      void remove.mutateAsync(slot);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSlot(slot);
                        if (pendingFiles[slot] || localPreviews[slot]) {
                          clearSlotLocal(slot);
                          if (!bySlot.has(slot)) return;
                        }
                        void remove.mutateAsync(slot);
                      }
                    }}
                    aria-label={`Remove ${slot}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </>
              ) : (
                <>
                  <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 lg:h-12 lg:w-12">
                    {busy ? <Camera className="h-5 w-5 animate-pulse" /> : <ImageDown className="h-5 w-5 lg:h-6 lg:w-6" />}
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 sm:text-xs">{slot}</span>
                  {isFixedSiteImageSlot(slot) ? null : (
                    <span
                      role="button"
                      tabIndex={0}
                      className="absolute right-1 top-1 z-[1] inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white"
                      onClick={(event) => {
                        event.stopPropagation();
                        dropExtraSlot(slot);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          dropExtraSlot(slot);
                        }
                      }}
                      aria-label={`Remove ${slot}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
        <button
          type="button"
          disabled={uploading}
          onClick={addImageSpace}
          className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-ims-primary/40 bg-[#f7f8fd] p-2 text-center text-ims-primary transition hover:border-ims-primary"
        >
          <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ims-primary lg:h-12 lg:w-12">
            <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
          </span>
          <span className="text-[11px] font-semibold sm:text-xs">Add image</span>
        </button>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-3">
        {renderSlotGrid()}
        {error ? <p className="text-center text-sm text-rose-600">{error}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="ims-btn-secondary min-h-11 disabled:opacity-40" disabled={!selectedSlot || uploading} onClick={onUploadClick}>
            Upload
          </button>
          <button type="button" className="ims-btn-primary min-h-11" disabled={uploading} onClick={() => void proceed()}>
            {proceeding ? "Uploading…" : pendingCount ? `Proceed (${pendingCount})` : "Proceed"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ims-line bg-white shadow-sm md:hidden">
        <header
          className="flex items-center gap-3 px-4 py-3 text-white"
          style={{ background: "var(--ims-header-gradient)" }}
        >
          <BackButton
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/15"
            iconClassName="h-5 w-5"
          />
          <h1 className="text-base font-semibold tracking-wide">Site Image Capture</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 text-center text-xs text-slate-500">
            Capture or attach images for each slot. Tap Proceed to upload Interior / Exterior photos to the lead.
          </p>
          {renderSlotGrid()}
          {error ? <p className="mt-3 text-center text-sm text-rose-600">{error}</p> : null}
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-ims-line bg-white px-3 py-3">
          <button
            type="button"
            className="ims-btn-secondary min-h-11 disabled:opacity-40"
            disabled={!selectedSlot || uploading}
            onClick={onUploadClick}
          >
            Upload
          </button>
          <button type="button" className="ims-btn-primary min-h-11" disabled={uploading} onClick={() => void proceed()}>
            {proceeding ? "Uploading…" : pendingCount ? `Proceed (${pendingCount})` : "Proceed"}
          </button>
        </footer>

        {showGalleryHint ? (
          <div className="border-t border-ims-line px-3 py-2 text-center">
            <button
              type="button"
              className="text-xs font-medium text-ims-primary underline-offset-2 hover:underline"
              disabled={uploading}
              onClick={() => selectedSlot && openGallery(selectedSlot)}
            >
              Choose from gallery instead
            </button>
          </div>
        ) : null}
      </section>

      <section className="hidden space-y-4 md:block">
        <Breadcrumb current="Site Image Capture" />
        <div className="ims-card overflow-hidden">
          <CardHeader
            title="Site Image Capture"
            subtitle={`${leadLabel} · Queue Interior / Exterior photos, then Proceed to upload them to the lead.`}
          >
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ims-btn-secondary min-h-10 px-4" onClick={() => navigate(-1)}>
                Back
              </button>
              <button
                type="button"
                className="ims-btn-secondary min-h-10 px-4 disabled:opacity-40"
                disabled={!selectedSlot || uploading}
                onClick={onUploadClick}
              >
                Upload
              </button>
              <button
                type="button"
                className="ims-btn-primary min-h-10 px-6"
                disabled={uploading}
                onClick={() => void proceed()}
              >
                {proceeding ? "Uploading…" : pendingCount ? `Proceed (${pendingCount})` : "Proceed"}
              </button>
            </div>
          </CardHeader>

          <div className="space-y-4 border-t border-ims-line px-5 py-5">
            {renderSlotGrid()}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {showGalleryHint ? (
              <button
                type="button"
                className="text-sm font-medium text-ims-primary underline-offset-2 hover:underline"
                disabled={uploading}
                onClick={() => selectedSlot && openGallery(selectedSlot)}
              >
                Choose from gallery instead
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && selectedSlot) queueFile(selectedSlot, file);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && selectedSlot) queueFile(selectedSlot, file);
        }}
      />
      <WebcamCaptureDialog
        open={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={(file) => {
          setWebcamOpen(false);
          if (selectedSlot) queueFile(selectedSlot, file);
        }}
      />
    </>
  );
}
