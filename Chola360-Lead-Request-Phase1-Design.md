# Chola360 Lead Request — Phase 1 Verification & Implementation Design

**Phase:** 1 — Verification and design only (**Authorized**)  
**Phase 2 — Implementation:** Requires explicit approval  
**Date:** 31 Oct 2026  
**Status:** Stop for review — no DocTypes, workflows, or application code modified  

---

## Source paths (verified)

| Item | Path |
|------|------|
| Frappe project (local copy used) | `/Users/balramsl/Documents/Latest Development/Infra App/infra_ms` |
| Prompt path `/Users/balramsl/Documents/infra_ms` | **Not present** on this machine — use Latest Development path above |
| React SPA (existing frontend) | `/Users/balramsl/Documents/Latest Development/Infra Management App/infra-management-app` |
| SOP PDF (reference) | `/Users/balramsl/Downloads/Branch Launch SOP V3 (1).pdf` (Gold Loans; Chola360 applicability TBD) |
| SOP inside `infra_ms` | **Not present** |

**Restrictions observed:** No bench/Frappe execution, no DB/API connection, no migrations, no implementation.

---

## Report 1 — Project architecture

### Backend (Frappe)

- App: `infra_ms` under `infra_ms/infra_ms/`
- Module: Infra Management System → `infra_management_system/doctype/`
- Portal APIs: `infra_ms/portal/` registered via `portal/registry.py`
- Workflow bridge: `portal/workflow.py`, presentation rules `portal/rules.py`
- Attachments / DMS resolve: `portal/documents.py`, `portal/files.py` (DMS id → GET_File)
- Geo: Proposed Branch `map` / `geo_*`; portal geo helpers in `documents.py`

### Frontend

- Existing **React + Vite** SPA already consumes portal APIs (`src/features/*`, `src/app/router.tsx`).
- Proposed ARBM UI route: `/chola360/leads` (not present yet).
- Do **not** introduce a second frontend framework.
- **Figma mobile screenshots received** (31 Oct 2026) — see **Report 11** below. Visual implementation still waits for Phase 2 approval.

### Named DocTypes (confirmed in source)

| DocType | Folder | Status |
|---------|--------|--------|
| MIS New Branch Initiation | `mis_new_branch_initiation` | Confirmed |
| MIS Product Wise Branch Initiate | `mis_product_wise_branch_initiate` | Confirmed |
| New Branch Details | `new_branch_details` | Confirmed — **preferred branch-opening requirement** |
| Proposed Branch Details | `proposed_branch_details` | Confirmed — replication reference |
| Branch Layout Details | `branch_layout_details` | Confirmed |
| BAZ Vendor Code Creation | `baz_vendor_code_creation` | Confirmed |
| PO Status Confirmation Details | `po_status_confirmation_details` | Confirmed |
| PO Payment Advance Release Details | `po_payment_advance_release_details` | Confirmed |
| Query Log Details | `query_log_details` | Confirmed |
| Infra User Based Role Master | `infra_user_based_role_master` | Confirmed |
| Regional Details | `regional_details` | Confirmed |

### Critical existing artifact — Lead Request stub

| File | Observation |
|------|-------------|
| `.../doctype/lead_request/lead_request.json` | DocType **exists** but has **0 data fields** (only empty Section Break) |
| `lead_request.py` | Empty `Document` subclass |
| `lead_request.js` | Stub commented form handler |
| `autoname` | **None** |
| Permissions | System Manager only (JSON) |

**Implication:** Phase 2 should **extend the existing Lead Request DocType**, not create a duplicate name. No business records assumed (local env must not create DB records).

---

## Report 2 — Proposed Branch Details → Lead Request replication

**Reference JSON:**  
`.../doctype/proposed_branch_details/proposed_branch_details.json` (~162 non-layout fields)

### Replication strategy (proposed)

