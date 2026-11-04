import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { listProspects } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { ApiError } from "@/types/api";

export function SubmittedProspects() {
  const prospects = useQuery({
    queryKey: queryKeys.leadProspectList({ submitted: 1 }),
    queryFn: () => listProspects({ page_length: 20 }),
    staleTime: 15_000,
  });

  if (prospects.isLoading) {
    return <SkeletonBlock className="h-28" />;
  }

  if (prospects.isError) {
    return (
      <section className="ims-dash-panel p-4 sm:p-5">
        <h2 className="text-[17px] font-semibold text-ims-ink">Submitted Leads</h2>
        <p className="mt-2 text-sm text-rose-600">
          {prospects.error instanceof ApiError
            ? prospects.error.message
            : "Submitted leads could not be loaded."}
        </p>
      </section>
    );
  }

  const rows = prospects.data ?? [];
  if (!rows.length) return null;

  return (
    <section className="ims-dash-panel p-4 sm:p-5">
      <h2 className="text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">Submitted Leads</h2>
      <p className="mt-1 text-sm text-slate-500">
        Property leads saved for RIM review. Open one to see the details and checklist.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const place = String(row.location_details || row.property_id || row.name).trim();
          return (
            <li key={row.name}>
              <Link
                to={`/chola360/prospects/${encodeURIComponent(row.name)}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#D6E3F0] bg-white px-4 py-3 no-underline"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ims-ink">{place}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {row.property_id || row.name}
                    {row.status ? ` · ${row.status === "Draft" ? "Submitted" : row.status}` : ""}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
