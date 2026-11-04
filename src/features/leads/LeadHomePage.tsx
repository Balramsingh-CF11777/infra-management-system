import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getLeadHome, getRibPipelineOverview } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb } from "@/components/common/PageHeader";
import { BranchLeadListPage } from "@/features/leads/BranchLeadListPage";
import { GeoStateRegionsPage } from "@/features/leads/GeoStateRegionsPage";
import { LeadDashboard } from "@/features/leads/LeadDashboard";
import { LeadEmptyState } from "@/features/leads/LeadEmptyState";
import { SubmittedProspects } from "@/features/leads/SubmittedProspects";
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
  const pipelineBucket = (params.get("pipeline") || "").trim();
  const listAll = params.get("list") === "1";
  const rimBucket = (params.get("rim") || "").trim();
  const requestListView = Boolean(area || region || location || workflowState || pipelineBucket || listAll || rimBucket);
  const geoBrowseView = Boolean(geoState) && !requestListView;
  const user = useSession((s) => s.user);
  const firstName = (user?.full_name || "").split(" ")[0];
  const isRibp = hasRibpRole(user);

  const home = useQuery({
    queryKey: [...queryKeys.leadHome, demo ? "demo" : "live"] as const,
    queryFn: () => getLeadHome({ demo }),
    enabled: !requestListView && !geoBrowseView,
  });
  const ribPipeline = useQuery({
    queryKey: queryKeys.ribPipeline,
    queryFn: getRibPipelineOverview,
    enabled: !requestListView && !geoBrowseView && isRibp && !demo,
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });

  if (requestListView) {
    return <BranchLeadListPage />;
  }

  if (geoBrowseView) {
    return <GeoStateRegionsPage />;
  }

  const data = home.data;
  const hasLeads = (data?.total ?? 0) > 0 || (data?.leads?.length ?? 0) > 0;

  if (home.isLoading || (isRibp && !demo && ribPipeline.isLoading)) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="col-span-2 h-64 lg:col-span-3" />
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
    <div className="relative flex flex-col gap-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Breadcrumb current="Property Leads" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hidden lg:block">
            <p className="text-[17px] font-medium text-ims-ink">Hey {firstName || "there"}!</p>
            <p className="text-[17px] text-ims-ink">
              {isRibp
                ? "Track pipeline progress and open assigned site or branch tasks."
                : "Capture and track property leads for your area."}
            </p>
          </div>
          {!isRibp ? (
            <div className="lg:hidden">
              <h1 className="text-[22px] font-extrabold tracking-tight text-ims-ink">Property Leads</h1>
              <p className="mt-1 text-sm text-slate-600">Area Regional Business Manager workspace</p>
            </div>
          ) : null}
        </div>
        {isRibp || hasLeads ? (
          <Link
            to="/chola360/leads/new"
            className={`ims-btn-primary items-center gap-2 no-underline ${isRibp ? "hidden lg:inline-flex" : "inline-flex"}`}
          >
            <Plus className="h-4 w-4" />
            Create Lead
          </Link>
        ) : null}
      </div>

      {isRibp && data ? (
        <LeadDashboard
          data={data}
          ribpMode
          pipeline={ribPipeline.data ?? null}
          pipelineLoading={ribPipeline.isLoading || ribPipeline.isFetching}
          pipelineError={ribPipeline.isError}
        />
      ) : hasLeads && data ? (
        <LeadDashboard data={data} />
      ) : (
        <LeadEmptyState />
      )}

      <SubmittedProspects />

      {isRibp ? (
        <Link
          to="/chola360/leads/new"
          aria-label="Create lead"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ims-primary text-white shadow-[0_10px_28px_rgba(60,48,120,0.35)] no-underline transition hover:brightness-110 lg:hidden"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </Link>
      ) : null}
    </div>
  );
}
