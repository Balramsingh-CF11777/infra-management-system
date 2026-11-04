import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import {
  getLeadDetail,
  getProspect,
  removeLeadDocument,
  removeProspectDocument,
  uploadLeadDocument,
  uploadProspectDocument,
} from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { useSmartBack } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { FloatField, floatControlClass } from "@/components/common/FloatField";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { SiteImageThumb } from "@/components/common/SiteImageThumb";
import { WebcamCaptureDialog, canUseWebcam } from "@/components/common/WebcamCaptureDialog";
import {
  SITE_IMAGE_KINDS,
  SITE_IMAGE_SLOTS,
  extraSiteImageSlots,
  isFixedSiteImageSlot,
  nextKindSlot,
  slotLabelFor,
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
  const location = useLocation();
  const prospectMode = location.pathname.includes("/chola360/prospects/");
  const navigate = useNavigate();
  const returnTo = prospectMode
    ? `/chola360/prospects/${encodeURIComponent(name)}/checkpoints`
    : `/chola360/leads/${encodeURIComponent(name)}/site-verification`;
  const goBack = useSmartBack(returnTo);
  const queryClient = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedSlot, setSelectedSlot] = useState<SiteImageSlot | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const [error, setError] = useState(() => {
    const state = location.state as { uploadError?: string } | null;
    return state?.uploadError || "";
  });
  const [localPreviews, setLocalPreviews] = useState<Partial<Record<SiteImageSlot, string>>>({});
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<SiteImageSlot, File>>>({});
  const [extraSlots, setExtraSlots] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<(typeof SITE_IMAGE_KINDS)[number]>("Interior");
  const [addName, setAddName] = useState("");
  const needsCustomName = addKind === "Surroundings" || addKind === "Other";

  const detail = useQuery({
    queryKey: prospectMode ? queryKeys.leadProspect(name) : queryKeys.leadDetail(name),
    queryFn: () => (prospectMode ? getProspect(name) : getLeadDetail(name)),
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
        if (!merged.includes(slot) && !isFixedSiteImageSlot(slot)) {
          merged.push(slot);
        }
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
    mutationFn: (slot: SiteImageSlot) =>
      prospectMode ? removeProspectDocument(name, slot) : removeLeadDocument(name, slot),
    onSuccess: async (_data, slot) => {
      clearSlotLocal(slot);
      await queryClient.invalidateQueries({
        queryKey: prospectMode ? queryKeys.leadProspect(name) : queryKeys.leadDetail(name),
      });
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

  async function uploadPendingSlots(slotsToSave: SiteImageSlot[]) {
    const ready = slotsToSave.filter((slot) => Boolean(pendingFiles[slot]));
    if (!ready.length) return [] as string[];

    // DMS first, then save on Lead Prospect or Lead Request child table.
    const failures: string[] = [];
    for (const slot of ready) {
      const file = pendingFiles[slot];
      if (!file) continue;
      setBusySlot(slot);
      try {
        if (prospectMode) await uploadProspectDocument(name, slot, file);
        else await uploadLeadDocument(name, slot, file);
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
    await queryClient.invalidateQueries({
      queryKey: prospectMode ? queryKeys.leadProspect(name) : queryKeys.leadDetail(name),
    });
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
      else navigate(returnTo, { replace: true });
    } finally {
      setProceeding(false);
    }
  }

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title={prospectMode ? "Lead Prospect unavailable" : "Lead unavailable"}
        body={
          detail.error instanceof ApiError
            ? detail.error.message
            : prospectMode
              ? "This Lead Prospect could not be loaded."
              : "This Lead Request could not be loaded."
        }
      />
    );
  }

  const lead = detail.data;
  const uploading = Boolean(busySlot) || remove.isPending || proceeding;
  const pendingCount = Object.keys(pendingFiles).length;
  const leadLabel = prospectMode
    ? name
    : String(lead?.property_id || lead?.location_details || lead?.name || name);
  const showGalleryHint = Boolean(selectedSlot && !bySlot.has(selectedSlot) && !localPreviews[selectedSlot]);

  function addImageSpace() {
    setAddKind("Interior");
    setAddName("");
    setAddOpen(true);
    setError("");
  }

  function removeSlot(slot: SiteImageSlot) {
    setSelectedSlot(slot);
    if (pendingFiles[slot] || localPreviews[slot]) {
      clearSlotLocal(slot);
      if (!bySlot.has(slot)) return;
    }
    void remove.mutateAsync(slot);
  }

  function confirmAddedSlot() {
    const filled = new Set<string>([
      ...bySlot.keys(),
      ...Object.keys(pendingFiles).filter((slot) => Boolean(pendingFiles[slot] || localPreviews[slot])),
      ...Object.keys(localPreviews).filter((slot) => Boolean(localPreviews[slot])),
    ]);
    let label: string;
    let isNew = true;
    if (addKind === "Interior" || addKind === "Exterior") {
      const next = nextKindSlot(addKind, slots, filled);
      label = next.label;
      isNew = next.isNew;
    } else {
      label = slotLabelFor(addKind, addName, slots);
      isNew = !slots.includes(label);
    }
    if (isNew) {
      setExtraSlots((prev) => (prev.includes(label) ? prev : [...prev, label]));
    }
    setAddOpen(false);
    setAddName("");
    setSelectedSlot(label);
    setError("");
    openCapture(label);
  }

  function dropExtraSlot(slot: string) {
    if (isFixedSiteImageSlot(slot)) return;
    clearSlotLocal(slot);
    setExtraSlots((prev) => prev.filter((item) => item !== slot));
    if (bySlot.has(slot)) void remove.mutateAsync(slot);
    if (selectedSlot === slot) setSelectedSlot(null);
  }

  function renderSlotGrid() {
    return (
      <div className="mx-auto grid w-full max-w-[24rem] grid-cols-3 justify-items-center gap-3 sm:max-w-lg sm:gap-4 lg:max-w-xl">
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
              aria-label={`Upload ${slot} photo`}
              className={[
                "photo-upload group relative inline-flex h-[114px] w-[114px] box-border flex-col items-center overflow-hidden rounded border border-dashed border-[#9fa9ba] bg-[rgb(255_255_255/40%)] text-[#292d32] shadow-[0_4px_12px_rgb(105_105_105/10%)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#5940b6]",
                selected ? "outline outline-2 outline-offset-[3px] outline-[#5940b6]" : "",
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
                  <span className="absolute inset-x-0 bottom-0 z-[1] bg-black/55 px-1 py-0.5 text-center font-sans text-[11px] font-medium text-white">
                    {slot}
                    {queued ? " · pending" : ""}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute right-1 top-1 z-[1] inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlot(slot);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        removeSlot(slot);
                      }
                    }}
                    aria-label={`Remove ${slot}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className={`pointer-events-none absolute top-[26px] h-[26px] w-[26px] ${busy ? "animate-pulse" : ""}`}
                    viewBox="0 0 26 26"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M9 3h8l2 4h2a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h2l2-4Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M11.5 8.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="13" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  <span className="pointer-events-none absolute top-[70px] font-sans text-[14px] font-medium leading-4 text-[#333]">
                    {slot}
                  </span>
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
          className="photo-upload relative inline-flex h-[114px] w-[114px] box-border flex-col items-center overflow-hidden rounded border border-dashed border-[#9fa9ba] bg-[rgb(255_255_255/40%)] text-[#5940b6] shadow-[0_4px_12px_rgb(105_105_105/10%)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#5940b6]"
        >
          <span className="pointer-events-none absolute top-[26px] inline-flex h-[26px] w-[26px] items-center justify-center">
            <Plus className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <span className="pointer-events-none absolute top-[70px] font-sans text-[14px] font-medium leading-4 text-[#333]">
            Add image
          </span>
        </button>
      </div>
    );
  }

  const addDialog =
    addOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 cursor-default"
              onClick={() => setAddOpen(false)}
            />
            <form
              className="relative z-[1] w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.18)] sm:rounded-3xl sm:pb-5"
              onSubmit={(event) => {
                event.preventDefault();
                confirmAddedSlot();
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
              <h2 className="text-base font-semibold text-ims-ink">Add image</h2>
              <p className="mt-1 text-sm text-slate-500">
                Interior / Exterior reuse an empty card of that type, or add the next number. Surroundings / Other can use a custom name.
              </p>
              <div className="mt-4 space-y-3">
                <FieldSelect
                  floated
                  label="Type"
                  value={addKind}
                  placeholder="Select"
                  options={SITE_IMAGE_KINDS.map((kind) => ({ value: kind, label: kind }))}
                  onChange={(next) => {
                    setAddKind(next as (typeof SITE_IMAGE_KINDS)[number]);
                    setAddName("");
                  }}
                />
                {needsCustomName ? (
                  <FloatField label="Name (optional)">
                    <input
                      className={floatControlClass}
                      value={addName}
                      onChange={(event) => setAddName(event.target.value)}
                      placeholder={`${addKind} 1`}
                    />
                  </FloatField>
                ) : null}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" className="ims-btn-secondary min-h-11" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ims-btn-primary min-h-11">
                  Add
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )
      : null;

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
        {addDialog}
      </div>
    );
  }

  return (
    <>
      <section className="flex w-full min-w-0 flex-col md:hidden">
        <div className="flex-1 px-1 pb-[calc(8.5rem+env(safe-area-inset-bottom))]">
          {renderSlotGrid()}
          {error ? <p className="mt-3 text-center text-sm text-rose-600">{error}</p> : null}
          {showGalleryHint ? (
            <button
              type="button"
              className="mt-3 w-full text-center text-xs font-medium text-ims-primary underline-offset-2 hover:underline"
              disabled={uploading}
              onClick={() => selectedSlot && openGallery(selectedSlot)}
            >
              Choose from gallery instead
            </button>
          ) : null}
        </div>

        <footer className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ims-line bg-white px-3 py-3 md:hidden">
          <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-3">
            <button
              type="button"
              className="ims-btn-secondary min-h-11 disabled:opacity-40"
              disabled={!selectedSlot || uploading}
              onClick={onUploadClick}
            >
              Upload
            </button>
            <button type="button" className="ims-btn-primary min-h-11" disabled={uploading} onClick={() => void proceed()}>
              {proceeding ? "Uploading…" : "Proceed"}
            </button>
          </div>
        </footer>
      </section>

      <section className="hidden space-y-4 md:block">
        <Breadcrumb current="Site Image Capture" />
        <div className="ims-card overflow-hidden">
          <CardHeader
            title="Site Image Capture"
            subtitle={
              prospectMode
                ? "Tap a slot to capture. Add image creates another Interior or Exterior slot. Proceed returns to Site Verification."
                : `${leadLabel} · Tap a slot to capture. Proceed returns to Site Verification.`
            }
          >
            <button type="button" className="ims-btn-secondary min-h-10 px-4" onClick={goBack}>
              Back
            </button>
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
            <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-3 lg:max-w-xl">
              <button
                type="button"
                className="ims-btn-secondary min-h-11 disabled:opacity-40"
                disabled={!selectedSlot || uploading}
                onClick={onUploadClick}
              >
                Upload
              </button>
              <button type="button" className="ims-btn-primary min-h-11" disabled={uploading} onClick={() => void proceed()}>
                {proceeding ? "Uploading…" : "Proceed"}
              </button>
            </div>
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
      {addDialog}
    </>
  );
}
