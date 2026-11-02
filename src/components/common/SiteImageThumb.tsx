import { useEffect, useState } from "react";
import { callMethod } from "@/api/client";
import { frappeFileUrl } from "@/config/runtime";

const DMS_GET_FILE = "infra_ms.controllers.file.controller.GET_File";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractDmsId(stored: string): string {
  const text = stored.trim();
  if (UUID.test(text)) return text;
  try {
    const parsed = new URL(text, "https://local.invalid/");
    return parsed.searchParams.get("dmsid")?.trim() || "";
  } catch {
    return "";
  }
}

function extractFileName(stored: string): string {
  try {
    const parsed = new URL(stored, "https://local.invalid/");
    return parsed.searchParams.get("file_name")?.trim() || "image.jpg";
  } catch {
    return "image.jpg";
  }
}

function isLocalFilePath(stored: string) {
  return (
    stored.startsWith("/files/") ||
    stored.startsWith("/private/files/") ||
    stored.includes("/files/") ||
    stored.startsWith("data:") ||
    stored.startsWith("blob:")
  );
}

type SiteImageThumbProps = {
  /** Immediate preview after capture / attach (blob: or data:). */
  localUrl?: string | null;
  /** Persisted Lead Request.additional_attachment value (DMS id / GET_File URL / /files). */
  storedUrl?: string | null;
  alt: string;
  className?: string;
};

/** Renders a site-photo thumbnail. Prefers local blob; loads DMS via Preview=Yes. */
export function SiteImageThumb({ localUrl, storedUrl, alt, className }: SiteImageThumbProps) {
  const [src, setSrc] = useState(localUrl || "");

  useEffect(() => {
    if (localUrl) {
      setSrc(localUrl);
      return;
    }

    const stored = (storedUrl || "").trim();
    if (!stored) {
      setSrc("");
      return;
    }

    if (stored.startsWith("data:") || stored.startsWith("blob:") || isLocalFilePath(stored)) {
      setSrc(stored.startsWith("data:") || stored.startsWith("blob:") ? stored : frappeFileUrl(stored));
      return;
    }

    let cancelled = false;
    const dmsid = extractDmsId(stored);
    const fileName = extractFileName(stored);

    (async () => {
      if (!dmsid) {
        if (!cancelled) setSrc(frappeFileUrl(stored, fileName));
        return;
      }
      try {
        const data = await callMethod<string>(DMS_GET_FILE, {
          dmsid,
          file_name: fileName,
          Preview: "Yes",
        });
        if (cancelled) return;
        if (typeof data === "string" && data.startsWith("data:")) {
          setSrc(data);
          return;
        }
        setSrc(frappeFileUrl(stored, fileName));
      } catch {
        if (!cancelled) setSrc(frappeFileUrl(stored, fileName));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localUrl, storedUrl]);

  if (!src) {
    return <div className={`animate-pulse bg-slate-200 ${className || ""}`} aria-hidden />;
  }

  return <img src={src} alt={alt} className={className} draggable={false} />;
}
