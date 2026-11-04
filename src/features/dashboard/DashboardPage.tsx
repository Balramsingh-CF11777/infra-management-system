import { Link, Navigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { documentPath } from "@/lib/documentPath";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/api/dashboard";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, StateCell, TableFooter } from "@/components/tables/DataTable";
import { agingLabel, formatWhen } from "@/lib/format";
import { regionAccessFromScope, regionCardsForDashboard } from "@/lib/businessTeamRegions";
import { buildGoldLoanHome, type GoldLoanHome } from "@/lib/goldLoanHome";
import { useSession } from "@/stores/session";
import { ApiError, type DashboardSummary, type PendingItem } from "@/types/api";
import { AccessCheck } from "@/features/dashboard/AccessCheck";
import { BranchArt } from "@/features/dashboard/regionArt";
import { RegionCardsSection } from "@/features/dashboard/RegionCardsSection";
import { MisDashboardPage } from "@/features/mis/MisDashboardPage";
import { usesMisDashboard } from "@/lib/misAccess";
import { isApproverRole } from "@/config/leadRoles";
import { usesArbmLeadHome } from "@/lib/arbmAccess";
import { usesRibLeadHome } from "@/lib/ribAccess";

const QUEUE_PREVIEW = 5;

function homeFromSummary(data: DashboardSummary): GoldLoanHome {
  if (data.home) return data.home;
  // Prefer Proposed Branch geography (Business Team Desk queues are mostly MIS allocations).
  if (data.home_rows?.length) return buildGoldLoanHome(data.home_rows);
  const rows: PendingItem[] = data.queues.flatMap((queue) => queue.items);
  return buildGoldLoanHome(rows);
}

export function DashboardPage() {
  const user = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  if (usesArbmLeadHome(user, activeRole) || usesRibLeadHome(user, activeRole)) {
    return <Navigate to="/chola360/leads" replace />;
  }
  return usesMisDashboard(user) ? <MisDashboardPage /> : <DefaultDashboard />;
}

function DefaultDashboard() {
  const user = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const dashboard = useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboardSummary });

  if (dashboard.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="col-span-2 h-64 lg:col-span-4" />
      </div>
    );
  }
  if (dashboard.isError) {
    const message = dashboard.error instanceof ApiError ? dashboard.error.message : "The dashboard could not be loaded.";
    return <EmptyState title="Dashboard unavailable" body={message} />;
  }
  const data = dashboard.data;
  if (!data) return null;
  const home = homeFromSummary(data);
  const isBusinessTeam = Boolean(user?.roles.includes("Business Team") && !user.permissions.is_admin);
  const regionAccess =
    data.region_access?.entries?.length
      ? data.region_access
      : regionAccessFromScope(user?.scope, user?.product_lines) || data.region_access;
  const regionCards = regionCardsForDashboard(home, {
    isBusinessTeam,
    regionAccess,
  });
  const rimQueue = data.queues.find((queue) => isApproverRole(queue.role_label, user) && queue.items.some((item) => item.doctype === "Lead Request"));
  const isRbManager = isApproverRole(activeRole, user) || Boolean(rimQueue);
  const queues = data.queues.filter(
    (queue) =>
      !activeRole ||
      queue.role_label === activeRole ||
      activeRole === "System Manager" ||
      queue === rimQueue,
  );
  const rimHome = isRbManager ? data.rim_home : null;
  const totalProperties = isRbManager
    ? (rimHome?.total ?? 0)
    : home.regions.reduce((sum, region) => sum + region.properties, 0);
  const firstName = (user?.full_name || data.full_name || "").split(" ")[0];
  const readOnly = user?.api_mode === "compat";

  return (
    <div className="flex flex-col gap-6">
      {user && readOnly && <AccessCheck user={user} />}

      <div className="hidden lg:block">
        <p className="text-[17px] font-medium text-ims-ink">Hey {firstName || "there"}!</p>
        <p className="text-[17px] text-ims-ink">Let’s get your infra tasks moving.</p>
      </div>

      <section className="ims-dash-panel order-2 p-4 sm:p-5 lg:order-none">
        <h2 className="mb-3 text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">
          <span className="lg:hidden">Status Overview</span>
          <span className="hidden lg:inline">Overview</span>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            to={isRbManager ? "/chola360/leads?list=1&rim=all" : "/infra/requests"}
            label="Total Properties"
            value={totalProperties}
            tone="sky"
            art="properties"
          />
          <StatCard
            to={isRbManager ? "/chola360/leads?list=1&rim=pending" : "/infra/requests"}
            label="Review Pending"
            value={rimHome ? rimHome.review_pending : home.status.review_pending}
            tone="gold"
            art="review"
          />
          <StatCard
            to={isRbManager ? "/chola360/leads?list=1&rim=rework" : "/pending"}
            label="Rework Raised"
            value={rimHome ? rimHome.rework_raised : home.status.rework_raised}
            tone="lilac"
            art="rework"
          />
          <StatCard
            to={isRbManager ? "/chola360/leads?list=1&rim=approved" : "/infra/requests"}
            label="Approved Properties"
            value={rimHome ? rimHome.approved : home.status.approved}
            tone="mint"
            art="completed"
          />
        </div>
      </section>

      {isRbManager ? null : <RegionCardsSection regionCards={regionCards} isBusinessTeam={isBusinessTeam} />}

      {isRbManager ? null : (
      <section className="order-3 lg:order-none">
        <h2 className="mb-3 text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">Branch Readiness</h2>
        <Link
          to="/infra/requests?q=Inauguration"
          className="ims-card flex items-center gap-4 px-4 py-3 no-underline transition-shadow hover:shadow-[0_10px_26px_rgba(31,37,71,0.1)] lg:max-w-md"
        >
          <BranchArt />
          <p className="min-w-0 flex-1 text-[15px] font-medium text-ims-ink">Set Branch Launches</p>
          <p className="text-[28px] font-semibold leading-none text-ims-ink">{home.launches}</p>
        </Link>
      </section>
      )}

      {isRbManager && queues.length === 0 ? (
        <section className="ims-dash-panel order-4 overflow-hidden lg:order-none">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ims-ink">RB Manager</h2>
              <p className="text-sm text-slate-500">Sections the Regional Infra Business Partner submitted for your approval.</p>
            </div>
            <Link to="/pending" className="ims-btn-secondary min-h-10 px-4">
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {queues.map((queue) => (
        <section key={queue.role_label} className="ims-dash-panel order-4 overflow-hidden lg:order-none">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ims-ink">{queue.role_label}</h2>
              <p className="text-sm text-slate-500">Review the tasks listed below and act on them.</p>
            </div>
            <Link to="/pending" className="ims-btn-secondary min-h-10 px-4">
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable<PendingItem>
            rows={queue.items.slice(0, QUEUE_PREVIEW)}
            emptyTitle="Nothing pending"
            emptyBody="No requests currently need this role."
            href={(item) => (readOnly ? "/pending" : documentPath(item.doctype, item.name))}
            columns={[
              {
                key: "request_id",
                header: "Request ID",
                render: (item) => item.request_id || item.name || "—",
              },
              {
                key: "property_id",
                header: "Property ID",
                render: (item) => item.property_id || "—",
              },
              {
                key: "location",
                header: "Location",
                render: (item) => (
                  <span className="block leading-tight">
                    <span className="block font-semibold text-ims-primary">{[item.zone, item.region].filter(Boolean).join(" - ") || "—"}</span>
                    <span className="text-xs text-slate-500">{[item.branch, item.product_line].filter(Boolean).join(" · ")}</span>
                  </span>
                ),
              },
              { key: "since", header: "Date In Queue", render: (item) => formatWhen(item.pending_since) },
              { key: "aging", header: "Aging", render: (item) => agingLabel(item.pending_since) || "—" },
              { key: "state", header: "Status", badge: true, render: (item) => <StateCell label={item.workflow_state_label} /> },
            ]}
          />
          {queue.count > 0 && <TableFooter from={1} to={Math.min(QUEUE_PREVIEW, queue.items.length)} total={queue.count} />}
        </section>
      ))}
    </div>
  );
}
