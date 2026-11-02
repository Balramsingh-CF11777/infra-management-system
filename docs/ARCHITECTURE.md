# IMS architecture assessment

The React workspace was empty. This assessment is based on the operational Frappe code that already runs the desk experience:

- Dashboard API: `frappe_infra_dashboard_preserve_old_logic_fix/api.py` (4,529 lines)
- Desk client scripts under `Current Development/Infra Management System/Client Script`
- Query controller `query_log_for_proposed_branch_details.py`
- Theme tokens in `infra_ms/css/infra_ms.css`

Where this specification and that code differ, the existing server behavior is preserved. Differences are listed below.

## 1. Existing Frappe architecture

Frappe is the database, DocType, workflow, permission, file, and audit layer. The custom app module path used by Desk is:

`infra_ms.infra_management_system.doctype.proposed_branch_details.proposed_branch_details`

Bulk list actions call `branch_initiate.NBO_bulk_action.bulk_approve` / `bulk_reject`.

The current business UI is Frappe Desk plus a large whitelisted `api.py` that builds role queues, and client scripts that hide the standard timeline, set required fields, and show workflow messages.

There is no separate application database.

## 2. Relevant DocTypes

- Proposed Branch Details (`NBO/...`)
- New Branch Details (`NBI/...`), linked by `request_no_new` and `proposed_branch_id`
- MIS New Branch Initiation
- MIS Product Wise Branch Initiate (`PBIU/{ddmmyyyy}/{product}`)
- Branch Layout Details
- PO Status Confirmation Details
- PO Payment Advance Release Details
- BAZ Vendor Code Creation (`BAZ/...`)
- Query Log Details, workflow state `Query In Progress`
- Query log for Proposed Branch Details (`QL/...`)
- Infra User Based Role Master (`email_id`, `role`, `product_line`, `zone`, `area`, `scope`, `is_active`)
- Child query tables on Proposed Branch Details: `rlm_query_log`, `zibp_query_log`, `am1_query_log`, `am2_query_log`, `am3_query_log`, `am4_query_log`, `tenure_related_query`

## 3. Existing workflows

Proposed Branch states confirmed in the dashboard API include:

- Assigned to ZIBP for Branch Proposal
- Assigned to RIBP for Property Details
- Assigned to RLM
- Assigned to RIBP for RLM Approval
- Assigned to ZIBP
- Assigned to HO Infra Legal Team on Document Verification
- Assigned to Corporate Legal Team
- Assigned to Infra Head
- Assigned to Finance Head
- Assigned to Business Head
- Assigned to RIBP for LL Agreement
- Assigned to HO Infra Legal Team on Security Deposit
- Assigned to HO Infra Legal Team on Advance Issued Date
- Assigned to HO Infra Legal Team on UTR & Payment Date
- Assigned to ZIBP on LL Scope Completion and Tenure Start Date Confirmation
- Assigned to RIBP on LL Scope Completion and Tenure Start Date
- Assigned to HO Legal Team on Rental Start Date Confirmation
- Assigned to RIBP on IT Completion Date & TAT
- Assigned to RIBP on Branch Handover Confirmation
- Assigned to Business Team for the Branch Inauguration

Branch Layout Details has its own states (layout attachment, first/second cut, cost approval, PO pending, Complete).

Allowed transitions are read from the active Frappe Workflow via `get_transitions`. They are not hard-coded as the authority.

## 4. Existing APIs

The dashboard file already whitelists role queues, including:

- `get_ribp_workspace_queue`
- `get_zibp_workspace_queue`
- `get_rlm_workspace_queue`
- `get_ho_corporate_legal_workspace_queue`
- `get_infra_head_workspace_queue`
- `get_finance_head_workspace_queue`
- `get_business_head_workspace_queue`
- `get_ho_infra_legal_workspace_queue`
- `get_business_team_dashboard_data`
- `get_mis_branch_dashboard_data`
- `get_ims_mis_workspace_queue`
- `get_product_lines`
- `get_geo_location`

Workflow execution in those dashboards calls `frappe.model.workflow.apply_workflow`.

Desk also calls `after_workflow_update` on the Proposed Branch Details controller after a transition.

## 5. Existing Python business rules

- RIBP queue: workflow states whose transition role is Regional Infra Business Partner, filtered by `responsible_person` unless the user is System Manager or HO Infra Branch Admin.
- ZIBP queue: three ZIBP states, filtered by `zone_infra_business_partner`.
- RLM queue: `Assigned to RLM`, filtered by `rlm_details`.
- Infra Head, Finance Head, and Business Head each have one primary state and reject the action unless `get_transitions` still allows it.
- Query rows shown on dashboards are `Query In Progress` records where `query_responded_by` is the logged-in user.
- MIS product totals use fields such as `gold_loan`, `gold_loan_branch_opened`, and `gold_loan_branch_balance`.
- Query log naming replaces `NBO` with `QL` and syncs the response back onto the matching child row by `query_id`.

## 6. Client logic to move into React

- Login and navigation instead of Desk.
- Role queue presentation.
- Property section visibility, required-field hints, PIN/phone/PAN/GST checks, and owner percentage checks.
- Map display from `geo_latitude` / `geo_longitude`. The stored `map` value remains GeoJSON (`Point` coordinates `[longitude, latitude]`), which is what the Desk script writes.
- Workflow action dialog with a comment, instead of the Desk timeline.
- Query raise, response, resolve, and reopen screens.
- Success message after an action, without an immediate redirect.

