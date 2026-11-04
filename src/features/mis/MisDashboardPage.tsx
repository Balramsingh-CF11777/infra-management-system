import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, RotateCw, Search } from "lucide-react";
import { getMisDashboard } from "@/api/misDashboard";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { BranchArt } from "@/features/dashboard/regionArt";
import { useSession, useToasts } from "@/stores/session";
import { ApiError, type FinancialYearChoice, type MisRequestRow } from "@/types/api";
import { MisActionDialog } from "@/features/mis/MisActionDialog";
import { MisCreateDialog } from "@/features/mis/MisCreateDialog";
import { MisViewDialog } from "@/features/mis/MisViewDialog";
import {
  FY_CHOICES,
  FY_FALLBACK_LABELS,
  FinancialYearFilter,
  MisRequestTable,
  isMisApprover,
  matchesMisSearch,
  sortMisByNewest,
} from "@/features/mis/MisShared";

function sectionHint(state: string) {
  if (state === "Draft") return "Your saved requests awaiting submission.";
  if (state === "Approval Pending") return "Submitted requests awaiting Complete or Reject.";
  if (state === "Complete") return "Requests that finished the MIS workflow.";
  return "Requests in this workflow state.";
}

function SectionSearch({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }
  return (
    <form className="w-full min-w-[12rem] sm:w-56" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={id}>
        Search by request ID
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search request ID…"
          className="ims-field w-full pl-9"
        />
      </div>
    </form>
  );
}