| Category | Action | Reason |
|----------|--------|--------|
| Location / product / region / zone / area | **Copy + adapt** | Core lead identity; auto-fill from Regional Details |
| Commercial (rent, SD, escalation, lease, …) | **Copy** as optional at Draft | Ann. C / F; not mandatory at create |
| Facilities | **Copy** as optional | Ann. F |
| Property measurements / address / GPS | **Copy** | Ann. A/F; map/geo fields |
| Owner child (`owner_details` → NBO Owner Details) | **Reuse child DocType** via Table | Landlord pack |
| Premise / KYC / photo attachments | **Reuse** Document Upload / KYC / Branch Related Document Upload children | DMS path already shared |
| RLM / AM1–AM4 / tenure query tables | **Defer / omit from Lead** initially | Downstream approval belongs to Proposed Branch lifecycle |
| Strong-room / door / UTR / LOI legal tables | **Optional / product-gated later** | Many GL-specific; not mandatory at ARBM create |
| `request_no_new` Link to New Branch Details | **Adapt** as `branch_opening_requirement` (Link → New Branch Details) | Competition grouping |
| Naming (`autoname` method) | **Do not reuse** PBD/NBD naming | New `LEAD/{PL}/{REGION}/{####}` |
| Workflow states of Proposed Branch | **Do not copy wholesale** | Lead needs short lifecycle first (business approval) |

### Illustrative field mapping (not exhaustive)

| Existing PBD field | Type | Lead Request field | Action | Reason |
|--------------------|------|--------------------|--------|--------|
| `initiated_by` | Small Text | `initiated_by` | Copy; server-set RO | Authenticated user email |
| `initiated_date` | Date | `initiated_date` | Copy; server-set | Server date |
| `product_line_new` | Data | `product_line` | Adapt Select + validate master | Naming + access |
| `region_new` | Data | `region` | Auto from Regional Details | Access filter |
| `zone_new` | Data | `zone` | Auto from `fk_zoneid` | Org mapping |
| `area_new` | Data | `area` | Auto if available | Org mapping |
| `location_details_new` | Data | `location_details` | User / master | Branch location label |
| `map` / `geo_latitude` / `geo_longitude` / `geo_location` | Geo/Data | Same | Copy | GPS |
| `complete_address_of_the_property` | Small Text | Same | Copy | Property address |
| `carpet_area_sqft` / `built_up_area_sqft` | Small Text | Same | Copy optional | Measurements |
| `monthly_rent` / `rent_per_sq_feet` / `security_deposit_amount` / `maintenance` / `lock_in_period` / `lease_period` / `rent_escalation` | Small Text | Same | Copy optional | Commercial |
| `owner_details` | Table → NBO Owner Details | Same | Reuse child | Landlord |
| `premise_related_document` | Table → Document Upload | Same | Reuse child | Docs |
| `kyc_related_documents` | Table → KYC Document Upload | Same | Reuse child | KYC |
| `request_no_new` | Link → New Branch Details | `branch_opening_requirement` | **New semantic name** | Competition scope |
| — | — | `regional_details` | **New** Link → Regional Details | Provenance of org auto-fill |
| — | — | `region_code` | **New** Data (canonical id) | Prefer stable code for naming |
| — | — | `arbm_email` | **New** Data RO | Session user |
| AM/RLM/strong-room/UTR/LOI heavy tables | various | Omit or later stage | Defer | Not ARBM create |

Full 162-field spreadsheet can be generated in Phase 2 from JSON diff once field ownership (Report 8) is approved.

---

## Report 3 — Regional Details mapping

**JSON:** `.../doctype/regional_details/regional_details.json`  
**Autoname:** `format:{region}-{product_line}` (so document name embeds region + product line)

### Actual ARBM email field (critical correction)

| Prompt fieldname | Actual fieldname in source | Status |
|------------------|----------------------------|--------|
| `area_regional_business_manager_details_email_id` | **`area_regional_business_manager_email_id`** | **Mismatch — use actual** |
| — | `area_regional_business_manager` (name) | Confirmed |

Backend filter **must** be:

`area_regional_business_manager_email_id = frappe.session.user`

(with `is_active` / `is_delete` filters once policy approved).

### Mapping table

| Regional Details field | Lead Request field | Auto-populated | Read-only | Validation |
|------------------------|--------------------|----------------|-----------|------------|
| `region` | `region` (+ naming token) | Yes | Yes (after create) | Must match authorized row |
| *(no separate region_code field found)* | `region_code` | Derive from `region` sanitized / or Regional Details `name` | Yes | Canonical identifier for naming; **Requires business clarification** if a dedicated code is needed |
| `fk_zoneid` | `zone` | Yes | Yes | Select East/West/North/South |
| `product_line` | `product_line` | Yes (must include Chola360 when configured) | Yes | Against master / Select |
| `area_regional_business_manager_email_id` | `arbm_email` / `initiated_by` | Yes = `frappe.session.user` | Yes | Session only |
| `area_regional_business_manager` | display name field (optional) | Yes | Yes | Informational |
| `region_head` / `region_head_emailid` | RBM fields if mapped as RBM | Optional | Yes | Confirm label vs RBM/ZBM |
| `zonal_infra_business_partner` / `_email_id` | ZIBP display (not ZBM) | Optional | Yes | Prompt’s ZBM ≠ this field — clarify |
| `is_active` | filter only | — | — | Exclude inactive if approved |
| `is_delete` | filter only | — | — | Exclude deleted if approved |

