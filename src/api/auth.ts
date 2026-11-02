import { api, callMethod, clearCsrfToken, ensureCsrfToken, isPortalMissing } from "@/api/client";
import { clearCompatCache, getCompatUserContext } from "@/api/compat";
import { normalizeUserContext } from "@/lib/misAccess";
import type { NavItem, UserContext } from "@/types/api";

export async function login(usr: string, pwd: string) {
  clearCsrfToken();
  clearCompatCache();
  // JSON body — same as Frappe Desk /api/method/login clients.
  await api.post("/api/method/login", { usr: usr.trim(), pwd });
  // sid / csrf_token cookies are set by login; never fail sign-in if the token probe 403s.
  try {
    await ensureCsrfToken();
  } catch {
    /* cookie may still be present; later POSTs retry CSRF */
  }
}

export async function logout() {
  try {
    await callMethod<{ logged_out: boolean }>("infra_ms.portal.auth.logout", undefined, "post");
  } catch (error) {
    if (!isPortalMissing(error)) throw error;
    await api.get("/api/method/logout");
  } finally {
    clearCsrfToken();
    clearCompatCache();
  }
}

export async function getCurrentUserContext(): Promise<UserContext> {
  try {
    const context = await callMethod<UserContext>("infra_ms.portal.auth.get_current_user_context");
    return normalizeUserContext({ ...context, api_mode: "portal" });
  } catch (error) {
    if (!isPortalMissing(error)) throw error;
    return normalizeUserContext(await getCompatUserContext());
  }
}

export function getNavigation() {
  return callMethod<{ items: NavItem[] }>("infra_ms.portal.auth.get_navigation");
}
