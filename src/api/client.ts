import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ApiError } from "@/types/api";
import { runtimeConfig } from "@/config/runtime";

export const PORTAL_NOT_INSTALLED = "PORTAL_NOT_INSTALLED";

export function isPortalMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === PORTAL_NOT_INSTALLED;
}

export const api = axios.create({
  baseURL: runtimeConfig.frappeUrl,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

let onUnauthorized: () => void = () => undefined;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// Frappe keeps the CSRF token in the server session, not in a cookie the SPA can read
// across origins. It is fetched after login and held only in memory.
let csrfToken = "";
let csrfRequest: Promise<string> | null = null;

export function clearCsrfToken() {
  csrfToken = "";
  csrfRequest = null;
}

function csrfFromCookie(): string {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]).replace(/^"|"$/g, "") : "";
}

export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const cookieToken = csrfFromCookie();
  if (cookieToken) {
    csrfToken = cookieToken;
    return csrfToken;
  }
  csrfRequest ??= api
    .get<{ message?: { data?: { csrf_token?: string } } | string }>("/api/method/infra_ms.portal.auth.get_csrf_token")
    .then((response) => {
      const message = response.data?.message;
      if (message && typeof message === "object" && message.data?.csrf_token) {
        csrfToken = message.data.csrf_token;
      }
      return csrfToken;
    })
    .catch(async () => {
      const response = await api.get<{ message?: string }>("/api/method/frappe.sessions.get_csrf_token");
      csrfToken = typeof response.data?.message === "string" ? response.data.message : csrfFromCookie();
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

const CSRF_EXEMPT = [
  "/api/method/login",
  "/api/method/infra_ms.portal.auth.get_csrf_token",
  "/api/method/frappe.sessions.get_csrf_token",
];

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;

  // Let the browser set multipart boundary (vendor-portal pattern).
  if (isFormData && config.headers) {
    const headers = config.headers as { delete?: (key: string) => void } & Record<string, unknown>;
    headers.delete?.("Content-Type");
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  if (method !== "get" && !CSRF_EXEMPT.includes(config.url || "")) {
    const token = await ensureCsrfToken();
    if (token) {
      config.headers["X-Frappe-CSRF-Token"] = token;
      // Frappe also accepts csrf_token inside multipart bodies.
      if (isFormData && !(config.data as FormData).has("csrf_token")) {
        (config.data as FormData).append("csrf_token", token);
      }
    }
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

interface Envelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ exc_type?: string; _server_messages?: string; exception?: string; message?: unknown }>) => {
    const status = error.response?.status ?? 0;
    const excType = error.response?.data?.exc_type ?? "";
    const exception = error.response?.data?.exception ?? "";
    const config = error.config as RetryConfig | undefined;

    const url = config?.url || "";
    const isLogin = url.endsWith("/api/method/login");
    const isCsrfFetch = url.includes("get_csrf_token");
    const portalBroken =
      exception.includes("infra_ms.portal") &&
      (exception.includes("Failed to get method for command") ||
        exception.includes("ModuleNotFoundError") ||
        exception.includes("No module named"));

    if (portalBroken) {
      throw new ApiError(
        "The Infra Management portal API is not installed on this Frappe site yet.",
        PORTAL_NOT_INSTALLED,
        status,
      );
    }
    if (excType === "CSRFTokenError" && config && !config._csrfRetried) {
      config._csrfRetried = true;
      clearCsrfToken();
      return api.request(config);
    }
    if (isLogin) {
      throw new ApiError(
        frappeMessage(error.response?.data) || "Login failed. Check the user ID and password.",
        excType || "LOGIN_FAILED",
        status,
      );
    }
    // CSRF probes often 403 before the sid cookie is visible — never treat as logout.
    if (isCsrfFetch) {
      throw new ApiError(
        frappeMessage(error.response?.data) || "CSRF token unavailable",
        "CSRF_UNAVAILABLE",
        status,
      );
    }
    const guestDenied =
      (status === 403 || status === 417) &&
      (exception.includes("Login to access") || exception.includes("not whitelisted"));
    if (status === 401 || guestDenied || excType === "AuthenticationError" || excType === "SessionExpired") {
      clearCsrfToken();
      onUnauthorized();
      throw new ApiError("Your session has ended. Sign in again.", "UNAUTHENTICATED", 401);
    }
    const envelope = portalError(error.response?.data?.message);
    if (envelope) {
      throw new ApiError(envelope.message, envelope.code, status, envelope.details);
    }
    const message =
      frappeMessage(error.response?.data) ||
      (status === 0 ? "The Infra Management server could not be reached." : error.message) ||
      "Request failed";
    throw new ApiError(message, excType || "HTTP_ERROR", status);
  },
);

export function portalError(message: unknown): { code: string; message: string; details?: Record<string, unknown> } | null {
  if (!message || typeof message !== "object" || !("success" in message) || (message as Envelope<unknown>).success !== false) {
    return null;
  }
  const error = (message as Envelope<unknown>).error;
  return {
    code: error?.code || "ERROR",
    message: error?.message || "Request failed",
    details: error?.details,
  };
}

function frappeMessage(data?: { _server_messages?: string; message?: unknown }): string {
  const envelope = portalError(data?.message);
  if (envelope) return envelope.message;
  if (!data?._server_messages) return typeof data?.message === "string" ? data.message : "";
  try {
    const messages = JSON.parse(data._server_messages) as string[];
    const first = messages[0] ? (JSON.parse(messages[0]) as { message?: string }) : {};
    return first.message || "";
  } catch {
    return "";
  }
}

export async function callMethod<T>(
  method: string,
  args?: Record<string, unknown> | FormData,
  httpMethod: "get" | "post" = "get",
): Promise<T> {
  const response = await api.request<{ message?: Envelope<T> | string }>({
    url: `/api/method/${method}`,
    method: httpMethod,
    params: httpMethod === "get" ? args : undefined,
    data: httpMethod === "post" ? args : undefined,
  });
  const message = response.data?.message;
  if (message && typeof message === "object" && message.success === false) {
    throw new ApiError(
      message.error?.message || "Request failed",
      message.error?.code || "ERROR",
      response.status,
      message.error?.details,
    );
  }
  if (message && typeof message === "object" && "data" in message) {
    return message.data as T;
  }
  return message as T;
}
