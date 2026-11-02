# React pages and Frappe links

Last updated: 1 Nov 2026.

Use this file when you change a page, route, or Frappe method by hand. Update the matching row in the tables below. Deeper design notes stay in `docs/ARCHITECTURE.md`, `Chola360-Lead-Master-Prompt.md`, and `Chola360-Lead-Request-Phase1-Design.md`.

Frappe is the system of record. React only displays data and sends actions. Workflow rules, permissions, and DocType saves stay on the server.

## How a page talks to Frappe

1. Route is declared in `src/app/router.tsx`.
2. Page lives under `src/features/<area>/`.
3. Page calls a function in `src/api/<area>.ts`.
4. That function calls `callMethod` in `src/api/client.ts`.
5. Browser hits `GET` or `POST` `/api/method/<dotted.python.path>`.
6. Frappe wraps the return value in `{ "message": ... }`. Portal methods inside that use `{ success, data, message }`.

Login cookie is the session. CSRF token is kept in memory (`X-Frappe-CSRF-Token`). Do not store the session in local storage.

Runtime Frappe URL: `public/config.js` field `frappeUrl`. Local dev proxies `/api`, `/files`, and `/private` to `VITE_FRAPPE_API_URL`.

Two API modes (`user.api_mode` on the session):

| Mode | When | What the UI can do |
| --- | --- | --- |
| `portal` | `infra_ms.portal` is installed on the site | Read and write |
| `compat` | Portal module is missing | Login plus read-only role queues from `infra_ms.api` |

If a portal call fails with “method not found”, the client sets error code `PORTAL_NOT_INSTALLED`.

## Which home the user sees

`src/features/dashboard/DashboardPage.tsx` picks the screen. `src/lib/arbmAccess.ts` `homePathForUser` sends some roles away from `/dashboard`.

| Who | Lands on | React file | Gate |
| --- | --- | --- | --- |
| Area Regional Business Manager (only, or selected role) | `/chola360/leads` | `src/features/leads/LeadHomePage.tsx` | `usesArbmLeadHome` |
| Regional Infra Business Partner (only, or selected role) | `/chola360/leads` | same | `usesRibLeadHome` |
| IMS MIS only (`user.dashboard === "mis"`) | `/dashboard` | `src/features/mis/MisDashboardPage.tsx` | `usesMisDashboard` |
| Everyone else | `/dashboard` | `DefaultDashboard` inside `DashboardPage.tsx` | — |

Admins are not redirected to leads. MIS-only users are sent back to `/dashboard` if they open other modules (`HiddenForMisDashboard` in the router).

Nav items: `src/config/navigation.ts`. A module shows when it is in `user.available_modules`. Dashboard and Pending With Me always show, except MIS-only users see Dashboard only.

## Default infra dashboard

| Piece | File | Frappe method |
| --- | --- | --- |
| Summary cards, region cards, queue preview | `src/api/dashboard.ts` `getDashboardSummary` | `infra_ms.portal.dashboard.get_dashboard_summary` |
| Same screen in compat mode | `src/api/compat.ts` `getCompatDashboard` | role queues in the table below |
| Pending badge in the shell | `getMyPendingActions` | `infra_ms.portal.dashboard.get_my_pending_actions` |
| Region cards | `src/features/dashboard/RegionCardsSection.tsx` | built from `data.home` or `data.home_rows` |
| Gold Loan home math | `src/lib/goldLoanHome.ts` | client only |
| Business Team region scope | `src/lib/businessTeamRegions.ts` | uses `data.region_access` or user scope |

Cards link to:

| Card | Path |
| --- | --- |
| Total Properties, Review Pending, Approved | `/infra/requests` |
| Rework Raised | `/pending` |
| Set Branch Launches | `/infra/requests?q=Inauguration` |
| Queue “View All” | `/pending` |
| A queue row | `/documents/<doctype>/<name>` (compat mode stays on `/pending`) |

Query cache key: `queryKeys.dashboard` and `queryKeys.pending` in `src/api/keys.ts`.

### Compat role queues (`src/api/compat.ts`)

Used only when portal is not installed. Each method already exists on Desk.

