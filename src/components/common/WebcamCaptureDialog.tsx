import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImagePlus, X } from "lucide-react";

type WebcamCaptureDialogProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

/**
 * Laptop/desktop browsers ignore &lt;input capture&gt; and only open a file picker.
 * This dialog uses getUserMedia so "Take picture" actually uses the webcam,
 * and also offers Attach image for gallery / file upload.
 */
export function WebcamCaptureDialog({ open, onClose, onCapture }: WebcamCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError("");
    setReady(false);

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser cannot access the camera. Use Attach image, or open the app on HTTPS.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission denied. Allow camera access, or use Attach image.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera was found on this device. Use Attach image instead.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setError("Camera is in use by another app. Close it and try again, or use Attach image.");
        } else {
          setError("Could not open the camera. Use Attach image, or check browser camera permissions.");
        }
      }
    }

    void start();

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      document.body.style.overflow = previous;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  async function snap() {
    const video = videoRef.current;
    if (!video || !ready || busy) return;
    setBusy(true);
    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(video, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Could not capture frame");
      const file = new File([blob], `site-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onClose();
    } catch {
      setError("Could not capture the photo. Try again or use Attach image.");
    } finally {
      setBusy(false);
    }
  }

  function onAttachFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    onCapture(file);
    onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2300] flex items-end justify-center bg-[#1f2547]/55 sm:items-center sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="webcam-capture-title"
        className="flex max-h-[min(90dvh,40rem)] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ims-line px-4 py-3">
          <h2 id="webcam-capture-title" className="text-sm font-semibold text-ims-ink">
            Take picture
          </h2>
          <button type="button" className="rounded-lg p-1.5 text-ims-ink hover:bg-slate-100" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900">
            <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted autoPlay />
            {!ready && !error ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Starting camera…</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ims-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              disabled={!ready || busy}
              onClick={() => void snap()}
            >
              <Camera className="h-4 w-4" />
              {busy ? "Capturing…" : "Capture photo"}
            </button>
            <button
              type="button"
              className="ims-btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Attach image
            </button>
            <button type="button" className="ims-btn-ghost border border-ims-line" onClick={onClose}>
              Cancel
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              onAttachFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function canUseWebcam(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}