**Product line gap:** Regional Details Select options today: `VF|LAP|HL|HO|CSEL|SBPL|SME|CSEC|GL` — **Chola360 / Payswiff not in this Select**. Adding Chola360 requires approved master/Select change (Phase 2).

**Area:** No dedicated `area` field on Regional Details JSON — Area may come from New Branch Details / other masters. Auto-fill of `area` **Requires business clarification**.

---

## Report 4 — Lead Request naming design

### Required pattern

`LEAD/{product_line}/{region}/{####}`

Example: `LEAD/CHOLA360/CHENNAI/0001`

### Design (proposed)

| Rule | Design |
|------|--------|
| Product Line source | Validated `product_line` on Lead (from Regional Details + Product Line Master) |
| Region identifier source | Prefer sanitized canonical token from Regional Details `region` (or future `region_code`); **never free-text arbitrary** |
| Sequence scope | Unique key = `(product_line, region_code)` — **not** by year/month |
| Generator | Frappe backend `autoname`; use `frappe.model.naming.getseries` / naming series prefix per PL+Region, or a dedicated Series helper DocType |
| Concurrency | Must use Frappe series locking — **do not** copy New Branch Details pattern `frappe.db.count(...) + 1` (race-prone) |
| Immutability | `name` set once; no user edit; rename forbidden |
| Deleted numbers | Do not reuse (series continues) |
| Overflow >9999 | Propose extension to 5+ digits keeping prefix pattern; **approve before implement** |
| Region rename | Historical Lead names unchanged; new leads use current canonical code |

### Anti-patterns to avoid

- Client-side MAX/count for next number  
- Unsanitized region with spaces/slashes in `name`  
- Sharing Proposed Branch / NBI naming helpers  

---

## Report 5 — Workflow proposal (Lead Request)

**Do not finalize intermediate states without business approval.**

### Minimal proposed lifecycle (for approval)

| State | Meaning | Who |
|-------|---------|-----|
| Draft | ARBM creating / editing property pack | ARBM |
| In Progress | Submitted for infra/technical path (details TBD) | ARBM → RIBP/others TBD |
| Completed | Selected property for the branch-opening requirement | Authorized completer |
| Rejected | Manually or auto-rejected | System / authorized user |
| Cancelled (optional) | Abandoned without competitor win | Authorized user |

### Automatic rejection behavior

On successful transition of Lead L → **Completed**:

1. Validate role + record-level auth + `branch_opening_requirement`.  
2. Serialize competing completions (DB lock / single-flight).  
3. Abort if another lead under same requirement already Completed.  
4. Complete L.  
5. Find siblings: same `branch_opening_requirement`, state ∉ {Completed, Rejected, Cancelled}, name ≠ L.  
6. Apply **workflow** rejection transition (prefer `apply_workflow`), not raw SQL state writes.  
7. Comment each:  
   `Automatically rejected because Lead Request {L} was successfully completed for the same branch-opening requirement.`  
8. Audit via existing workflow comment pattern (see Proposed Branch `WORKFLOW_COMMENT_META_*` in `proposed_branch_details.py`).  
9. Atomic commit / rollback on failure.  
10. Block new competing leads once requirement has a Completed lead.

**Precedent in source:** `RELATED_REJECTION_CONFIG` in `proposed_branch_details.py` cascades rejection to Layout/PO/BAZ — pattern to mirror for Lead siblings (different DocType, same idea).

**Client-side rejection:** Forbidden.

---

## Report 6 — Multiple lead ↔ branch-opening requirement

### Preferred existing DocType

**New Branch Details** is the verified branch-opening requirement:

- Autoname `NBI/{date}/{product}-{location}/{n}`  
- On workflow state `Submit`, creates **Proposed Branch Details** and consumes MIS quota (`new_branch_details.py`)  
- Link today: Proposed Branch.`request_no_new` → New Branch Details  

