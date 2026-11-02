# Infra Management portal

React frontend for the existing Frappe Infra Management System. Frappe remains the system of record.

The React app is hosted on a **different server** from Frappe.

## Run locally

```bash
cp .env.example .env      # set VITE_FRAPPE_API_URL to your Frappe server
npm install
npm run dev
```

Open http://localhost:5174. `npm run dev` proxies `/api`, `/files`, and `/private` to `VITE_FRAPPE_API_URL` (UAT: `https://uatimcore26.chola.murugappa.com`), so login works without changing CORS on Frappe.

Until `infra_ms.portal` is installed on the site, the app runs in read-only access-check mode. It uses standard Frappe login and the existing `infra_ms.api` role queues, then shows the user's roles, mapped product lines, and which queues the server allows. Opening a request and running workflow actions need the portal API.

## Install the portal API on the Frappe server

Copy `backend/infra_ms/infra_ms/portal` into the existing app:

```text
apps/infra_ms/infra_ms/portal
```

Do not replace `infra_ms/api.py`. Then run:

```bash
bench --site <site> clear-cache
bench restart
```

## Deploy the React server

```bash
npm run build           # output in dist/
```

Copy `dist/` to the React server, then edit `dist/config.js` for that environment. One build works for UAT and production.

| Option | `config.js` `frappeUrl` | Nginx file | Frappe change |
| --- | --- | --- | --- |
| A. React server proxies Frappe (recommended) | `""` | `deploy/nginx-react-proxy.conf` | none |
| B. Browser calls Frappe directly | `"https://ims-api.company.com"` | `deploy/nginx-react-direct.conf` | `allow_cors` |

Option B only works when both hosts share a registrable domain (for example `*.company.com`), because Frappe's session cookie is `SameSite=Lax`. Details are in `deploy/FRAPPE_SITE_CONFIG.md`.
