import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import { listLeads } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import {
  applyLeadListFilters,
  countActiveLeadFilters,
  EMPTY_LEAD_FILTERS,
  LeadFilterButton,
  LeadFiltersPopup,
  type LeadListFilters,
} from "@/features/leads/LeadFiltersPanel";
import type { LeadSummary, LeadWorkflowState } from "@/features/leads/types";

const STATUS_ORDER: LeadWorkflowState[] = ["Approved", "Awaiting Approval", "Rejected", "Re-Work", "Draft", "On Hold"];

const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-[#DDF5E8] text-[#1F7A4D]",
  "Awaiting Approval": "bg-[#F8E4D4] text-[#8B4A1F]",
  Rejected: "bg-[#FDECEC] text-[#C0392B]",
  "Re-Work": "bg-[#F3EEFB] text-[#6B3FA0]",
  Draft: "bg-[#F1F5F9] text-[#475569]",
  "On Hold": "bg-[#FFF4E5] text-[#B45309]",
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function displayName(value?: string) {
  if (!value) return "—";
  const text = value.includes("@") ? value.split("@")[0] : value;
  return text.replace(/[._]/g, " ");
}

function addressOf(lead: LeadSummary) {
  return lead.complete_address_of_the_property || lead.geo_location || lead.location_details || "—";
}

export function BranchLeadListPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listFilters, setListFilters] = useState<LeadListFilters>(EMPTY_LEAD_FILTERS);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const demo = params.get("demo") === "1";
  const location = (params.get("location") || params.get("branch") || "").trim();
  const area = (params.get("area") || "").trim();
  const region = (params.get("region") || "").trim();
  const geoState = (params.get("geo_state") || "").trim();
  const stateFilter = (params.get("state") || "").trim(); // workflow status filter (Re-Work / Rejected / …)
  const listAll = params.get("list") === "1";

  const placeTitle = location || area || region || geoState;
  const title = placeTitle
    || (stateFilter ? `${stateFilter} Leads` : listAll ? "All Property Leads" : "Property Leads");
  const subtitle = stateFilter && !placeTitle
    ? `Filtered by status · ${stateFilter}`
    : stateFilter
      ? `${placeTitle} · ${stateFilter}`
      : listAll || !placeTitle
        ? "All property leads you can access"
        : "Property leads in this area";
  const backHref = geoState && (area || region || location)
    ? `/chola360/leads?geo_state=${encodeURIComponent(geoState)}`
    : "/chola360/leads";

  const leadsQuery = useQuery({
    queryKey: queryKeys.leadList({ location, area, region, geoState, state: stateFilter, demo }),
    queryFn: () =>
      listLeads({
        demo,
        location_details: location || undefined,
        area: area || undefined,
        region: region || undefined,
        geo_state: geoState || undefined,
        workflow_state: stateFilter || undefined,
      }),
  });

  const sourceRows = leadsQuery.data ?? [];
  const activeFilterCount = countActiveLeadFilters(listFilters);

  const filtered = useMemo(() => {
    const rows = applyLeadListFilters(sourceRows, listFilters);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.property_id, row.name, row.location_details, row.complete_address_of_the_property, row.workflow_state, row.approved_by]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [sourceRows, listFilters, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, LeadSummary[]>();
    for (const state of STATUS_ORDER) map.set(state, []);
    for (const row of filtered) {
      const key = STATUS_ORDER.includes(row.workflow_state as LeadWorkflowState)
        ? String(row.workflow_state)
        : "Draft";
      map.set(key, [...(map.get(key) || []), row]);
    }
    return STATUS_ORDER.map((state) => ({ state, rows: map.get(state) || [] })).filter((group) => group.rows.length);
  }, [filtered]);

  if (leadsQuery.isLoading) return <SkeletonBlock className="h-64" />;
  if (leadsQuery.isError) {
    return <EmptyState title="Leads unavailable" body="Could not load leads for this branch." />;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to={demo ? `${backHref}${backHref.includes("?") ? "&" : "?"}demo=1` : backHref}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line no-underline"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold text-ims-ink md:text-[20px]">
            {placeTitle ? `${title} Branch` : title}
          </h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="ims-field pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
            />
          </label>
          <div ref={filterAnchorRef} className="relative shrink-0">
            <LeadFilterButton
              activeCount={activeFilterCount}
              expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            />
            <LeadFiltersPopup
              open={filtersOpen}
              leads={sourceRows}
              value={listFilters}
              onApply={setListFilters}
              onClose={() => setFiltersOpen(false)}
              anchorRef={filterAnchorRef}
            />
          </div>
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            title={
              activeFilterCount
                ? "No matching leads"
                : stateFilter
                  ? `No ${stateFilter} leads`
                  : "No leads in this branch"
            }
            body={
              activeFilterCount
                ? "Try clearing filters or adjusting your search."
                : stateFilter
                  ? "No property leads match this status filter."
                  : "Create a property lead for this location to see it here."
            }
          />
        ) : (
          <div className="space-y-3">
            {grouped.flatMap((group) =>
              group.rows.map((lead) => <LeadStatusCard key={lead.name} lead={lead} />),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function emptyDash(value?: string) {
  if (!value || value === "—") return "-";
  return value;
}

function LeadStatusCard({ lead }: { lead: LeadSummary }) {
  const state = String(lead.workflow_state || "Draft");
  const style = STATUS_STYLE[state] || STATUS_STYLE.Draft;
  const isRejected = state === "Rejected";
  const isRework = state === "Re-Work";
  const isApproved = state === "Approved";
  const isAwaiting = state === "Awaiting Approval" || state === "On Hold";
  const placeName = lead.location_details || lead.area || lead.region || "Property";
  // submitted_on is set only on Submit/Resubmit — Draft shows Created On (initiated_date).
  const firstDateLabel = lead.submitted_on ? "Submitted On" : "Created On";
  const firstDateValue = lead.submitted_on || lead.initiated_date || lead.creation;
  const actorLabel = isRejected ? "Rejected By" : isRework ? "Request By" : isApproved ? "Approved By" : "Approver";
  const actorValue = isRejected ? lead.rejected_by : lead.approved_by;
  const secondDateLabel = isRejected ? "Rejected On" : isRework ? "Re-Work On" : "Approved On";
  const secondDateValue = isRejected
    ? lead.rejected_on
    : isApproved
      ? lead.approved_on
      : isRework
        ? lead.submitted_on
        : undefined;

  // Mockup: Awaiting → Submitted On | Approver | Approved On · Approved → Submitted On | Approved On | Approved By
  const col2Label = isAwaiting ? actorLabel : secondDateLabel;
  const col2Value = isAwaiting ? emptyDash(displayName(actorValue)) : emptyDash(formatDate(secondDateValue));
  const col3Label = isAwaiting ? secondDateLabel : actorLabel;
  const col3Value = isAwaiting ? emptyDash(formatDate(secondDateValue)) : emptyDash(displayName(actorValue));

  return (
    <Link
      to={`/chola360/leads/${encodeURIComponent(lead.name)}`}
      className="relative block overflow-hidden rounded-xl border border-[#D6E3F0] bg-white p-4 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)]"
    >
      <span
        className={`absolute right-0 top-0 max-w-[46%] truncate rounded-bl-xl px-3 py-1.5 text-[11px] font-semibold leading-tight ${style}`}
      >
        {state}
      </span>

      <div className="pr-[7.5rem]">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-ims-ink">{placeName}</h3>
        <p className="mt-1 text-[12px] text-slate-500">
          Property ID:{" "}
          <span className="font-semibold text-ims-ink">{lead.property_id || lead.name}</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{firstDateLabel}</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-ims-ink">
            {emptyDash(formatDate(firstDateValue))}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{col2Label}</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-ims-ink">{col2Value}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{col3Label}</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-ims-ink">{col3Value}</p>
        </div>
      </div>

      {isRework && lead.rework_comment ? (
        <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">{lead.rework_comment}</p>
      ) : null}

      <div className="mt-3 border-t border-dashed border-[#D6E3F0] pt-3">
        <p className="flex items-start gap-1.5 text-[12px]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span className="line-clamp-1 text-[#2F6FED] underline decoration-[#2F6FED]/60 underline-offset-2">
            {addressOf(lead)}
          </span>
        </p>
      </div>
    </Link>
  );
}
