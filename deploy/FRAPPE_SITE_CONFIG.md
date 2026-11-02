# Frappe server settings for a separately hosted React app

## Option A: React server proxies `/api` (recommended)

No CORS change is needed. On the Frappe site:

- Keep the site reachable from the React server at the host name used in `proxy_set_header Host`.
- If Frappe builds absolute links, set `host_name` to the public React URL:

```bash
bench --site <site> set-config host_name "https://ims.company.com"
```

## Option B: browser calls Frappe directly

1. Allow the React origin. Frappe then returns `Access-Control-Allow-Origin: <origin>` and `Access-Control-Allow-Credentials: true`:

```bash
bench --site <site> set-config -p allow_cors '["https://ims.company.com"]'
```

Never use `"*"`. Cookies are sent with credentials, so every allowed origin can act as the logged-in user.

2. Keep both hosts on the same registrable domain, for example `ims.company.com` and `ims-api.company.com`. Frappe sets `sid` with `SameSite=Lax`. Browsers send it on same-site cross-origin requests, but not across different domains. If the domains differ, use Option A.

3. Serve both over HTTPS.

4. Restart:

```bash
bench --site <site> clear-cache
bench restart
```

## Both options

- Copy `backend/infra_ms/infra_ms/portal` to `apps/infra_ms/infra_ms/portal` when using portal APIs.
- **DMS (required for MIS attachments):** deploy over the live UAT module at:

  `/home/mgmtapp/frappe-bench/apps/infra_ms/infra_ms/controllers/file/controller.py`

  ```bash
  # From this repo → UAT bench
  cp backend/infra_ms/infra_ms/controllers/file/controller.py \
     /home/mgmtapp/frappe-bench/apps/infra_ms/infra_ms/controllers/file/controller.py
  ```

  Methods used by the SPA (host = **uatimcore26** via `/api` proxy):

  - `infra_ms.controllers.file.controller.upload_file_to_external_server`
  - `infra_ms.controllers.file.controller.GET_File`

- Do **not** hardcode Bearer tokens or Cookies inside `controller.py`. Put them in site_config (below). Rotate any token that was ever committed or pasted in chat.
- The SPA fetches the CSRF token from `infra_ms.portal.auth.get_csrf_token` after login and sends it as `X-Frappe-CSRF-Token`. Do not set `ignore_csrf` on the site.
- MIS / DMS attachments use relative `/api/method/infra_ms.controllers.file.controller.GET_File?...` URLs (older Desk links to `frappe.core.doctype.file.controller.GET_File` or `dms_filehandler` are rewritten in the SPA).
- The PeopleStrong SSO `web_logout` method is unchanged. A future OIDC login can redirect to Frappe and return to the SPA.

## DMS credentials (Frappe site_config only — never in React or Python source)

Do **not** put `dms_authorization` or `dms_cookie` in `VITE_*`, `public/config.js`, the SPA bundle, or hardcode them in `controller.py`. The React app only calls Frappe; Frappe calls DMS with site secrets.

```bash
# Required — Authorization header for AWS DMS gateway
bench --site uatimcore26.chola.murugappa.com set-config dms_authorization "Bearer <access-token>"

# Optional — Cookie header if the gateway also requires it
bench --site uatimcore26.chola.murugappa.com set-config dms_cookie "<cookie-string>"

# Optional URL overrides (defaults already match ustgapig AWS DMS)
bench --site uatimcore26.chola.murugappa.com set-config dms_upload_url "https://ustgapig.chola.murugappa.com/awsdms/1.0.0/dms/v1/image"
bench --site uatimcore26.chola.murugappa.com set-config dms_download_url "https://ustgapig.chola.murugappa.com/awsdms/1.0.0/dms/v1/image/downloadimage"
bench --site uatimcore26.chola.murugappa.com set-config dms_delete_url "<delete-endpoint-if-used>"

bench --site uatimcore26.chola.murugappa.com clear-cache
bench restart
```

Legacy key `dms_access_token` is still accepted as a fallback for `dms_authorization`.