| Role | Frappe method | Nav module |
| --- | --- | --- |
| Regional Infra Business Partner | `infra_ms.api.get_ribp_workspace_queue` | pending |
| Zonal Infra Business Partner | `infra_ms.api.get_zibp_workspace_queue` | pending |
| RLM | `infra_ms.api.get_rlm_workspace_queue` | pending |
| HO Corporate Legal Team | `infra_ms.api.get_ho_corporate_legal_workspace_queue` | pending |
| Infra Head | `infra_ms.api.get_infra_head_workspace_queue` | pending |
| Finance Head | `infra_ms.api.get_finance_head_workspace_queue` | pending |
| Business Head | `infra_ms.api.get_business_head_workspace_queue` | pending |
| HO Infra Legal Team | `infra_ms.api.get_ho_infra_legal_workspace_queue` | operations |
| HO Infra Process Owner | `infra_ms.api.get_ho_process_owner_workspace_queue` | operations |
| HO Infra Payment Team | `infra_ms.api.get_ho_payment_team_workspace_queue` | operations |
| Business Team | `infra_ms.api.get_business_team_dashboard_data` | new_branch |
| IMS MIS / IMS MIS User / IMS MIS Approver | `infra_ms.api.get_ims_mis_workspace_queue` | dashboard |

## MIS dashboard

Shown at `/dashboard` for MIS-only users. Does not need `infra_ms.portal`.

| Screen | React file | Frappe |
| --- | --- | --- |
| MIS home (FY filter, Draft / Approval Pending / Complete) | `src/features/mis/MisDashboardPage.tsx` | `src/api/misDashboard.ts` |
| List | `src/features/mis/MisRequestListPage.tsx` | same API, route `/mis/requests` |
| Create / view / action dialogs | `MisCreateDialog.tsx`, `MisViewDialog.tsx`, `MisActionDialog.tsx` | same |

Main Frappe calls inside `src/api/misDashboard.ts`:

| Action | Method |
| --- | --- |
| List and count | `frappe.client.get_list`, `frappe.client.get_count` |
| Read and save | `frappe.client.get`, `frappe.client.save` |
| Allowed buttons | `frappe.model.workflow.get_transitions` |
| Apply action | `infra_ms.infra_management_system.doctype.mis_product_wise_branch_initiate.mis_product_wise_branch_initiate.apply_mis_product_wise_branch_workflow_action` |
| Product lines | `infra_ms.api.get_product_lines` |
| File upload | `infra_ms.controllers.file.controller.upload_file_to_external_server` |

DocType: `MIS Product Wise Branch Initiate`.

Role flags: `src/lib/misAccess.ts`. Create is allowed for `IMS MIS User` and `IMS MIS` unless the server sends `permissions.can_create_mis_request`.

## Property leads (Chola 360)

All methods are in `src/api/leads.ts`. Python prefix: `infra_ms.portal.lead_request`.

| Route | React file | Frappe method |
| --- | --- | --- |
| `/chola360/leads` | `LeadHomePage.tsx` → `LeadDashboard.tsx` | `get_lead_home` |
| `/chola360/leads?geo_state=` | `GeoStateRegionsPage.tsx` | `get_lead_home` (geo groups) |
| `/chola360/leads?area=` or `region=` or `location=` or `state=` | `BranchLeadListPage.tsx` | `list_leads` |
| `/chola360/leads/new` | `CreateLeadPage.tsx` | `create_lead`, `list_regional_infra_business_partners`, `upload_lead_document`, `get_lead_document_types` |
| `/chola360/leads/:id` | `LeadDetailPage.tsx` | `get_lead_detail` |
| `/chola360/leads/:id/site-verification` | `RimSiteVerificationPage.tsx` | `save_site_verification` |
| `/chola360/leads/:id/approval` | `ApprovalDeskPage.tsx` | `apply_lead_workflow_action` |

Verification is one page: `/chola360/leads/:id/approval`. The map sits above the History Trail without the geo-location line. Stages stay Pending until workflow state is exactly Approved by the Area Regional Business Manager or Regional Infra Business Partner. Property, Commercial, Facility, and Owner fields are on that same page. Older verification routes redirect here. Property Verification and Rent Negotiation show Negotiation Details and Documents. Legal Clearance shows the site-verification checklist. An Approved lead, or one that already has a Proposed Branch, marks every trail stage Completed.

`?demo=1` on the lead home uses sample data in `src/api/leads.ts` and does not call Frappe.

Query keys: `leadHome`, `leadList`, `leadDetail`.

## Proposed branch and other records

