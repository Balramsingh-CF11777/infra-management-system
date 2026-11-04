# Snippet appended into infra_ms.portal.lead_request — do not import from the SPA.


@frappe.whitelist()
def get_rib_pipeline_overview():
	"""RIBP Pipeline Overview: stage bucket counts + assigned tasks for the current user."""
	try:
		user = require_login()
	except frappe.AuthenticationError:
		return fail("UNAUTHENTICATED", _("Please log in to continue."), 401)

	from .common import PROPOSED_BRANCH

	filters = _lead_scope_filters(user)
	leads = frappe.get_all(
		DOCTYPE,
		filters=filters,
		fields=[
			"name",
			"property_id",
			"location_details",
			"area",
			"region",
			"workflow_state",
			"open_tasks",
			"regional_infra_business_partner",
			"proposed_branch",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=2000,
	)

	milestone_by_parent = {}
	if leads and frappe.db.exists("DocType", "Lead Request Milestone"):
		parent_names = [row.name for row in leads]
		for chunk_start in range(0, len(parent_names), 500):
			chunk = parent_names[chunk_start : chunk_start + 500]
			for row in frappe.get_all(
				"Lead Request Milestone",
				filters={"parent": ["in", chunk], "parenttype": DOCTYPE},
				fields=["parent", "milestone", "status"],
				limit_page_length=5000,
			):
				milestone_by_parent.setdefault(row.parent, {})[(row.milestone or "").strip()] = (
					row.status or "Pending"
				).strip()

	lead_creation = 0
	site_verification = 0
	for row in leads:
		wf = (row.workflow_state or "Draft").strip()
		if wf == "Rejected":
			continue
		site_status = (milestone_by_parent.get(row.name) or {}).get("Site Verification") or "Pending"
		open_task = (row.open_tasks or "").strip()
		if wf in ("Draft", "Awaiting Approval", "Re-Work", "On Hold") and site_status != "Completed":
			lead_creation += 1
		if open_task == "Site Verification" or site_status in ("In Progress", "Submitted", "Re-Work"):
			site_verification += 1
		elif wf == "Approved" and site_status != "Completed":
			site_verification += 1

	design_states = (
		"Assigned to RLM",
		"Assigned to RIBP for RLM Approval",
	)
	cad_states = (
		"Awaiting for the BOQ Submission",
		"Assigned to HO Infra Legal Team on Document Verification",
	)
	ll_states = (
		"Assigned to RIBP for LL Agreement",
		"Assigned to HO Infra Legal Team on Security Deposit",
		"Assigned to HO Infra Legal Team on Advance Issued Date",
		"Assigned to HO Infra Legal Team on UTR & Payment Date",
		"Assigned to RIBP on LL Scope Start Date",
		"Assigned to RIBP on LL Scope Completion and Tenure Start Date",
		"Assigned to ZIBP on LL Scope Completion and Tenure Start Date Confirmation",
		"Assigned to HO Legal Team on Rental Start Date Confirmation",
	)
	infra_states = (
		"Assigned to RIBP on Strong Room Work Completion Status",
		"Assigned to RIBP on Strong Room Door Completion Status",
		"Assigned to RIBP on IT Start Date",
		"Assigned to RIBP on IT Completion Date & TAT",
		"Assigned to RIBP on Branch Handover Confirmation",
		"Assigned to Business Team for the Branch Inauguration",
	)

	pbd_filters = {}
	emails = list(_user_emails(user))
	roles = set(session_roles(user))
	if not (is_admin(user, roles) or "System Manager" in roles or "HO Infra Branch Admin" in roles):
		if emails and frappe.get_meta(PROPOSED_BRANCH).has_field("responsible_person"):
			pbd_filters["responsible_person"] = ["in", emails]

	def _count_pbd(states):
		filters_local = dict(pbd_filters)
		filters_local["workflow_state"] = ["in", list(states)]
		try:
			return frappe.db.count(PROPOSED_BRANCH, filters_local)
		except Exception:
			return 0

	design_sketch = _count_pbd(design_states)
	cad_consent = _count_pbd(cad_states)
	ll_agreement = _count_pbd(ll_states)
	infra_readiness = _count_pbd(infra_states)

	assigned = []
	for row in leads:
		wf = (row.workflow_state or "Draft").strip()
		if wf == "Rejected":
			continue
		task = (row.open_tasks or "").strip() or "Site Verification"
		site_status = (milestone_by_parent.get(row.name) or {}).get("Site Verification") or "Pending"
		include = task in (
			"Site Verification",
			"Property Verification",
			"Rent Negotiation",
			"Legal Clearance",
		) or (site_status != "Completed" and wf in ("Draft", "Awaiting Approval", "Re-Work", "On Hold", "Approved"))
		if not include:
			continue
		assigned.append(
			{
				"id": row.name,
				"doctype": DOCTYPE,
				"property_id": row.property_id or row.name,
				"location": row.location_details or row.area or "",
				"task": task if task and task != "Rejected" else "Site Verification",
				"workflow_state": wf,
				"href": "/chola360/leads/{0}/approval".format(row.name),
			}
		)
		if len(assigned) >= 25:
			break

	rib_pbd_states = (
		"Assigned to RIBP for Property Details",
		"Assigned to RIBP for RLM Approval",
		"Assigned to RIBP for LL Agreement",
		"Assigned to RIBP on LL Scope Start Date",
		"Assigned to RIBP on Strong Room Work Completion Status",
		"Assigned to RIBP on Strong Room Door Completion Status",
		"Assigned to RIBP on LL Scope Completion and Tenure Start Date",
		"Assigned to RIBP on IT Start Date",
		"Assigned to RIBP on IT Completion Date & TAT",
		"Assigned to RIBP on Branch Handover Confirmation",
	)
	try:
		pbd_task_filters = dict(pbd_filters)
		pbd_task_filters["workflow_state"] = ["in", list(rib_pbd_states)]
		pbd_rows = frappe.get_all(
			PROPOSED_BRANCH,
			filters=pbd_task_filters,
			fields=["name", "workflow_state", "request_no_new", "location_details", "region", "area", "modified"],
			order_by="modified desc",
			limit_page_length=25,
		)
	except Exception:
		pbd_rows = []

	for row in pbd_rows:
		if len(assigned) >= 40:
			break
		assigned.append(
			{
				"id": row.name,
				"doctype": PROPOSED_BRANCH,
				"property_id": row.request_no_new or row.name,
				"location": row.location_details or row.area or row.region or "",
				"task": row.workflow_state or "Assigned task",
				"workflow_state": row.workflow_state or "",
				"href": "/infra/requests/{0}".format(row.name),
			}
		)

	buckets = [
		{"id": "lead_creation", "label": "Lead Creation", "count": lead_creation},
		{"id": "site_verification", "label": "Site Verification", "count": site_verification},
		{"id": "design_sketch", "label": "Design Sketch", "count": design_sketch},
		{"id": "cad_consent", "label": "CAD Consent", "count": cad_consent},
		{"id": "ll_agreement", "label": "LL Agreement", "count": ll_agreement},
		{"id": "infra_readiness", "label": "Infra Readiness", "count": infra_readiness},
	]

	return ok({"buckets": buckets, "assigned_tasks": assigned[:40]})