### Proposed relationship

```
New Branch Details (branch opening requirement)
    └── Lead Request (many) via branch_opening_requirement
            └── (later) may promote/link to Proposed Branch Details when selected
```

| Concern | Design |
|---------|--------|
| Naming sequence | Per Product Line + Region (global for that pair) |
| Competition / auto-reject | Per **New Branch Details** (requirement), not per region alone |
| Multiple Chola360 branches over years in same region | Separate New Branch Details rows → separate competition sets |
| After one Lead Completed | No new leads for that requirement; new requirement can open new leads |
| Historical after ARBM reassignment | Show only if policy allows; default: creator/region auth — **Requires business clarification** |

**Do not** create a new branch-opening DocType if New Branch Details is accepted.

**Do not** auto-create Proposed Branch on every Lead create (would break MIS quota / existing flow). Promotion path needs Phase 2 business approval.

---

## Report 7 — SOP gap analysis (Lead-relevant)

| SOP requirement | Existing DocType | Existing field | Missing for Lead | Chola360 applicability |
|-----------------|------------------|----------------|------------------|------------------------|
| Ann. A 17-pt shortlisting | PBD partial fields | signage, floor, parking, area… | Checklist structure; pillars; flood; adjacencies; ceiling; manholes; cracks | Common + confirm |
| Ann. B 9-pt + Vaastu | PBD partial | earth, carpet… | Vaastu 4-pt; video; sketch; mobile/broadband | Vaastu/SR often **GL-specific** |
| Ann. C 13-pt commercial | PBD strong | rent/SD/lease… | Enforced checklist; SR load cert | Common + GL SR |
| Ann. E documents | Attach children | premise/KYC/LOI | Typed Select options empty in JSON; fallback protocol | Common |
| Ann. F portal fields | PBD / NBO Owner | Most commercial/facilities/owner | Area on Regional Details; Chola360 product | Common |
| Ann. G readiness 44 | — | — | Entire readiness module | Mostly post-lead / GL-heavy |
| Ann. H SD 50/25/25 | PBD SD dates | amount/dates | Staged SR gates | **GL-specific** — not inside Lead create |
| §5 TAT 105 vs Day 106 | TAT reports | day counters | Lead milestones contribution | Flag only |

Lead create must **not** mandatorily collect Ann. G construction/readiness or Ann. H payments.

---

## Report 8 — ARBM field ownership (proposed)

### ARBM editable (Draft / early In Progress)

- Property address, shop, floor, pin, boundaries  
- Measurements (carpet/built-up)  
- Commercial negotiation fields (optional until required by stage)  
- Facilities checklists (optional)  
- Owner child rows + KYC/premise attachments  
- Map / lat / lng / photos  
- Location details (within authorized region)  
- Shortlisting checklist answers (once fields approved)  

### Server-owned / read-only

- `name` (Lead ID)  
- `initiated_by`, `initiated_date`, `arbm_email`  
- `product_line`, `region`, `region_code`, `zone`, `regional_details`  
- `branch_opening_requirement` once locked (policy TBD)  
- Workflow state (via actions only)  

### Reserved for later roles (RIBP / Legal / Finance / etc.)

- Full technical Vaastu pack  
- Legal LOI/lease execution packs (as today on PBD)  
- Strong-room construction evidence  
- SD/UTR payment confirmation  
- Layout/BOQ/PO  
- Readiness audit  

Exact stage gates require workflow approval (Report 5).

---

## Report 9 — API and security matrix

### Reuse (portal)

| Capability | Existing | Notes |
|------------|----------|-------|
| Current user / session | `portal/auth.py` | Use `frappe.session.user` only |
| Attach upload | `portal/documents.upload_document_attachment` | Extend allow-list for Lead Request |
| DMS preview/download URL | `portal/files.py` | Reuse |
| Geo save rules | `documents.py` GEO_* | Reuse for Lead map fields |
| Workflow execute / history | `portal/workflow.py` | Register Lead Request when workflow exists |
| Region access patterns | `portal/common.py` geography helpers | Extend for ARBM email filter |

### New / extend (proposed)

