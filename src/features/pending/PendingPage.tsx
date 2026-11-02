import { useQuery } from "@tanstack/react-query";
import { getMyPendingActions } from "@/api/dashboard";
import { queryKeys } from "@/api/keys";
import { listLeads } from "@/api/leads";
import { DataTable, StateCell, TableFooter } from "@/components/tables/DataTable";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { LEAD_REQUEST, documentPath } from "@/lib/documentPath";
import { agingLabel, formatWhen } from "@/lib/format";
import { useSession } from "@/stores/session";
import { ApiError, type PendingItem, type UserContext } from "@/types/api";
import type { LeadSummary } from "@/features/leads/types";

function matchesWorkingRole(item: PendingItem, activeRole: string) {
  if (!activeRole || activeRole === "System Manager") return true;
  const label = (item.role_label || item.role || "").trim();
  if (!label) return true;
  return label === activeRole;
}

const MY_LEAD_STATES = new Set(["draft", "awaiting approval", "pending for approval", "pending approval"]);

function isMyDraftOrApprovalLead(lead: LeadSummary) {
  return MY_LEAD_STATES.has((lead.workflow_state || "").trim().toLowerCase());
}

function samePerson(value: string | undefined, user: UserContext) {
  const text = (value || "").trim().toLowerCase();
  if (!text) return false;
  const keys = [user.user, user.full_name].map((item) => item.trim().toLowerCase()).filter(Boolean);
  return keys.includes(text);
}

/** Keep leads this user created. If the list has no creator field, the portal list is already theirs. */
function createdByUser(lead: LeadSummary, user: UserContext | null) {
  if (!user) return false;
  const creators = [lead.owner, lead.initiated_by, lead.arbm_email, lead.area_regional_business_manager];
  const present = creators.filter((value) => (value || "").trim());
  if (present.length === 0) return true;
  return present.some((value) => samePerson(value, user));
}

function leadTask(lead: LeadSummary): PendingItem {
  return {
    module: "leads",
    doctype: LEAD_REQUEST,
    name: lead.name,
    branch: lead.location_details,
    product_line: lead.product_line,
    zone: lead.zone,
    region: lead.region,
    workflow_state: lead.workflow_state,
    workflow_state_label: lead.workflow_state,
    role: "",
    role_label: "",
    pending_since: lead.submitted_on || lead.creation || lead.initiated_date,
    request_id: lead.name,
    property_id: lead.property_id,
  };
}

async function listMyOpenLeads() {
  const [drafts, awaiting] = await Promise.all([
    listLeads({ workflow_state: "Draft" }),
    listLeads({ workflow_state: "Awaiting Approval" }),
  ]);
  const byName = new Map<string, LeadSummary>();
  for (const row of [...drafts, ...awaiting]) {
    if (isMyDraftOrApprovalLead(row)) byName.set(row.name, row);
  }
  return [...byName.values()];
}

export function PendingPage() {
  const activeRole = useSession((state) => state.activeRole);
  const sessionUser = useSession((state) => state.user);
  const readOnly = sessionUser?.api_mode === "compat";
  const pending = useQuery({ queryKey: queryKeys.pending, queryFn: getMyPendingActions });
  const leads = useQuery({ queryKey: queryKeys.leadList({ scope: "my-draft-and-approval" }), queryFn: listMyOpenLeads });
  const workflowItems = pending.data?.items ?? [];
  const scoped = workflowItems.filter((item) => matchesWorkingRole(item, activeRole));
  const workflowRows = scoped.length > 0 ? scoped : workflowItems;
  const seen = new Set(workflowRows.map((item) => `${item.doctype}:${item.name}`));
  const leadRows = (leads.data ?? [])
    .filter((lead) => createdByUser(lead, sessionUser))
    .map(leadTask)
    .filter((item) => {
      const key = `${item.doctype}:${item.name}`;
      if (seen.has(key) || seen.has(`${item.doctype}:${item.property_id}`)) return false;
      seen.add(key);
      return true;
    });
  const rows = [...leadRows, ...workflowRows];
  if (pending.isLoading || (leads.isLoading && rows.length === 0)) return <SkeletonBlock className="h-64" />;
  if (pending.isError && rows.length === 0) {
    return (
      <EmptyState
        title="Pending tasks unavailable"
        body={pending.error instanceof ApiError ? pending.error.message : "The task list could not be loaded."}
      />
    );
  }
  return (
    <section>
      <Breadcrumb current="My Tasks" />
      <div className="ims-card overflow-hidden">
        <CardHeader
          title="My Tasks"
          subtitle={
            readOnly
              ? "Read-only list from the existing Infra Management role queues. Opening a request here needs the portal API on the Frappe site."
              : "Draft and awaiting-approval leads you created."
          }
        />
        <DataTable<PendingItem>
          rows={rows}
          emptyTitle="No leads waiting"
          emptyBody="Draft and awaiting-approval leads you created will appear here."
          href={(row) => (readOnly ? "/pending" : documentPath(row.doctype, row.name))}
          columns={[
            {
              key: "request_id",
              header: "Request ID",
              render: (row) => row.request_id || row.name || "—",
            },
            {
              key: "property_id",
              header: "Property ID",
              render: (row) => row.property_id || "—",
            },
            {
              key: "location",
              header: "Location",
              render: (row) => (
                <span className="block leading-tight">
                  <span className="block font-semibold text-ims-primary">{[row.zone, row.region].filter(Boolean).join(" - ") || "—"}</span>
                  <span className="text-xs text-slate-500">{row.branch || ""}</span>
                </span>
              ),
            },
            { key: "since", header: "Date In Queue", render: (row) => formatWhen(row.pending_since) },
            { key: "aging", header: "Aging", render: (row) => agingLabel(row.pending_since) || "—" },
            { key: "state", header: "Status", badge: true, render: (row) => <StateCell label={row.workflow_state_label} /> },
            { key: "task", header: "Task", render: (row) => row.role_label || row.product_line || "—" },
          ]}
        />
        {rows.length > 0 && <TableFooter from={1} to={rows.length} total={rows.length} />}
      </div>
    </section>
  );
}
