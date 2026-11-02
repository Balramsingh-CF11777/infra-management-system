import { CheckCircle2, Eye } from "lucide-react";
import { DataTable, StateCell } from "@/components/tables/DataTable";
import { formatWhen } from "@/lib/format";
import type { FinancialYearChoice, MisRequestRow } from "@/types/api";
import { MIS_APPROVER } from "@/features/mis/constants";

export const FY_CHOICES: FinancialYearChoice[] = ["all", "current", "last"];
export const FY_FALLBACK_LABELS: Record<FinancialYearChoice, string> = {
  all: "All",
  current: "Current Year",
  last: "Last Year",
};

export function FinancialYearFilter({
  value,
  options,
  onChange,
}: {
  value: FinancialYearChoice;
  options: Array<{ id: FinancialYearChoice; label: string; range: string }>;
  onChange: (value: FinancialYearChoice) => void;
}) {
  const items = options.length ? options : FY_CHOICES.map((id) => ({ id, label: FY_FALLBACK_LABELS[id], range: "" }));
  return (
    <div role="radiogroup" aria-label="Financial year" className="grid grid-cols-3 gap-1 rounded-xl border border-ims-line bg-white p-1 sm:inline-grid sm:w-auto">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            className={`min-h-10 rounded-lg px-3 py-1.5 text-center text-[13px] font-medium leading-tight transition-colors sm:px-4 ${
              active ? "bg-ims-primary text-white shadow-sm" : "text-slate-600 hover:bg-ims-bg"
            }`}
          >
            <span className="block">{item.label}</span>
            {item.range && <span className={`block text-[11px] ${active ? "text-white/80" : "text-slate-400"}`}>{item.range}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function misListPath(params: { fy?: FinancialYearChoice; status?: "all" | "in_progress"; q?: string; state?: string; product?: string }) {
  const next = new URLSearchParams();
  if (params.fy && params.fy !== "current") next.set("fy", params.fy);
  if (params.status === "in_progress") next.set("status", "in_progress");
  if (params.q) next.set("q", params.q);
  if (params.state) next.set("state", params.state);
  if (params.product) next.set("product", params.product);
  const query = next.toString();
  return query ? `/mis/requests?${query}` : "/mis/requests";
}

export function MisRequestTable({
  rows,
  emptyTitle,
  emptyBody,
  branchCountLabel,
  isApprover,
  onAction,
  onView,
  fetching,
  /** Draft lists only the current user's own requests — omit redundant owner/state columns. */
  draftColumns = false,
}: {
  rows: MisRequestRow[];
  emptyTitle: string;
  emptyBody: string;
  branchCountLabel: string;
  isApprover: boolean;
  onAction: (row: MisRequestRow) => void;
  /** Open request details in-page via API (no Desk / portal route). */
  onView: (row: MisRequestRow) => void;
  fetching?: boolean;
  draftColumns?: boolean;
}) {
  const columns = [
    { key: "name", header: "Request ID", render: (row: MisRequestRow) => row.name },
    { key: "product", header: "Product Line", render: (row: MisRequestRow) => row.product_line || "—" },
    { key: "year", header: "Financial Year", render: (row: MisRequestRow) => row.year || "—" },
    {
      key: "branches",
      header: branchCountLabel || "Number of Branches",
      render: (row: MisRequestRow) => (row.branches_requested === null || row.branches_requested === "" ? "—" : String(row.branches_requested)),
    },
    ...(draftColumns
      ? []
      : [
          { key: "owner", header: "Initiated By", render: (row: MisRequestRow) => row.owner_name || row.owner },
          {
            key: "state",
            header: "Current Workflow State",
            badge: true as const,
            render: (row: MisRequestRow) => (row.workflow_state_label ? <StateCell label={row.workflow_state_label} /> : "—"),
          },
        ]),
    { key: "created", header: "Initiated Date", render: (row: MisRequestRow) => formatWhen(row.creation) },
  ];
  return (
    <div className={fetching ? "opacity-60 transition-opacity" : undefined}>
      <DataTable<MisRequestRow>
        rows={rows}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
        onRowOpen={onView}
        columns={columns}
        actions={(row) => (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ims-btn-secondary min-h-9 px-3 py-1.5 text-sm" onClick={() => onView(row)}>
              <Eye className="h-4 w-4" />
              View
            </button>
            {row.actions.length > 0 && (
              <button type="button" className="ims-btn-primary min-h-9 px-3 py-1.5 text-sm" onClick={() => onAction(row)}>
                <CheckCircle2 className="h-4 w-4" />
                {isApprover ? "Approve" : row.actions.length === 1 ? row.actions[0] : "Actions"}
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}

export function matchesMisSearch(row: MisRequestRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.product_line, row.year, row.owner_name, row.owner, row.workflow_state_label]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function sortMisByNewest(rows: MisRequestRow[]) {
  return [...rows].sort((a, b) => String(b.creation || "").localeCompare(String(a.creation || "")));
}

export function isMisApprover(roles: string[] | undefined) {
  return Boolean(roles?.includes(MIS_APPROVER));
}