| Route | React file | API file | Frappe prefix |
| --- | --- | --- | --- |
| `/login` | `src/features/auth/LoginPage.tsx` | `src/api/auth.ts` | `/api/method/login`, then `infra_ms.portal.auth.get_current_user_context` |
| `/pending` | `src/features/pending/PendingPage.tsx` | `src/api/dashboard.ts` | `infra_ms.portal.dashboard.get_my_pending_actions` |
| `/infra/requests` | `src/features/proposedBranch/RequestListPage.tsx` | `src/api/proposedBranch.ts` | `infra_ms.portal.proposed_branch.get_requests` |
| `/infra/requests/:id` | `RequestWorkspace.tsx` Overview | same | `get_request_detail` |
| `.../property-details` | `DetailsSectionTab` | same + `PropertyForm.tsx` | `save_request_section` |
| `.../commercial-details` | same | same | `save_request_section` |
| `.../facility-details` | same | same | `save_request_section` |
| `.../owner-details` | same | same | `save_request_section` |
| `.../queries` | `QueriesTab` + `src/components/queries/QueryPanel.tsx` | `src/api/query.ts` | `infra_ms.portal.queries.*` |
| `.../activity` | `ActivityTab` | `src/api/workflow.ts` | `get_workflow_timeline`, `get_workflow_comments` |
| `/documents` | `DocumentsPage.tsx` | `src/api/documents.ts` | `infra_ms.portal.documents.get_document_types` |
| `/documents/:doctype` | same | same | `get_document_list` |
| `/documents/:doctype/:name` | `DocumentPage.tsx` | `src/api/records.ts` | per-DocType module below |
| `/new-branch` | `NewBranchPage.tsx` | records API | `infra_ms.portal.new_branch` |
| `/new-branch/new` | `CreateNewBranchPage.tsx` | `src/api/newBranch.ts` | `get_create_options`, `create` |
| `/operations` `/reports` `/admin` | `src/pages/PlaceholderPage.tsx` | none yet | — |

Workflow buttons on a proposed branch: `src/components/workflow/WorkflowActions.tsx` → `infra_ms.portal.workflow.get_permitted_workflow_actions` and `execute_workflow_action`.

Query actions: `get_queries`, `raise_query`, `respond_to_query`, `resolve_query`, `reopen_query`.

Map pin: `src/api/geo.ts` → `infra_ms.portal.geo.get_geo_location`. Stored map value on the DocType stays GeoJSON (`Point`, coordinates `[longitude, latitude]`).

### DocType → portal module (`src/api/records.ts`)

If the DocType is not in this map, the page uses the generic `infra_ms.portal.documents` methods.

| DocType | Python module |
| --- | --- |
| New Branch Details | `infra_ms.portal.new_branch` |
| MIS Product Wise Branch Initiate | `infra_ms.portal.mis_product` |
| MIS New Branch Initiation | `infra_ms.portal.mis_allocation` |
| Branch Layout Details | `infra_ms.portal.branch_layout` |
| BAZ Vendor Code Creation | `infra_ms.portal.baz_vendor` |
| PO Status Confirmation Details | `infra_ms.portal.po_status` |
| PO Payment Advance Release Details | `infra_ms.portal.po_advance` |
| Branch Interior Work Status | `infra_ms.portal.interior` |
| Branch Rejected Details | `infra_ms.portal.rejected` |
| Query Log Details | `infra_ms.portal.query_log_details` |
| Proposed Branch Details | `infra_ms.portal.proposed_branch` (list/detail pages, not the generic records map) |

Typical methods on a records module: `get_list`, `get`, `get_actions`, `execute_action`, `get_activity`, `get_related`.

File download: `infra_ms.controllers.file.controller.GET_File` (`src/lib/files.ts`).

## Auth methods

| Action | Method |
| --- | --- |
| CSRF | `infra_ms.portal.auth.get_csrf_token` (fallback `frappe.sessions.get_csrf_token`) |
| Who am I | `infra_ms.portal.auth.get_current_user_context` |
| Nav from server | `infra_ms.portal.auth.get_navigation` |
| Logout | `infra_ms.portal.auth.logout` |

Session store: `src/stores/session.ts`. After login, `RequireAuth` in the router loads the user context before any page query runs.

## Change a page by hand

1. Find the route in `src/app/router.tsx`.
2. Open the React file from the tables above.
3. Open the matching `src/api/*.ts` and change the dotted method name if Frappe renamed it.
4. If the response shape changed, update the TypeScript type in `src/types/api.ts` or `src/features/leads/types.ts`.
5. If the screen should refresh after a save, invalidate the key in `src/api/keys.ts` (same key the page uses in `useQuery`).
6. If a new menu item is needed, add it to `NAV_ITEMS` in `src/config/navigation.ts` and return that module from `get_current_user_context` (`available_modules`).
7. If only one role should land on the new page, update `homePathForUser` in `src/lib/arbmAccess.ts`.
8. New Frappe code goes in `apps/infra_ms/infra_ms/portal` on the bench. Do not replace `infra_ms/api.py`. Then `bench --site <site> clear-cache` and `bench restart`.
9. Update the row in this file.

## Shell files you rarely change

| File | Job |
| --- | --- |
| `src/main.tsx` | App start |
| `src/app/App.tsx` | Providers + router |
| `src/app/providers.tsx` | React Query |
| `src/layouts/AppLayout.tsx` | Sidebar, role switch, pending count |
| `src/layouts/AuthLayout.tsx` | Login frame |
| `src/config/runtime.ts` | Reads `window` config / env |
