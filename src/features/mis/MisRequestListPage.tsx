import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { getMisRequests, type MisRequestFilters } from "@/api/misDashboard";
import { queryKeys } from "@/api/keys";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { TableFooter } from "@/components/tables/DataTable";
import { hasMisRole, usesMisDashboard } from "@/lib/misAccess";
import { useSession, useToasts } from "@/stores/session";
import type { FinancialYearChoice, MisRequestList, MisRequestRow } from "@/types/api";
import { MisActionDialog } from "@/features/mis/MisActionDialog";
import { MisCreateDialog } from "@/features/mis/MisCreateDialog";
import { MisViewDialog } from "@/features/mis/MisViewDialog";
import { FY_CHOICES, FY_FALLBACK_LABELS, FinancialYearFilter, MisRequestTable, isMisApprover } from "@/features/mis/MisShared";

const PAGE_LENGTH = 20;

function hasMisAccess(user: ReturnType<typeof useSession.getState>["user"]) {
  return usesMisDashboard(user) || hasMisRole(user?.roles);
}

export function MisRequestListPage() {
  const user = useSession((state) => state.user);
  const allowed = hasMisAccess(user);
  const push = useToasts((state) => state.push);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<MisRequestRow | null>(null);
  const [viewing, setViewing] = useState<MisRequestRow | null>(null);

  const filters = useMemo<MisRequestFilters>(() => {
    const fy = params.get("fy") as FinancialYearChoice | null;
    return {
      fy: fy && FY_CHOICES.includes(fy) ? fy : "current",
      status: params.get("status") === "in_progress" ? "in_progress" : "all",
      search: params.get("q") || undefined,
      product_line: params.get("product") || undefined,
      workflow_state: params.get("state") || undefined,
      start: Math.max(Number(params.get("start") || 0), 0),
      page_length: PAGE_LENGTH,
    };
  }, [params]);

  const list = useQuery({
    queryKey: queryKeys.misRequests(filters),
    queryFn: () => getMisRequests(filters),
    placeholderData: keepPreviousData,
    enabled: allowed,
  });

  if (!allowed) return <Navigate to="/dashboard" replace />;

  const data = list.data;
  const canCreate = Boolean(data?.can_create);
  const total = data?.total ?? 0;
  const shown = data?.items.length ?? 0;
  const fyOption = data?.fy_options.find((option) => option.id === filters.fy);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("start" in changes)) next.delete("start");
    setParams(next);
  }

  function applySearch(event: FormEvent) {
    event.preventDefault();
    update({ q: search.trim() || undefined });
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
    update({ start: undefined, q: undefined, status: undefined, state: undefined, product: undefined });
    setSearch("");
    await refresh();
  }

  return (
    <ListBody
      roles={user?.roles}
      filters={filters}
      data={data}
      fetching={list.isFetching}
      canCreate={canCreate}
      total={total}
      shown={shown}
      fyOption={fyOption}
      search={search}
      setSearch={setSearch}
      creating={creating}
      setCreating={setCreating}
      acting={acting}
      setActing={setActing}
      viewing={viewing}
      setViewing={setViewing}
      update={update}
      applySearch={applySearch}
      refresh={refresh}
      onCreated={onCreated}
    />
  );
}

