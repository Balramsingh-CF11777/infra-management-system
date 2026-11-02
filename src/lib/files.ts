const LEGACY_GET_FILE = "frappe.core.doctype.file.controller.GET_File";
/** UAT: /home/mgmtapp/frappe-bench/apps/infra_ms/infra_ms/controllers/file/controller.py */
const DMS_GET_FILE = "infra_ms.controllers.file.controller.GET_File";
const LEGACY_DMS_GET_FILE = "infra_ms.controllers.file.dms_filehandler.GET_File";
const LEGACY_PORTAL_GET_FILE = "infra_ms.portal.dms.GET_File";
/** Same-origin path via Vite proxy to uatimcore26 (or VITE_FRAPPE_API_URL). */
const GET_FILE_PATH = `/api/method/${DMS_GET_FILE}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(value: string) {
  const text = value.trim();
  if (text.length >= 2 && text[0] === text[text.length - 1] && (text[0] === '"' || text[0] === "'")) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function originOf(base: string) {
  if (base) return base.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function getFileUrl(base: string, dmsid: string, fileName: string, preview = "No") {
  const params = new URLSearchParams({ dmsid, file_name: fileName, Preview: preview });
  return `${base}${GET_FILE_PATH}?${params.toString()}`;
}

function isGetFileUrl(text: string) {
  return (
    text.includes(DMS_GET_FILE) ||
    text.includes(LEGACY_DMS_GET_FILE) ||
    text.includes(LEGACY_PORTAL_GET_FILE) ||
    text.includes(LEGACY_GET_FILE) ||
    (text.includes("/api/v2/method/") && text.includes("GET_File"))
  );
}

/** Build the DMS download URL Desk uses, then prefix the Frappe origin when needed. */
export function frappeFileUrl(path?: string | null, fileName?: string, origin = ""): string {
  if (!path) return "";
  const text = clean(path);
  const base = originOf(origin);

  if (isGetFileUrl(text)) {
    try {
      const parsed = new URL(text, `${base || "https://local.invalid"}/`);
      const dmsid = parsed.searchParams.get("dmsid")?.trim() || "";
      const name = (fileName || parsed.searchParams.get("file_name") || "document").trim();
      const preview = parsed.searchParams.get("Preview") || "No";
      if (!dmsid) return `${base}${GET_FILE_PATH}`;
      return getFileUrl(base, dmsid, name, preview);
    } catch {
      return text.startsWith("/") ? `${base}${text}` : text;
    }
  }

  if (UUID.test(text)) {
    return getFileUrl(base, text, (fileName || "document").trim() || "document");
  }

  if (/^https?:\/\//i.test(text)) return text;
  return `${base}${text.startsWith("/") ? "" : "/"}${text}`;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