export function MisDashboardPage() {
  const user = useSession((state) => state.user);
  const push = useToasts((state) => state.push);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<MisRequestRow | null>(null);
  const [viewing, setViewing] = useState<MisRequestRow | null>(null);
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});
  const [showComplete, setShowComplete] = useState(false);

  const fy = useMemo(() => {
    const value = params.get("fy") as FinancialYearChoice | null;
    return value && FY_CHOICES.includes(value) ? value : "current";
  }, [params]);

  const dashboard = useQuery({
    queryKey: queryKeys.misDashboard({ fy }),
    queryFn: () => getMisDashboard({ fy }),
    placeholderData: keepPreviousData,
  });

  const data = dashboard.data;
  const canCreate = Boolean(user?.permissions.can_create_mis_request ?? data?.can_create);
  const fyOption = data?.fy_options.find((option) => option.id === fy);
  const firstName = (user?.full_name || "").split(" ")[0];
  const currentUser = user?.user || "";

  const sections = useMemo(() => {
    const raw = data?.sections?.length
      ? data.sections
      : data
        ? [{ state: "all", label: "Recent Requests", count: data.recent.length, items: data.recent }]
        : [];

    return raw
      .map((section) => {
        let items = section.items;
        if (section.state === "Draft" && currentUser) {
          items = items.filter((row) => row.owner === currentUser);
        }
        items = sortMisByNewest(items);
        return { ...section, items, count: items.length };
      })
      .filter((section) => section.state === "Complete" || section.count > 0);
  }, [data, currentUser]);

  const completeSection = sections.find((section) => section.state === "Complete");
  const visibleSections = sections.filter((section) => section.state !== "Complete");

  function rowsFor(section: { state: string; items: MisRequestRow[] }) {
    return sortMisByNewest(section.items.filter((row) => matchesMisSearch(row, sectionSearch[section.state] || "")));
  }

  function setSearch(state: string, value: string) {
    setSectionSearch((prev) => ({ ...prev, [state]: value }));
  }

  function setFy(next: FinancialYearChoice) {
    const updated = new URLSearchParams(params);
    if (next === "current") updated.delete("fy");
    else updated.set("fy", next);
    setParams(updated);
  }

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["misDashboard"] }),
      client.invalidateQueries({ queryKey: ["misRequests"] }),
    ]);
  }

  async function onCreated(message: string) {
    setCreating(false);
    push(message, "success");
    await refresh();
  }

  if (dashboard.isError && !data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        body={dashboard.error instanceof ApiError ? dashboard.error.message : "MIS branch requests could not be loaded from Frappe."}
      >
        <button type="button" className="ims-btn-secondary mt-4" onClick={() => void dashboard.refetch()}>
          <RotateCw className="h-4 w-4" />
          Try again
        </button>
      </EmptyState>
    );
  }

  const completeQuery = sectionSearch.Complete || "";
  const completeRows = completeSection ? rowsFor(completeSection) : [];
  const completeOpen = showComplete || Boolean(completeQuery.trim());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hidden min-w-0 lg:block">
          <p className="text-[17px] font-medium text-ims-ink">Hey {firstName || "there"}!</p>
          <p className="text-[17px] text-ims-ink">Track product-wise branch requests for the financial year.</p>
        </div>
        <button
          type="button"
          className="ims-btn-secondary min-h-10"
          onClick={() => void refresh()}
          disabled={dashboard.isFetching}
          aria-label="Refresh dashboard"
        >
          <RotateCw className={`h-4 w-4 ${dashboard.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <section
        aria-label="Branch request summary"
        className="ims-dash-panel p-4 sm:p-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">
            <span className="lg:hidden">Status Overview</span>
            <span className="hidden lg:inline">Overview</span>
          </h2>
          <FinancialYearFilter value={fy} options={data?.fy_options ?? []} onChange={setFy} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:max-w-3xl lg:gap-4">
          {data ? (
            <>
              <StatCard
                to="#mis-request-sections"
                label="Total Branch Requests Raised"
                value={data.kpis.total}
                tone="sky"
                art="branch"
              />
              <StatCard
                to="#mis-request-sections"
                label="Requests In Progress"
                value={data.kpis.in_progress}
                tone="gold"
                art="review"
              />
            </>
          ) : (
            <>
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-28" />
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">MIS Branch Requests</h2>
        <div className="flex flex-wrap items-stretch gap-3">
          {canCreate && (
            <button type="button" className="ims-btn-primary w-full sm:w-auto" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Create MIS Request
            </button>
          )}
          <div className="ims-card flex w-full items-center gap-4 px-4 py-3 sm:w-auto sm:min-w-[20rem] lg:max-w-md">
            <BranchArt />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ims-ink">All Requests</p>
              <p className="text-[12px] text-slate-500">
                {fy === "all" ? "All financial years" : fyOption?.range || FY_FALLBACK_LABELS[fy]}
              </p>
            </div>
            <p className="text-[28px] font-semibold leading-none text-ims-ink">{data?.kpis.total ?? "—"}</p>
          </div>
        </div>
      </section>

      {!data ? (
        <SkeletonBlock className="h-64" />
      ) : visibleSections.length === 0 && !(completeSection && completeSection.count > 0) ? (
        <EmptyState
          title="No branch requests yet"
          body={canCreate ? "Create an MIS request to get started for this financial year." : "Requests you are permitted to see will appear here."}
        />
      ) : (
        <div id="mis-request-sections" className="flex flex-col gap-6">
          {visibleSections.map((section) => {
            const query = sectionSearch[section.state] || "";
            const rows = rowsFor(section);
            return (
              <section key={section.state} className="ims-dash-panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="text-[17px] font-semibold text-ims-ink">{section.label}</h2>
                    <p className="text-sm text-slate-500">{sectionHint(section.state)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SectionSearch
                      id={`mis-search-${section.state.replace(/\s+/g, "-").toLowerCase()}`}
                      value={query}
                      onChange={(value) => setSearch(section.state, value)}
                    />
                    <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-ims-bg px-2.5 text-sm font-semibold text-ims-ink">
                      {rows.length}
                    </span>
                  </div>
                </div>
                <MisRequestTable
                  rows={rows}
                  emptyTitle={query.trim() ? "No matching requests" : "No requests in this state"}
                  emptyBody={query.trim() ? "Try another request ID, or clear the search." : ""}
                  branchCountLabel={data.branch_count_label}
                  isApprover={isMisApprover(user?.roles)}
                  onAction={setActing}
                  onView={setViewing}
                  fetching={dashboard.isFetching}
                  draftColumns={section.state === "Draft"}
                />
              </section>
            );
          })}

          {completeSection && completeSection.count > 0 && (
            <section className="ims-dash-panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-semibold text-ims-ink">{completeSection.label}</h2>
                  <p className="text-sm text-slate-500">
                    {completeOpen
                      ? sectionHint("Complete")
                      : `${completeSection.count} completed request${completeSection.count === 1 ? "" : "s"} hidden.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {completeOpen && (
                    <SectionSearch
                      id="mis-search-complete"
                      value={completeQuery}
                      onChange={(value) => setSearch("Complete", value)}
                    />
                  )}
                  <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-ims-bg px-2.5 text-sm font-semibold text-ims-ink">
                    {completeOpen ? completeRows.length : completeSection.count}
                  </span>
                  {!completeQuery.trim() && (
                    <button
                      type="button"
                      className="ims-btn-secondary min-h-10"
                      aria-expanded={completeOpen}
                      onClick={() => setShowComplete((open) => !open)}
                    >
                      {completeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {completeOpen ? "Hide Complete" : "Show Complete"}
                    </button>
                  )}
                </div>
              </div>
              {completeOpen && (
                <MisRequestTable
                  rows={completeRows}
                  emptyTitle={completeQuery.trim() ? "No matching requests" : "No completed requests"}
                  emptyBody={completeQuery.trim() ? "Try another request ID, or clear the search." : ""}
                  branchCountLabel={data.branch_count_label}
                  isApprover={isMisApprover(user?.roles)}
                  onAction={setActing}
                  onView={setViewing}
                  fetching={dashboard.isFetching}
                />
              )}
            </section>
          )}
        </div>
      )}

      {canCreate && <MisCreateDialog open={creating} onClose={() => setCreating(false)} onCreated={onCreated} />}
      {viewing && (
        <MisViewDialog
          row={viewing}
          branchCountLabel={data?.branch_count_label}
          onClose={() => setViewing(null)}
          onDone={refresh}
        />
      )}
      {acting && <MisActionDialog row={acting} onClose={() => setActing(null)} onDone={refresh} />}
    </div>
  );
}
