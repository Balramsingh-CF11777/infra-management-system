import { defineConfig } from "vitest/config";
import { loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Dev only: forwards to the remote Frappe site so the browser stays on http://localhost.
// Cookies are re-scoped to localhost; `Secure` is dropped because the dev origin is plain http.
function frappeProxy(target: string): ProxyOptions {
  const upstream = new URL(target);
  return {
    target,
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: { "*": "" },
    // Pooled sockets go stale when the VPN drops and reconnects, and writes to them fail with EPIPE.
    agent: new https.Agent({ keepAlive: false }),
    proxyTimeout: 60_000,
    timeout: 60_000,
    configure(proxy) {
      proxy.on("error", (error, _req, res) => {
        const code = (error as NodeJS.ErrnoException).code ?? "";
        const message =
          code === "ENOTFOUND" || code === "ETIMEDOUT" || code === "EHOSTUNREACH"
            ? `Cannot reach ${upstream.host}. Connect to the company VPN and try again.`
            : `The connection to ${upstream.host} was interrupted (${code || error.message}). Try again.`;
        if ("writeHead" in res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message, proxy_error: code }));
        }
      });
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("Origin", upstream.origin);
        proxyReq.setHeader("Referer", `${upstream.origin}/`);
      });
      proxy.on("proxyRes", (proxyRes) => {
        const cookies = proxyRes.headers["set-cookie"];
        if (cookies) {
          proxyRes.headers["set-cookie"] = cookies.map((cookie) => cookie.replace(/;\s*Secure/gi, ""));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_FRAPPE_API_URL || "https://uatimcore26.chola.murugappa.com";
  const useProxy = env.VITE_DEV_PROXY !== "false";

  return {
    resolve: {
      alias: { "@": path.resolve(rootDir, "src") },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "Infra Management System",
          short_name: "IMS",
          description: "Infra Management System",
          theme_color: "#332e62",
          background_color: "#f2f3ff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          globIgnores: ["config.js"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/files\//, /^\/private\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname === "/config.js",
              handler: "NetworkFirst",
            },
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/api/") || url.pathname.startsWith("/files/") || url.pathname.startsWith("/private/"),
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
    server: {
      port: 5174,
      strictPort: true,
      host: "localhost",
      proxy: useProxy
        ? {
            "/api": frappeProxy(proxyTarget),
            "/app": frappeProxy(proxyTarget),
            "/files": frappeProxy(proxyTarget),
            "/private": frappeProxy(proxyTarget),
          }
        : undefined,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});
