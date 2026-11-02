import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  card?: boolean;
  /** Shown top-right on mobile cards instead of in the label grid. */
  badge?: boolean;
}

function isExternalHref(path: string) {
  return /^https?:\/\//i.test(path) || path.startsWith("/app/");
}

export function DataTable<T extends { name: string }>({
  rows,
  columns,
  href,
  onRowOpen,
  emptyTitle,
  emptyBody,
  actions,
  actionsHeader = "Action",
}: {
  rows: T[];
  columns: TableColumn<T>[];
  href?: (row: T) => string;
  /** In-page open (dialog) instead of routing when href is omitted. */
  onRowOpen?: (row: T) => void;
  emptyTitle: string;
  emptyBody: string;
  /** Buttons or links per row, kept outside the row link so they stay clickable on mobile cards. */
  actions?: (row: T) => ReactNode;
  actionsHeader?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} body={emptyBody} />;
  const [first, ...rest] = columns;
  const badge = rest.find((column) => column.badge);
  const cardFields = rest.filter((column) => column.card !== false && column !== badge);

  function primaryCell(row: T, content: ReactNode) {
    if (onRowOpen) {
      return (
        <button type="button" className="ims-link whitespace-nowrap text-left" onClick={() => onRowOpen(row)}>
          {content}
        </button>
      );
    }
    if (!href) return <span className="whitespace-nowrap font-medium text-ims-ink">{content}</span>;
    const path = href(row);
    if (isExternalHref(path)) {
      return (
        <a href={path} target="_blank" rel="noopener noreferrer" className="ims-link whitespace-nowrap">
          {content}
        </a>
      );
    }
    return (
      <Link to={path} className="ims-link whitespace-nowrap">
        {content}
      </Link>
    );
  }

  function cardBody(row: T) {
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-[15px] font-semibold text-ims-ink">{first.render(row)}</p>
          {badge && <div className="flex min-w-0 max-w-[55%] justify-end">{badge.render(row)}</div>}
        </div>
        {cardFields.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {cardFields.map((column) => (
              <div key={column.key} className="min-w-0">
                <dt className="text-[11px] text-slate-500">{column.header}</dt>
                <dd className="truncate text-[13px] font-medium text-ims-ink">{column.render(row)}</dd>
              </div>
            ))}
          </dl>
        )}
      </>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-ims-thead text-[13px] text-ims-ink">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-5 py-3.5 font-semibold">
                  {column.header}
                </th>
              ))}
              {actions && <th className="whitespace-nowrap px-5 py-3.5 font-semibold">{actionsHeader}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-[#edf0f7] last:border-b-0 hover:bg-[#f8f9ff]">
                {columns.map((column, index) => (
                  <td key={column.key} className="px-5 py-3.5 align-middle text-slate-700">
                    {index === 0 ? primaryCell(row, column.render(row)) : column.render(row)}
                  </td>
                ))}
                {actions && <td className="px-5 py-3.5 align-middle">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {rows.map((row) => {
          const body = cardBody(row);
          let card: ReactNode;
          if (onRowOpen) {
            card = (
              <button type="button" className="block w-full text-left" onClick={() => onRowOpen(row)}>
                {body}
              </button>
            );
          } else if (href) {
            const path = href(row);
            card = isExternalHref(path) ? (
              <a href={path} target="_blank" rel="noopener noreferrer" className="block no-underline">
                {body}
              </a>
            ) : (
              <Link to={path} className="block no-underline">
                {body}
              </Link>
            );
          } else {
            card = body;
          }
          if (!actions) {
            return (
              <div key={row.name} className="ims-card min-w-0 p-4">
                {card}
              </div>
            );
          }
          return (
            <div key={row.name} className="ims-card min-w-0 p-4">
              {card}
              <div className="mt-3 border-t border-[#edf0f7] pt-3">{actions(row)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function StateCell({ label }: { label: string }) {
  return <StatusBadge label={label} />;
}

export function TableFooter({ from, to, total, children }: { from: number; to: number; total: number; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f7] px-5 py-3 text-xs text-slate-500">
      <span>{total > 0 ? `Showing ${from}-${to} from ${total}` : "No records"}</span>
      {children}
    </div>
  );
}
