import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getLeadHome } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb } from "@/components/common/PageHeader";
import { BranchLeadListPage } from "@/features/leads/BranchLeadListPage";
import { GeoStateRegionsPage } from "@/features/leads/GeoStateRegionsPage";
import { LeadDashboard } from "@/features/leads/LeadDashboard";
import { LeadEmptyState } from "@/features/leads/LeadEmptyState";
import { hasRibpRole } from "@/lib/ribAccess";
import { useSession } from "@/stores/session";
import { ApiError } from "@/types/api";

export function LeadHomePage() {
  const [params] = useSearchParams();
  const demo = params.get("demo") === "1";
  const geoState = (params.get("geo_state") || "").trim();
  const area = (params.get("area") || "").trim();
  const region = (params.get("region") || "").trim();
  const location = (params.get("location") || params.get("branch") || "").trim();
  const workflowState = (params.get("state") || "").trim(); // workflow filter (Approved / Re-Work / …)
  const listAll = params.get("list") === "1";
  const requestListView = Boolean(area || region || location || workflowState || listAll);
  const geoBrowseView = Boolean(geoState) && !requestListView;
  const user = useSession((s) => s.user);
  const firstName = (user?.full_name || "").split(" ")[0];
  const isRibp = hasRibpRole(user);

  const home = useQuery({
    queryKey: [...queryKeys.leadHome, demo ? "demo" : "live"] as const,
    queryFn: () => getLeadHome({ demo }),
    enabled: !requestListView && !geoBrowseView,
  });

  if (requestListView) {
    return <BranchLeadListPage />;
  }

  if (geoBrowseView) {
    return <GeoStateRegionsPage />;
  }

  const data = home.data;
  const hasLeads = (data?.total ?? 0) > 0 || (data?.leads?.length ?? 0) > 0;

  if (home.isLoading) {
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

  if (home.isError) {
    return (
      <EmptyState
        title="Property Leads unavailable"
        body={home.error instanceof ApiError ? home.error.message : "The lead dashboard could not be loaded."}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb current="Property Leads" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hidden lg:block">
            <p className="text-[17px] font-medium text-ims-ink">Hey {firstName || "there"}!</p>
            <p className="text-[17px] text-ims-ink">
              {isRibp
                ? "Review property leads by region, then open site verification."
                : "Capture and track property leads for your area."}
            </p>
          </div>
          <div className="lg:hidden">
            <h1 className="text-[22px] font-extrabold tracking-tight text-ims-ink">Property Leads</h1>
            <p className="mt-1 text-sm text-slate-600">
              {isRibp ? "Regional Infra Business Partner workspace" : "Area Regional Business Manager workspace"}
            </p>
          </div>
        </div>
        {!isRibp && hasLeads ? (
          <Link to="/chola360/leads/new" className="ims-btn-primary inline-flex items-center gap-2 no-underline">
            <Plus className="h-4 w-4" />
            Create Lead
          </Link>
        ) : null}
      </div>

      {hasLeads && data ? <LeadDashboard data={data} ribpMode={isRibp} /> : <LeadEmptyState />}
    </div>
  );
}
