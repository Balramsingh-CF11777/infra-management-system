import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { getLeadHome } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import type { LeadBranchGroup } from "@/features/leads/types";

/**
 * RIBP drill step: after clicking a geographic state card, list regions/areas
 * (Bengaluru, Mysuru, …) — not the raw Lead Request list.
 */
export function GeoStateRegionsPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const demo = params.get("demo") === "1";
  const geoState = (params.get("geo_state") || "").trim();

  const home = useQuery({
    queryKey: [...queryKeys.leadHome, demo ? "demo" : "live", "geo", geoState] as const,
    queryFn: () => getLeadHome({ demo }),
    enabled: Boolean(geoState),
  });

  const regions = useMemo(() => {
    const rows = home.data?.by_branch ?? [];
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const state = (row.geo_state || "").trim();
      // Keep only areas that belong to the opened state card.
      if (geoState && state !== geoState) return false;
      if (!normalized) return true;
      return `${row.branch} ${row.area || ""} ${row.region || ""}`.toLowerCase().includes(normalized);
    });
  }, [home.data, geoState, query]);

  if (!geoState) {
    return <EmptyState title="Region required" body="Open a state card from Property Leads first." />;
  }

  if (home.isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton className="ims-btn-ghost rounded-lg p-2" fallback="/chola360/leads" iconClassName="h-5 w-5" />
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold text-ims-ink md:text-[20px]">{geoState} Region</h1>
          <p className="text-xs text-slate-500">Regional Infra Business Partner · choose an area</p>
        </div>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="ims-field pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
        />
      </label>

      {regions.length === 0 ? (
        <EmptyState title="No areas in this region" body="Leads for this state will group here by area." />
      ) : (
        <ul className="space-y-3">
          {regions.map((row) => (
            <RegionCard key={row.branch} row={row} geoState={geoState} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RegionCard({ row, geoState }: { row: LeadBranchGroup; geoState: string }) {
  const params = new URLSearchParams();
  params.set("geo_state", geoState);
  if (row.area) params.set("area", row.area);
  else if (row.region) params.set("region", row.region);
  else params.set("branch", row.branch);

  return (
    <li>
      <Link
        to={`/chola360/leads?${params.toString()}`}
        className="flex items-center justify-between gap-3 rounded-2xl border border-ims-line bg-white px-4 py-4 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)]"
      >
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ims-ink">{row.branch}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {row.location_count || 1} {(row.location_count || 1) === 1 ? "Branch" : "Branches"} · {row.lead_count}{" "}
            {row.lead_count === 1 ? "Property" : "Properties"}
          </p>
        </div>
      </Link>
    </li>
  );
}