| API capability | Purpose | Security |
|----------------|---------|----------|
| ARBM regions list | Regional Details where ARBM email = session user | Backend filter; active only |
| Region defaults | Populate zone/product/region/heads | No client override of region id |
| Lead list | Filter by authorized regions + ownership policy | Record-level |
| Lead get | Single lead | Record-level |
| Lead create | Autoname + org lock + requirement link | Role ARBM; region auth |
| Lead update | Permitted fields by state | Field-level |
| Lead complete | Complete + auto-reject siblings | Role + lock + transaction |
| Lead history | Workflow/audit | Authz |

**React SPA** should call these via existing API client — no guest access, no trusting browser-supplied email for ACL.

Registry: add Lead Request entry in `portal/registry.py` after DocType+workflow ready.

---

## Report 10 — Implementation plan (Phase 2 — not started)

### Backend files (expected)

| File | Change | Impact |
|------|--------|--------|
| `doctype/lead_request/lead_request.json` | Add fields/children/permissions (extend stub) | New DocType surface only |
| `doctype/lead_request/lead_request.py` | `autoname`, validate org/session, complete+reject | New logic; mirror rejection patterns carefully |
| `doctype/lead_request/lead_request.js` | Desk helpers if needed | Desk only |
| New Workflow (site) | Lead states/transitions | **Site config** — export into repo if policy allows |
| `portal/lead_request.py` (new) | List/create/update/complete/regions | New module |
| `portal/registry.py` | Register Lead Request | Portal routing |
| `portal/documents.py` | Allow Lead Request attach fields | Shared upload |
| `hooks.py` | Only if doc_events required | Minimal |
| Regional Details / Product Line Select | Add **Chola360** | Touches masters — **approval required** |
| Role | Ensure “Area Regional Business Manager” exists + permissions | Role mapping approval |

**Do not** modify Proposed Branch / GL workflows except optional later “promote lead → PBD” under separate approval.

### Frontend files (React SPA)

| File | Change |
|------|--------|
| `src/app/router.tsx` | Route `/chola360/leads` (+ detail/create) |
| `src/features/leads/*` (new) | Dashboard, empty, no-region, region select, form, detail |
| API client modules | Lead + ARBM region endpoints |
| Nav / role gates | Show only for ARBM |

**UI:** Wait for Figma screenshots before visual finalization.

### Explicit non-goals (Phase 2 unless approved)

- Implementing Ann. G readiness inside Lead  
- Ann. H payment engine inside Lead  
- Replacing Proposed Branch  
- Connecting to UAT/prod from local copy  
- Creating DB records locally  

### Open decisions blocking Phase 2

1. Confirm **New Branch Details** as `branch_opening_requirement`.  
2. Confirm ARBM filter field = `area_regional_business_manager_email_id` (not prompt’s `..._details_email_id`).  
3. Canonical **region code** for naming (Data `region` vs Regional Details `name` vs new field).  
4. Add **Chola360** to product_line Selects / masters.  
5. Approve minimal Lead workflow states.  
6. Overflow rule for sequence >9999.  
7. Historical lead visibility after ARBM reassignment.  
8. Whether Completed Lead auto-creates/links Proposed Branch.  
9. Place SOP PDF inside project docs.  
10. Figma screenshots before UI build.

---

## Summary — Phase 1 conclusions

1. **Lead Request DocType already exists as an empty stub** — extend it; don’t create a second DocType with the same name.  
2. **Regional access field in source** is `area_regional_business_manager_email_id` (prompt name differs).  
3. **React SPA** is the correct UI host for `/chola360/leads`.  
4. **New Branch Details** is the best existing branch-opening requirement for multi-lead competition.  
5. **Naming** must be server-side series-safe — do not copy NBD `count+1`.  
6. **Auto-reject competitors** should follow audited workflow transitions; pattern exists in PBD `RELATED_REJECTION_CONFIG`.  
7. **Chola360** is not yet a configured product line in Regional Details / NBD Selects.  
8. **SOP V3** remains GL reference; Lead create should stay light; GL-only items flagged.  
9. **No Phase 2 work started.**

---

## Report 11 — Figma mobile UI alignment (screenshots received)

**Assets copied to:** `docs/figma-lead-management/`  
**Branding in mockups:** “Chola GOLD LOAN” header — for Chola360 build, brand token must switch to Chola360 (confirm with design).  
**Phase:** Still design-only — no UI code written from these screens.

### 11.1 Screen inventory

