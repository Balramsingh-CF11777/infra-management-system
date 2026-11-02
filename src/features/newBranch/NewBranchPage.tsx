import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecordList } from "@/api/records";
import { queryKeys } from "@/api/keys";
import { DataTable, StateCell } from "@/components/tables/DataTable";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { agingLabel } from "@/lib/format";
import { documentPath } from "@/lib/documentPath";
import { useSession } from "@/stores/session";
import { ApiError, type DocumentListRow } from "@/types/api";

const DOCTYPE = "New Branch Details";
const PAGE = 20;

export function NewBranchPage() {
  const canCreate = useSession((state) => state.user?.permissions.can_create_new_branch);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const filters = useMemo(
    () => ({
      search: params.get("q") || undefined,
      workflow_state: params.get("state") || undefined,
      start: Number(params.get("start") || 0),
      page_length: PAGE,
    }),
    [params],
  );
  const list = useQuery({
    queryKey: queryKeys.documentList(DOCTYPE, filters),
    queryFn: () => getRecordList(DOCTYPE, filters),
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "start") next.delete("start");
    setParams(next);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ims-ink">New Branch</h1>
          <p className="mt-1 text-sm text-slate-600">
            Business Team creates New Branch Details here. Submit on the request to generate a Proposed Branch.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/new-branch/new"
            className="ims-btn-primary no-underline"
          >
            Create request
          </Link>
        )}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          update("q", search.trim());
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by ID or location"
          className="ims-field"
        />
        <button type="submit" className="ims-btn-primary">
          Search
        </button>
      </form>
      {list.isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : list.isError ? (
        <EmptyState
          title="Requests unavailable"
          body={list.error instanceof ApiError ? list.error.message : "The list could not be loaded."}
        />
      ) : (
        <div className="ims-card overflow-hidden">
          <DataTable<DocumentListRow>
            rows={list.data?.items ?? []}
            emptyTitle="No New Branch requests"
            emptyBody={canCreate ? "Create a request to start a proposed branch." : "No New Branch Details records were returned for your roles."}
            href={(row) => documentPath(DOCTYPE, row.name)}
            columns={[
              { key: "name", header: "ID", render: (row) => row.name },
              { key: "product_line", header: "Product line", render: (row) => String(row.product_line || "—") },
              { key: "location", header: "Location", render: (row) => String(row.location_details || "—") },
              { key: "zone", header: "Zone", render: (row) => String(row.zone || "—") },
              {
                key: "state",
                header: "Stage",
                render: (row) => (row.workflow_state ? <StateCell label={row.workflow_state_label || row.workflow_state} /> : "—"),
              },
              { key: "aging", header: "Updated", render: (row) => agingLabel(row.modified) || "—" },
            ]}
          />
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span>{list.data ? `${list.data.total} records` : ""}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 disabled:opacity-40"
            disabled={filters.start === 0}
            onClick={() => update("start", String(Math.max(0, filters.start - PAGE)))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 disabled:opacity-40"
            disabled={!list.data || filters.start + PAGE >= list.data.total}
            onClick={() => update("start", String(filters.start + PAGE))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
