/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
  readonly VITE_FRAPPE_API_URL: string;
  readonly VITE_DEV_PROXY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