function ListBody({
  roles,
  filters,
  data,
  fetching,
  canCreate,
  total,
  shown,
  fyOption,
  search,
  setSearch,
  creating,
  setCreating,
  acting,
  setActing,
  viewing,
  setViewing,
  update,
  applySearch,
  refresh,
  onCreated,
}: {
  roles: string[] | undefined;
  filters: MisRequestFilters;
  data: MisRequestList | undefined;
  fetching: boolean;
  canCreate: boolean;
  total: number;
  shown: number;
  fyOption: { id: FinancialYearChoice; label: string; range: string } | undefined;
  search: string;
  setSearch: (value: string) => void;
  creating: boolean;
  setCreating: (value: boolean) => void;
  acting: MisRequestRow | null;
  setActing: (row: MisRequestRow | null) => void;
  viewing: MisRequestRow | null;
  setViewing: (row: MisRequestRow | null) => void;
  update: (changes: Record<string, string | undefined>) => void;
  applySearch: (event: FormEvent) => void;
  refresh: () => Promise<void>;
  onCreated: (message: string) => Promise<void>;
}) {
  return (
    <section>
      <Breadcrumb current="MIS Requests" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FinancialYearFilter
          value={filters.fy}
          options={data?.fy_options ?? []}
          onChange={(fy) => update({ fy: fy === "current" ? undefined : fy })}
        />
        {canCreate && (
          <button type="button" className="ims-btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Create MIS Request
          </button>
        )}
      </div>

      <div className="ims-card overflow-hidden">
        <CardHeader
          title={filters.status === "in_progress" ? "Requests In Progress" : "All Requests"}
          subtitle={filters.fy === "all" ? "All financial years" : fyOption?.range || FY_FALLBACK_LABELS[filters.fy]}
        >
          <form className="flex w-full flex-wrap gap-2 sm:w-auto" onSubmit={applySearch}>
            <label className="sr-only" htmlFor="mis-list-search">
              Search by request ID or product line
            </label>
            <div className="relative flex-1 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="mis-list-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Request ID or product line"
                className="ims-field pl-9"
              />
            </div>
            <label className="sr-only" htmlFor="mis-product-filter">
              Product line
            </label>
            <select
              id="mis-product-filter"
              value={filters.product_line || ""}
              onChange={(event) => update({ product: event.target.value || undefined })}
              className="ims-field w-full sm:w-36"
            >
              <option value="">All products</option>
              {(data?.product_lines ?? []).map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="mis-state-filter">
              Workflow state
            </label>
            <select
              id="mis-state-filter"
              value={filters.workflow_state || ""}
              onChange={(event) => update({ state: event.target.value || undefined })}
              className="ims-field w-full sm:w-44"
            >
              <option value="">All states</option>
              {(data?.workflow_states ?? []).map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
            <button type="submit" className="ims-btn-primary">
              Search
            </button>
          </form>
        </CardHeader>

        {filters.status === "in_progress" && (
          <div className="flex items-center justify-between gap-3 border-t border-[#edf0f7] bg-ims-bg px-5 py-2 text-xs text-slate-600">
            <span>Showing requests that have not reached Complete.</span>
            <Link
              to={`/mis/requests${filters.fy === "current" ? "" : `?fy=${filters.fy}`}`}
              className="font-medium text-ims-primary no-underline"
            >
              Show all
            </Link>
          </div>
        )}

        {!data ? (
          <SkeletonBlock className="m-5 h-64" />
        ) : (
          <MisRequestTable
            rows={data.items}
            emptyTitle={filters.search || filters.product_line || filters.workflow_state ? "No matching requests" : "No branch requests yet"}
            emptyBody={
              filters.search || filters.product_line || filters.workflow_state
                ? "Try another request ID, product line, year or workflow state."
                : canCreate
                  ? "Create an MIS request to get started for this financial year."
                  : "Requests you are permitted to see will appear here."
            }
            branchCountLabel={data.branch_count_label}
            isApprover={isMisApprover(roles)}
            onAction={setActing}
            onView={setViewing}
            fetching={fetching}
          />
        )}

        {data && total > 0 && (
          <TableFooter from={filters.start + 1} to={filters.start + shown} total={total}>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous page"
                className="rounded-md p-1.5 text-slate-500 hover:bg-ims-bg disabled:opacity-40"
                disabled={filters.start === 0}
                onClick={() => update({ start: String(Math.max(0, filters.start - PAGE_LENGTH)) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="rounded-md border border-ims-line px-2.5 py-1 font-medium text-ims-ink">
                {Math.floor(filters.start / PAGE_LENGTH) + 1}
              </span>
              <button
                type="button"
                aria-label="Next page"
                className="rounded-md p-1.5 text-slate-500 hover:bg-ims-bg disabled:opacity-40"
                disabled={filters.start + PAGE_LENGTH >= total}
                onClick={() => update({ start: String(filters.start + PAGE_LENGTH) })}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </TableFooter>
        )}
      </div>

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
    </section>
  );
}
