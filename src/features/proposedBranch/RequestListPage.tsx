import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getRequests } from "@/api/proposedBranch";
import { queryKeys } from "@/api/keys";
import { DataTable, StateCell, TableFooter } from "@/components/tables/DataTable";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { documentPath } from "@/lib/documentPath";
import { agingLabel } from "@/lib/format";
import type { RequestSummary } from "@/types/api";

const PAGE_LENGTH = 20;

const PIPELINE_TITLES: Record<string, string> = {
  design_sketch: "Design Sketch",
  cad_consent: "CAD Consent",
  ll_agreement: "LL Agreement",
  infra_readiness: "Infra Readiness",
};

export function RequestListPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const pipeline = (params.get("pipeline") || "").trim();
  const filters = useMemo(
    () => ({
      search: params.get("q") || undefined,
      workflow_state: params.get("state") || undefined,
      product_line: params.get("product") || undefined,
      zone: params.get("zone") || undefined,
      pipeline: pipeline || undefined,
      start: Number(params.get("start") || 0),
      page_length: PAGE_LENGTH,
    }),
    [params, pipeline],
  );
  const requests = useQuery({ queryKey: queryKeys.requests(filters), queryFn: () => getRequests(filters) });
  const total = requests.data?.total ?? 0;
  const shown = requests.data?.items.length ?? 0;
  const listTitle = PIPELINE_TITLES[pipeline] || "Total Listing";
  const listSubtitle = pipeline
    ? "Same Proposed Branch rows as the Pipeline Overview card count."
    : "All property listings you are permitted to see.";

  function applySearch(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (search.trim()) next.set("q", search.trim());
    else next.delete("q");
    next.delete("start");
    setParams(next);
  }

  function goTo(start: number) {
    const next = new URLSearchParams(params);
    next.set("start", String(start));
    setParams(next);
  }

  return (
    <section>
      <Breadcrumb current={listTitle} />
      <div className="ims-card overflow-hidden">
        <CardHeader title={listTitle} subtitle={listSubtitle}>
          <form className="flex w-full gap-2 sm:w-auto" onSubmit={applySearch}>
            <label className="sr-only" htmlFor="request-search">
              Search requests
            </label>
            <div className="relative flex-1 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="request-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Property ID, location, product"
                className="ims-field pl-9"
              />
            </div>
            <button type="submit" className="ims-btn-primary">
              Search
            </button>
          </form>
        </CardHeader>
        {requests.isLoading ? (
          <SkeletonBlock className="m-5 h-64" />
        ) : (
          <DataTable<RequestSummary>
            rows={requests.data?.items ?? []}
            emptyTitle="No requests found"
            emptyBody="Try another search, or wait until a request is assigned to your scope."
            href={(row) => documentPath(row.doctype || "Proposed Branch Details", row.name)}
            columns={[
              { key: "request_id", header: "Request ID", render: (row) => row.request_id || row.name },
              { key: "name", header: "Property ID", render: (row) => row.property_id || "—" },
              {
                key: "location",
                header: "Location",
                render: (row) => (
                  <span className="block leading-tight">
                    <span className="block font-semibold text-ims-primary">{[row.zone, row.region].filter(Boolean).join(" - ") || "—"}</span>
                    <span className="text-xs text-slate-500">{row.location || ""}</span>
                  </span>
                ),
              },
              { key: "product", header: "Product", render: (row) => row.product_line || "—" },
              { key: "state", header: "Status", badge: true, render: (row) => <StateCell label={row.workflow_state_label} /> },
              { key: "aging", header: "Aging", render: (row) => agingLabel(row.modified) || "—" },
            ]}
          />
        )}
        {requests.data && (
          <TableFooter from={total ? filters.start + 1 : 0} to={filters.start + shown} total={total}>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous page"
                className="rounded-md p-1.5 text-slate-500 hover:bg-ims-bg disabled:opacity-40"
                disabled={filters.start === 0}
                onClick={() => goTo(Math.max(0, filters.start - PAGE_LENGTH))}
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
                onClick={() => goTo(filters.start + PAGE_LENGTH)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </TableFooter>
        )}
      </div>
    </section>
  );
}
