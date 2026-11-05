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

## Property lead flow

Create Lead saves a **Lead Prospect**. It does not create a Lead Request. **Proceed** opens Site Image Capture.

**Submit** on the 17-point Site Verification checklist creates the Lead Request, shows the Lead Submitted popup, and opens History Trail (`/chola360/leads/:id/approval`). Submit stays disabled until all 17 checks are marked.

Everything already saved on the prospect is copied onto that Lead Request:

- location, address, map pin, and geo fields
- site photos
- the 17 checks and the capture checklist
- property, owner, facility, document, and LOI details, when they were filled before submit

Property Verification on the prospect is optional and does not create the lead. After the Lead Request exists, those same screens continue on the lead.

Owner **Rent/SD Payable percentage** and **Maintenance Charges Payable Percentage** must total 100% across the owner list. Each field shows how much is still left.

Property Details uses a fixed State list. **Rental or Lease** shows only the matching fields. Rent per sq ft is monthly rent divided by built-up area, and is not typed.

The LOI screen previews the letter in a scrollable box and prints it on A4. **Send OTP** texts a 6-digit code to the primary owner's mobile. The code expires after 5 minutes. A signed PDF, JPG, or PNG up to 10 MB can be uploaded instead.

## Frappe files for this flow

These live in the `infra_ms` app, not in this React repo. Reload the app after copying them. Migrate so the DocType fields exist.

| File | What it does |
| --- | --- |
| `infra_ms/portal/lead_prospect.py` | Saves prospect details and, on checklist submit, copies them onto the Lead Request |
| `infra_ms/portal/lead_request.py` | Stamps rent per sq ft when property details are saved |
| `infra_ms/portal/loi_consent.py` | Sends and checks the owner LOI OTP |
| `lead_prospect` DocType | `property_verification`, `rental_or_lease`, detail fields, and owner / premise / KYC child tables |
| `lead_request` DocType | `rental_or_lease` |

LOI SMS uses the Bridge SMS URL and template in `loi_consent.py`. The bearer token and cookie come from site config: `sms_authorization` and `sms_cookie`, or the existing `dms_authorization` and `dms_cookie`. `sms_key` overrides the default `x-sms-key`.

```bash
bench --site <site> migrate
bench --site <site> clear-cache
bench restart
```

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