| # | Figma screen | Purpose | Proposed React route (draft) |
|---|--------------|---------|------------------------------|
| 1 | Empty state — “Create your first Property Lead” | No leads | `/chola360/leads` (empty) |
| 2 | Dashboard — Total / Re-work / Rejected / Approved + Leads by Branch | Home metrics | `/chola360/leads` |
| 3–4 | Lead list cards (Approved / Awaiting / Rejected / Re-Work) | Pipeline list | `/chola360/leads` + filters |
| 5 | Filter sheet — Branch, Status, Approved On, Submitted On | List filters | same |
| 6 | Create Property Lead — Branch Location, Main Entrance Direction, map pin | Create step 1 | `/chola360/leads/new` |
| 7 | Site Image Capture — Interior 1–3, Exterior 1–12 | Photo pack | `/chola360/leads/:id/images` |
| 8 | Site Verification hub — 5 modules Pending | Section navigator | `/chola360/leads/:id` |
| 9 | Property Documents (Property / KYC tabs) | Doc checklist | `/chola360/leads/:id/documents` |
| 10 | KYC by owner (multi-owner) | Per-landlord KYC | same |
| 11 | LOI Generation & Consent + Send OTP | LOI + landlord OTP | `/chola360/leads/:id/loi` |
| 12 | Awaiting Approval — pending RIM review | Post-submit wait | `/chola360/leads/:id` |
| 13–14 | Approval Queue stepper (8 stages; Rent Negotiation expand) | Long-running track | `/chola360/leads/:id/queue` |

### 11.2 Status model — Figma vs prior Phase 1 proposal

| Figma status | Shown metadata | Prior Phase 1 proposal | Alignment action (needs approval) |
|--------------|----------------|------------------------|-----------------------------------|
| Approved | Submitted On, Approved On, Approved By | Completed | Map Figma **Approved** ↔ backend Completed (or rename) |
| Awaiting Approval | Submitted On, Approver, empty Approved On | In Progress | Split In Progress into Submitted / Awaiting |
| Rejected | Submitted On, Rejected On, Rejected By | Rejected | Align |
| Re-Work | Checklist x of y, Re-work date, Request By, Comment | *(not in minimal 4-state model)* | **Add Re-Work** as first-class state |
| Draft *(implied before submit)* | — | Draft | Keep |

**Implication:** Minimal 4-state Lead workflow is **insufficient** for the Figma. Propose revised Lead-facing states for approval:

`Draft → Submitted / Awaiting Approval → Re-Work → Approved | Rejected`

(Auto-reject competitors still fires when one reaches **Approved/Completed**.)

### 11.3 Site Verification modules (checklist 3 of 5)

| Module (Figma) | Subtext | Source reuse | Gap |
|----------------|---------|--------------|-----|
| Property Details | Address, Location & Space | PBD address/geo/area fields | `Main Entrance Direction` **Not found** as dedicated field |
| Owner Details | Landlord contact & Legal | `owner_details` → NBO Owner Details | Multi-owner KYC UI needed |
| Facility Details | Amenities, utilities | PBD facilities block | — |
| Documents | PAN, GST, MSME & Property Docs | Document Upload / KYC children | Typed checklist UI; Select options empty in JSON |
| LOI Generation & Consent | Generate LOI & capture consent | LOI print format + attach tables | **OTP consent flow Not found in source** |

Dashboard “Checklist 3 of 5” = count of completed modules above.

### 11.4 Site Image Capture

| Figma requirement | Source | Gap |
|-------------------|--------|-----|
| Interior 1–3 + Exterior 1–12 (15 slots) | Generic Attach / document tables | **Typed photo slots Not found** — need child table or fixed Attach fields |
| Upload / Proceed | `portal/documents.upload_document_attachment` | Reuse DMS path |
| GPS on photos | `map` / `geo_*` exist separately | EXIF binding TBD |

### 11.5 Documents (Property + KYC)

| Figma document | Ann. E / SOP | Existing artifact | Gap |
|----------------|--------------|-------------------|-----|
| Title Deed | Title document | Document Upload (type TBD) | Typed enum + UI status Uploaded/View |
| Building Approval Plan | Sanctioned plan | same | same |
| Property Tax | Tax receipt | same | same |
| EB Bill | Commercial electricity | same | same |
| Commercial Utilization | Related to commercial use proof | Partially / unclear | Confirm vs EB |
| Legal Opinion | EC / title search adjacent | **Not found** as typed doc | New type |
| Authorization Letter | — | **Not found** | New type / POA adjacent |
| PAN (per owner, “2 Owners”) | Landlord PAN | NBO + KYC; multi-owner child | Per-owner attach UI |
| GST / MSME | Conditional | `gst_*` / `msme_*` + KYC | Certificates |
| Bank Statement | Bank details | **Attach type unclear** | Add typed KYC doc |

