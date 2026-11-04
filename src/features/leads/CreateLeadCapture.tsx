import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { WebcamCaptureDialog } from "@/components/common/WebcamCaptureDialog";

export const CREATE_LEAD_CHECKS = [
  "Connected with Landlord",
  "Title Deed Document Available",
  "Building Approval Plan Available",
  "Property Tax Document Available",
  "EB Bill Document Available",
] as const;

export type CreateLeadPhoto = {
  url: string;
  file: File;
};

export function captureChecksFrom(raw: unknown): Record<string, boolean> {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  const capture = record.capture && typeof record.capture === "object" ? record.capture : record;
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(capture as Record<string, unknown>)) {
    if (key === "capture" || key.startsWith("sl_")) continue;
    out[key] = Boolean(value);
  }
  return out;
}

export function CreateLeadCapture({
  photos,
  onPhotos,
  checks,
  onToggle,
}: {
  photos: CreateLeadPhoto[];
  onPhotos: (next: CreateLeadPhoto[]) => void;
  checks: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    return () => {
      photosRef.current.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  function addFile(file: File) {
    onPhotos([...photos, { url: URL.createObjectURL(file), file }]);
  }

  function removePhoto(url: string) {
    const match = photos.find((item) => item.url === url);
    if (match?.url.startsWith("blob:")) URL.revokeObjectURL(match.url);
    onPhotos(photos.filter((item) => item.url !== url));
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 lg:col-span-2">
      <div>
        {photos.length ? (
          <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((item) => (
              <li key={item.url} className="relative aspect-square overflow-hidden rounded-xl border border-[#dde5f2]">
                <img src={item.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Remove photo"
                  onClick={() => removePhoto(item.url)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#c5cedd] bg-white px-4 py-8 text-center"
        >
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Camera className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-ims-ink">Capture Live Photo</span>
          <span className="mt-1 max-w-xs text-xs leading-snug text-slate-500">
            Capture clear images of the premises. You can also attach a photo from this device.
          </span>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dde5f2] bg-white">
        <div className="flex items-center gap-2 border-b border-[#dde5f2] px-4 py-3">
          <Check className="h-4 w-4 text-ims-primary" />
          <h3 className="text-sm font-semibold text-ims-ink">Checklist</h3>
        </div>
        <ul>
          {CREATE_LEAD_CHECKS.map((label) => {
            const on = Boolean(checks[label]);
            return (
              <li key={label} className="border-b border-[#eef2f7] last:border-b-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(label)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm text-ims-ink">{label}</span>
                  <span
                    className={[
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent",
                    ].join(" ")}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <WebcamCaptureDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={addFile} />
    </div>
  );
}
