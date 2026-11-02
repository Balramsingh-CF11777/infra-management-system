/**
 * The SPA is hosted separately from Frappe. `public/config.js` is loaded before
 * the bundle and can be replaced per environment without rebuilding.
 *
 * frappeUrl = ""            -> same-origin: the React host reverse-proxies /api, /files, /private
 * frappeUrl = "https://..." -> direct cross-origin calls; Frappe must allow the SPA origin in allow_cors
 */
import { frappeFileUrl as buildFileUrl } from "@/lib/files";

interface RuntimeConfig {
  appEnv: string;
  frappeUrl: string;
}

declare global {
  interface Window {
    __IMS_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const fromWindow = typeof window !== "undefined" ? window.__IMS_CONFIG__ ?? {} : {};
const useDevProxy = import.meta.env.DEV && import.meta.env.VITE_DEV_PROXY !== "false";

export const runtimeConfig: RuntimeConfig = {
  appEnv: fromWindow.appEnv || import.meta.env.VITE_APP_ENV || "local",
  frappeUrl: useDevProxy ? "" : (fromWindow.frappeUrl ?? import.meta.env.VITE_FRAPPE_API_URL ?? "").replace(/\/+$/, ""),
};

/** Attach values on this site are DMS ids or GET_File URLs, not /private/files paths. */
export function frappeFileUrl(path?: string | null, fileName?: string): string {
  return buildFileUrl(path, fileName, runtimeConfig.frappeUrl);
}