## 7. Logic that stays on the server

- Workflow transition authority (`get_transitions` / `apply_workflow`)
- `after_workflow_update` and any related-document creation it already performs
- Permission and Infra User Based Role Master scope
- MIS allocation, branch numbering, and rejection of linked documents
- Owner-percentage enforcement on save
- Query gates before a forward transition
- File authorization

## 8. New APIs

Added as `infra_ms.portal.*` so the existing `infra_ms/api.py` module is not replaced:

- `auth.get_csrf_token`
- `auth.get_current_user_context`
- `auth.get_navigation`
- `auth.logout`
- `dashboard.get_dashboard_summary`
- `dashboard.get_my_pending_actions`
- `proposed_branch.get_requests`
- `proposed_branch.get_request_detail`
- `proposed_branch.save_request_section`
- `proposed_branch.get_related_documents`
- `workflow.get_permitted_workflow_actions`
- `workflow.execute_workflow_action`
- `workflow.get_workflow_timeline`
- `workflow.get_workflow_comments`
- `queries.get_queries`
- `queries.raise_query`
- `queries.respond_to_query`
- `queries.resolve_query`
- `queries.reopen_query`

Copy `backend/infra_ms/infra_ms/portal` into `apps/infra_ms/infra_ms/portal`.

## 9. Security gaps in the current desk layer

- `web_logout` is `allow_guest=True` and calls an identity provider with the session user.
- Several count APIs use `ignore_permissions=True` for product lines.
- Some number-card counts are not scoped by zone, region, or product line; they only check that the user has the role.
- Desk client scripts hide timeline and menu DOM nodes. That is presentation, not authorization.
- The older query controller sets `query_status = "Resolved"` on every validate. New portal queries therefore prefer `Query Log Details` when that DocType exists, so an open query can remain open. Historical rows are still read.
- Bulk approve/reject is a separate `branch_initiate` method. The portal does not call it.

The new list and detail methods deny a record unless the user is an administrator, an assignee on a known field, or matched by Infra User Based Role Master. Knowing an NBO id is not enough.

## 10. React architecture

Vite, React, TypeScript, React Router, TanStack Query, Zustand, React Hook Form, Zod, Axios, Tailwind. Session cookies are not stored in local storage. The service worker caches the app shell only and uses `NetworkOnly` for `/api`, `/files`, and `/private`.

The React app runs on a separate server from Frappe:

- `public/config.js` sets `frappeUrl` at runtime, so the same build serves UAT and production.
- Recommended: the React server's Nginx reverse-proxies `/api`, `/files`, and `/private` to Frappe (`deploy/nginx-react-proxy.conf`). The session cookie stays first-party.
- Alternative: direct calls with Frappe `allow_cors` (`deploy/nginx-react-direct.conf`). This only works when both hosts share a registrable domain, because `sid` is `SameSite=Lax`.
- CSRF: the SPA cannot read Desk's boot payload, so it calls `infra_ms.portal.auth.get_csrf_token` after login, keeps the token in memory, and retries once on `CSRFTokenError`.
- Attachment links are prefixed with the Frappe origin through `frappeFileUrl`.

## 11. Route map

- `/login`
- `/dashboard`
- `/pending`
- `/infra/requests`
- `/infra/requests/:id`
- `/infra/requests/:id/property`
- `/infra/requests/:id/queries`
- `/infra/requests/:id/activity`
- `/new-branch`, `/operations`, `/reports`, `/admin` are visible by module and marked as the next delivery.

## 12. Component map

- Shell: `AppLayout`, `AuthLayout`, `ErrorBoundary`, `OfflineBanner`
- Workflow: `WorkflowActions`, `WorkflowTimeline`, `CommentTimeline`
- Queries: `QueryPanel`
- Lists: `DataTable` (table on desktop, cards on mobile)
- Feature pages under `src/features`

## 13. API contract

Frappe wraps the return value in `{ "message": ... }`. Portal methods use:

```json
{ "success": true, "data": {}, "message": "" }
```

Failures set an HTTP status and return `success: false` with `error.code`, `error.message`, and `error.details`. Python tracebacks are logged with `frappe.log_error` and are not returned.

## 14. Phased plan

1. Done in this delivery: login, user context, role dashboard, pending queue, proposed-branch list and detail, property save, timeline, comments, queries, workflow action.
2. Next: MIS / New Branch Details, layout, BOQ, PO, advance payment, BAZ vendor code.
3. Then: LL scope, strong room, tenure, rent, IT, handover, inauguration, reports, and administration screens.

## Differences kept on purpose

| Specification | Code that is already live |
| --- | --- |
| Role label "Corporate Legal Team" | Role value `HO Corporate Legal Team`; state `Assigned to Corporate Legal Team` |
| Product codes HO, HL, PAYSWIFF | Stored values include `Head Office`, `Home Loan`, `Payswiff`, with aliases `HO` and `HL` |
| Approval Manager 1–4 | Older client scripts still use those names. The newer dashboard API already uses Infra Head, Finance Head, Business Head, and HO Corporate Legal Team. The UI maps only the old labels. |
| RIBP property state | Current state is `Assigned to RIBP for Property Details`. An older script also references `Assigned to the Responsible Person`. Both are treated as property-edit stages. |