### 11.6 LOI + OTP consent

| Figma | Source | Gap |
|-------|--------|-----|
| Draft LOI preview/download | Print format `LOI format for Branch` | Can reuse generation; Lead-specific print TBD |
| Landlord LOI Consent Pending | LOI upload + signed dates on PBD | Consent **status** model missing on Lead |
| Send OTP / 6-digit verify / Resend timer | — | **OTP consent Not found** — new capability; security review required before Phase 2 |

### 11.7 Approval Queue (8 stages) vs existing Proposed Branch workflow

Figma stages: Property Verification → Rent Negotiation → Legal Clearance → Vaastu Clearance → Design Clearance → LL Agreement & Scope → Infra Readiness → Branch Readiness.

| Figma stage | Closest existing track | Lead vs PBD boundary |
|-------------|------------------------|----------------------|
| Property Verification | RIBP property details + docs | Lead + early RIM/RIBP |
| Rent Negotiation | Commercial fields + queries | Lead / PBD |
| Legal Clearance | Corporate Legal / HO Legal states | Primarily **Proposed Branch** |
| Vaastu Clearance | Not a dedicated Lead field pack | Confirm Chola360 need; often GL |
| Design Clearance | Branch Layout Details | Downstream — not ARBM Lead create |
| LL Agreement & Scope | LOI/LL + work scope | Downstream / LOI step on Lead then PBD |
| Infra Readiness / Branch Readiness | Ann. G; interior/IT/CCTV states | Downstream |

**Design recommendation:** Lead UI covers create → images → 5-module verification → LOI/OTP → submit to RIM.  
The **8-stage Approval Queue** is largely the existing **Proposed Branch + Layout + readiness** lifecycle after a lead is Approved/selected. Do not rebuild all 8 stages inside Lead Request unless business explicitly merges them.

### 11.8 Naming conflict — Figma Property ID vs Lead ID

| Figma | Example | Phase 1 naming rule |
|-------|---------|---------------------|
| Property ID on cards | `PRCH-1003` | Differs from required `LEAD/{product_line}/{region}/{####}` |

**Requires business clarification:** Display alias (`PRCH-…`) vs immutable document name (`LEAD/CHOLA360/CHENNAI/0001`), or change Figma ID pattern to LEAD format.

### 11.9 Filters & “Leads by Branch”

- Filter dimensions: Branch, Status, Approved On, Submitted On.  
- “Branch” in Figma (Ekkatuthangal, Tharamani, …) maps to **location / branch-opening requirement**, not Regional Details region alone.  
- Align list grouping with `branch_opening_requirement` (New Branch Details) + `location_details`.

### 11.10 Role labels in Figma

| Figma | Existing system | Note |
|-------|-----------------|------|
| RIM | Closest: Regional Infra Business Partner (RIBP) | Naming differs from SOP “RIM” |
| NBM | Closest: ZIBP / Business / proposal states | Confirm mapping |
| Approver names on cards | Workflow comment / owner | Needs history API |

### 11.11 Revised open decisions (UI-driven)

Add to Phase 2 blockers:

11. Approve **Re-Work** + **Awaiting Approval** states (not only Draft/In Progress/Completed/Rejected).  
12. Approve **15 typed site photo slots** (3 interior + 12 exterior).  
13. Approve **Main Entrance Direction** field addition.  
14. Approve **OTP landlord consent** scope (SMS/email provider, storage, audit).  
15. Resolve **PRCH-** display ID vs **LEAD/…** document name.  
16. Confirm Lead ends at “Submitted to RIM” vs embedding full 8-stage queue on Lead.  
17. Chola360 vs Gold Loan branding on header.  
18. Document type enum for Property + KYC lists (Title Deed … Bank Statement).

---

## Stop for approval

Please approve:

- Field ownership & Regional Details mapping corrections  
- Naming + overflow rule (**and PRCH vs LEAD ID**)  
- Workflow state list (**including Re-Work / Awaiting Approval from Figma**)  
- New Branch Details as competition parent  
- Chola360 product-line addition  
- Figma Report 11 decisions (photos, OTP, Lead vs full Approval Queue boundary)  
- Then authorize **Phase 2 implementation**
