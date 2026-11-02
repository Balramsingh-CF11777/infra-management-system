import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, StateCell } from "@/components/tables/DataTable";
import { currentLeadTask } from "@/features/leads/leadTask";
import type { LeadBranchGroup, LeadGeoStateGroup, LeadHomeData, LeadSummary } from "@/features/leads/types";

export function LeadDashboard({ data, ribpMode = false }: { data: LeadHomeData; ribpMode?: boolean }) {
  const geoStates = data.by_geo_state?.length
    ? data.by_geo_state
    : deriveGeoStates(data.by_branch);

  return (
    <div className="flex flex-col gap-6">
      <section className="lg:rounded-[14px] lg:border lg:border-ims-line lg:bg-white lg:p-5 lg:shadow-[0_6px_20px_rgba(31,37,71,0.06)]">
        <h2 className="mb-3 text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">
          <span className="lg:hidden">Status Overview</span>
          <span className="hidden lg:inline">Overview</span>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard to="/chola360/leads?list=1" label="Total Property Leads" value={data.total} tone="sky" art="properties" />
          <StatCard to="/chola360/leads?state=Re-Work" label="Re-work Leads" value={data.rework} tone="lilac" art="rework" />
          <StatCard to="/chola360/leads?state=Rejected" label="Rejected Leads" value={data.rejected} tone="rose" art="rejected" />
          <StatCard to="/chola360/leads?state=Approved" label="Approved Leads" value={data.approved} tone="mint" art="completed" />
        </div>
      </section>

      {ribpMode ? (
        <section className="ims-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ims-ink">Leads by State</h2>
              <p className="text-sm text-slate-500">
                Open a state to see regions. Requests open only after you pick a region.
              </p>
            </div>
          </div>
          <ul className="space-y-3 px-4 pb-4">
            {geoStates.length === 0 ? (
              <li className="rounded-xl border border-ims-line px-4 py-5 text-sm text-slate-500">No state groups yet.</li>
            ) : (
              geoStates.map((row) => <GeoStateCard key={row.state} row={row} />)
            )}
          </ul>
        </section>
      ) : (
        <section className="ims-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ims-ink">Leads by Branch</h2>
              <p className="text-sm text-slate-500">
                Leads in the same region are grouped under one name. Open a group to review those leads.
              </p>
            </div>
          </div>

          <ul className="space-y-3 px-4 pb-4 lg:hidden">
            {data.by_branch.length === 0 ? (
              <li className="rounded-xl border border-ims-line px-4 py-5 text-sm text-slate-500">No region groups yet.</li>
            ) : (
              data.by_branch.map((row) => <BranchCard key={row.branch} row={row} />)
            )}
          </ul>

          <div className="hidden lg:block">
            <DataTable<LeadBranchGroup & { name: string }>
              rows={data.by_branch.map((row) => ({ ...row, name: row.branch }))}
              emptyTitle="No region groups"
              emptyBody="Leads will group here by region once created."
              href={(row) => regionHref(row)}
              columns={[
                { key: "branch", header: "Region", render: (row) => row.branch },
                {
                  key: "area",
                  header: "State / Locations",
                  render: (row) => regionSubtitle(row),
                },
                {
                  key: "count",
                  header: "Leads",
                  render: (row) => <span className="font-semibold tabular-nums">{row.lead_count}</span>,
                },
              ]}
            />
          </div>
        </section>
      )}

      {!ribpMode && data.leads.length > 0 ? (
        <section className="ims-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ims-ink">Recent Leads</h2>
              <p className="text-sm text-slate-500">Continue drafting, rework, or review your property leads.</p>
            </div>
            <Link to="/chola360/leads/new" className="ims-btn-secondary min-h-10 px-4 no-underline">
              Create Lead
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable<LeadSummary>
            rows={data.leads.slice(0, 10)}
            emptyTitle="No leads"
            emptyBody="Create a property lead to get started."
            href={(row) => `/chola360/leads/${encodeURIComponent(row.name)}`}
            columns={[
              {
                key: "property_id",
                header: "Property ID",
                render: (row) => row.property_id || row.name,
              },
              {
                key: "nbi_id",
                header: "NBI ID",
                render: (row) => (
                  <span className="whitespace-nowrap">{row.branch_opening_requirement || "—"}</span>
                ),
              },
              {
                key: "task",
                header: "Task",
                render: (row) => <span className="whitespace-nowrap">{currentLeadTask(row)}</span>,
              },
              {
                key: "location",
                header: "Location",
                render: (row) => (
                  <span className="block leading-tight">
                    <span className="block font-semibold text-ims-primary">{row.location_details || "—"}</span>
                    <span className="text-xs text-slate-500">{[row.area, row.region].filter(Boolean).join(" · ")}</span>
                  </span>
                ),
              },
              {
                key: "product",
                header: "Product",
                render: (row) => row.product_line || "—",
              },
              {
                key: "state",
                header: "Status",
                badge: true,
                render: (row) => <StateCell label={row.workflow_state} />,
              },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}

function deriveGeoStates(branches: LeadBranchGroup[]): LeadGeoStateGroup[] {
  const map = new Map<string, LeadGeoStateGroup>();
  for (const row of branches) {
    const state = (row.geo_state || "Unassigned").trim() || "Unassigned";
    const bucket = map.get(state) || { state, lead_count: 0, branch_count: 0 };
    bucket.lead_count += row.lead_count;
    bucket.branch_count += 1;
    map.set(state, bucket);
  }
  return [...map.values()].sort((a, b) => b.lead_count - a.lead_count || a.state.localeCompare(b.state));
}

function regionHref(row: LeadBranchGroup) {
  const params = new URLSearchParams();
  const area = (row.area || row.branch || "").trim();
  if (area) params.set("area", area);
  else if (row.region) params.set("region", row.region);
  else params.set("branch", row.branch);
  return `/chola360/leads?${params.toString()}`;
}

function regionSubtitle(row: LeadBranchGroup) {
  const parts: string[] = [];
  if (row.region && row.region !== row.branch) parts.push(row.region);
  if ((row.location_count || 0) > 1) parts.push(`${row.location_count} locations`);
  return parts.join(" · ") || "—";
}

function BranchCard({ row }: { row: LeadBranchGroup }) {
  return (
    <li>
      <Link
        to={regionHref(row)}
        className="flex items-center justify-between gap-3 rounded-xl border border-ims-line bg-white px-4 py-3.5 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)] transition-shadow hover:shadow-[0_10px_26px_rgba(31,37,71,0.1)]"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-ims-ink">{row.branch}</p>
          <p className="truncate text-xs text-slate-500">{regionSubtitle(row)}</p>
        </div>
        <span className="shrink-0 text-[22px] font-semibold tabular-nums text-ims-ink">{row.lead_count}</span>
      </Link>
    </li>
  );
}

function GeoStateCard({ row }: { row: LeadGeoStateGroup }) {
  const params = new URLSearchParams();
  params.set("geo_state", row.state);
  return (
    <li>
      <Link
        to={`/chola360/leads?${params.toString()}`}
        className="flex items-center justify-between gap-3 rounded-2xl border border-ims-line bg-white px-4 py-4 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)]"
      >
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ims-ink">{row.state} Region</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {row.branch_count} {row.branch_count === 1 ? "Area" : "Areas"} · {row.lead_count}{" "}
            {row.lead_count === 1 ? "Property" : "Properties"}
          </p>
        </div>
      </Link>
    </li>
  );
}
