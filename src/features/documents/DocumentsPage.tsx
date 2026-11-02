import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, NavLink, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDocumentTypes } from "@/api/documents";
import { getRecordList } from "@/api/records";
import { queryKeys } from "@/api/keys";
import { DataTable, StateCell } from "@/components/tables/DataTable";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { agingLabel } from "@/lib/format";
import { documentPath } from "@/lib/documentPath";
import { ApiError, type DocumentListRow } from "@/types/api";

const PAGE = 20;

export function DocumentsPage() {
  const { doctype: encoded } = useParams();
  const doctype = encoded ? decodeURIComponent(encoded) : "";
  const types = useQuery({ queryKey: queryKeys.documentTypes, queryFn: getDocumentTypes });

  if (types.isLoading) return <SkeletonBlock className="h-64" />;
  const items = types.data?.items ?? [];
  if (items.length === 0) {
    return <EmptyState title="No records available" body="Your roles do not give read access to any Infra Management records." />;
  }
  if (!doctype || !items.some((item) => item.doctype === doctype)) {
    return <Navigate to={`/documents/${encodeURIComponent(items[0].doctype)}`} replace />;
  }
  const current = items.find((item) => item.doctype === doctype)!;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ims-ink">Records</h1>
          <p className="text-sm text-slate-600">Only the record types and rows your Frappe roles allow are listed.</p>
        </div>
        {current.can_create && current.doctype === "New Branch Details" && (
          <Link
            to="/new-branch/new"
            className="ims-btn-primary no-underline"
          >
            Create request
          </Link>
        )}
      </div>
      <nav className="scroll-row -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0" aria-label="Record types">
        {items.map((item) => (
          <NavLink
            key={item.doctype}
            to={`/documents/${encodeURIComponent(item.doctype)}`}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                isActive ? "bg-ims-drawer text-ims-ink ring-1 ring-ims-field-line" : "bg-white text-slate-600 ring-1 ring-ims-line hover:text-ims-ink"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <DocumentListView key={doctype} doctype={doctype} states={current.states} />
    </section>
  );
}

function DocumentListView({ doctype, states }: { doctype: string; states: string[] }) {
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
    queryKey: queryKeys.documentList(doctype, filters),
    queryFn: () => getRecordList(doctype, filters),
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "start") next.delete("start");
    setParams(next);
  }

  function applySearch(event: FormEvent) {
    event.preventDefault();
    update("q", search.trim());
  }

  const columns = list.data?.columns ?? [];
  return (
    <>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={applySearch}>
        <label className="sr-only" htmlFor="document-search">
          Search
        </label>
        <input
          id="document-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by ID or listed fields"
          className="ims-field"
        />
        {states.length > 0 && (
          <select
            aria-label="Filter by stage"
            value={filters.workflow_state ?? ""}
            onChange={(event) => update("state", event.target.value)}
            className="ims-field sm:max-w-xs"
          >
            <option value="">All stages</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="ims-btn-primary">
          Search
        </button>
      </form>
      {list.isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : list.isError ? (
        <EmptyState title="Records unavailable" body={list.error instanceof ApiError ? list.error.message : "The list could not be loaded."} />
      ) : (
        <div className="ims-card overflow-hidden">
          <DataTable<DocumentListRow>
            rows={list.data?.items ?? []}
            emptyTitle="No records found"
            emptyBody="Try another search or stage."
            href={(row) => documentPath(doctype, row.name)}
            columns={[
              { key: "name", header: "ID", render: (row) => row.name },
              ...columns.slice(0, 4).map((column) => ({
                key: column.fieldname,
                header: column.label,
                render: (row: DocumentListRow) => {
                  const value = row[column.fieldname];
                  return value === null || value === undefined || value === "" ? "—" : String(value);
                },
              })),
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
    </>
  );
}
