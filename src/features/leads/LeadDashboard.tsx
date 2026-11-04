import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { DataTable, StateCell } from "@/components/tables/DataTable";
import { currentLeadTask } from "@/features/leads/leadTask";
import { RibPipelineStageCard } from "@/features/leads/RibPipelineStageCard";
import type {
  LeadBranchGroup,
  LeadHomeData,
  LeadSummary,
  RibPipelineOverview,
} from "@/features/leads/types";

export function LeadDashboard({
  data,
  ribpMode = false,
  pipeline,
  pipelineLoading = false,
  pipelineError = false,
}: {
  data: LeadHomeData;
  ribpMode?: boolean;
  pipeline?: RibPipelineOverview | null;
  pipelineLoading?: boolean;
  pipelineError?: boolean;
}) {
  const [params] = useSearchParams();
  const activeStage = (params.get("stage") || "").trim();
  const pendingLeads = (data.awaiting || 0) + (data.draft || 0);
  const slaOverdue = data.awaiting || 0;

  return (
    <div className="flex flex-col gap-6">
      {ribpMode ? (
        <section className="ims-dash-panel p-4 sm:p-5">
          <h2 className="mb-3 text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">
            Pipeline Overview
          </h2>
          {pipeline?.buckets?.length ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
              {pipeline.buckets.map((bucket) => (
                <RibPipelineStageCard
                  key={bucket.id}
                  bucket={bucket}
                  active={activeStage === bucket.id}
                />
              ))}
            </div>
          ) : pipelineLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          ) : (
            <p className="rounded-xl border border-ims-line bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {pipelineError
                ? "Pipeline counts could not be loaded. Pull to refresh or open the app again."
                : "No pipeline stages yet."}
            </p>
          )}
        </section>
      ) : (
        <section className="ims-dash-panel p-4 sm:p-5">
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
      )}

      {ribpMode ? (
        <section className="ims-dash-panel p-4 sm:p-5">
          <h2 className="mb-3 text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">
            Status Overview
          </h2>
          <div className="space-y-3">
            <Link
              to="/chola360/leads?state=Awaiting%20Approval,On%20Hold"
              className="ims-stat-peach flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)] sm:min-h-[80px] sm:px-5"
            >
              <span className="text-[14px] font-semibold text-ims-ink sm:text-[15px]">SLA Overdue</span>
              <span className="text-[28px] font-bold tabular-nums leading-none tracking-tight text-ims-ink sm:text-[32px]">
                {slaOverdue}
              </span>
            </Link>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatusMiniCard
                to="/chola360/leads?state=Draft,Awaiting%20Approval,On%20Hold"
                label="Pending Leads"
                value={pendingLeads}
                tone="gold"
              />
              <StatusMiniCard
                to="/chola360/leads?state=Re-Work"
                label="Re-work Leads"
                value={data.rework}
                tone="lilac"
              />
              <StatusMiniCard
                to="/chola360/leads?state=Rejected"
                label="Rejected Leads"
                value={data.rejected}
                tone="rose"
              />
            </div>
          </div>
        </section>
      ) : null}

      {ribpMode ? (
        <section className="ims-dash-panel overflow-hidden">
          <div className="px-4 py-4 sm:px-5">
            <h2 className="text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">Leads by Area</h2>
          </div>
          <ul className="space-y-3 px-4 pb-4 sm:px-5">
            {data.by_branch.length === 0 ? (
              <li className="rounded-xl border border-ims-line px-4 py-5 text-sm text-slate-500">No area groups yet.</li>
            ) : (
              data.by_branch.map((row) => <AreaCard key={row.branch} row={row} />)
            )}
          </ul>
        </section>
      ) : (
        <section className="ims-dash-panel overflow-hidden">
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
        <section className="ims-dash-panel overflow-hidden">
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
            href={(row) => `/chola360/leads/${encodeURIComponent(row.name)}/approval`}
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

function regionHref(row: LeadBranchGroup) {
  const params = new URLSearchParams();
  // Match get_lead_home grouping: category = area || region || location_details
  if ((row.area || "").trim()) params.set("area", row.area!.trim());
  else if ((row.region || "").trim()) params.set("region", row.region!.trim());
  else params.set("location", (row.branch || "").trim());
  return `/chola360/leads?${params.toString()}`;
}

function regionSubtitle(row: LeadBranchGroup) {
  const parts: string[] = [];
  if (row.region && row.region !== row.branch) parts.push(row.region);
  if ((row.location_count || 0) > 1) parts.push(`${row.location_count} locations`);
  return parts.join(" · ") || "—";
}

function StatusMiniCard({
  to,
  label,
  value,
  tone,
}: {
  to: string;
  label: string;
  value: number;
  tone: "gold" | "lilac" | "rose";
}) {
  const toneClass =
    tone === "gold" ? "ims-stat-gold" : tone === "lilac" ? "ims-stat-lilac" : "ims-stat-rose";
  return (
    <Link
      to={to}
      className={`${toneClass} flex min-h-[88px] flex-col justify-between rounded-2xl border px-2.5 py-2.5 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)] sm:min-h-[96px] sm:px-3 sm:py-3`}
    >
      <span className="text-[11px] font-semibold leading-snug text-ims-ink sm:text-[12px]">{label}</span>
      <span className="text-[24px] font-bold tabular-nums leading-none tracking-tight text-ims-ink sm:text-[28px]">
        {value}
      </span>
    </Link>
  );
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

function AreaCard({ row }: { row: LeadBranchGroup }) {
  const branches = row.location_count || 1;
  return (
    <li>
      <Link
        to={regionHref(row)}
        className="flex items-center justify-between gap-3 rounded-2xl border border-ims-line bg-white px-4 py-3.5 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)] transition-shadow hover:shadow-[0_10px_26px_rgba(31,37,71,0.1)]"
      >
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ims-ink">{row.branch}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {branches} {branches === 1 ? "Branch" : "Branches"} · {row.lead_count}{" "}
            {row.lead_count === 1 ? "Lead" : "Leads"}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </Link>
    </li>
  );
}
