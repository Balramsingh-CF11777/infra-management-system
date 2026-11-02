import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { DashboardRegionCard } from "@/lib/businessTeamRegions";
import { RegionCircle, regionArt } from "@/features/dashboard/regionArt";

/** Mobile: 2 rows (2×2 = 4). Tablet/desktop: 1 row (3 / 4 cards). */
function usePageSize() {
  const [pageSize, setPageSize] = useState(4);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia("(min-width: 1280px)").matches) setPageSize(4); // 1×4
      else if (window.matchMedia("(min-width: 768px)").matches) setPageSize(3); // 1×3
      else setPageSize(4); // 2×2
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return pageSize;
}

function RegionCard({ region }: { region: DashboardRegionCard }) {
  const body = (
    /* Mobile: taller card for title room. sm+: original 380/270. Image stays bottom-aligned at 380/270. */
    <div className="relative w-full aspect-[380/340] sm:aspect-[380/270]">
      <RegionCircle />
      {/* Same image size/position — bottom-right 380×270 box */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] w-full"
        style={{ aspectRatio: "380 / 270" }}
      >
        {regionArt(region.id)}
      </div>
      {/* Smaller type on mobile; sits in the extra height above the art */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-[2] bg-transparent px-2 pt-2 sm:px-3.5 sm:pt-3.5 ${region.canCreate ? "pr-9 sm:pr-11" : ""}`}
      >
        <div className="min-w-0 max-w-[calc(100%-2.5rem)] sm:w-[55%] sm:max-w-[11.5rem]">
          <p className="truncate whitespace-nowrap text-[11px] font-semibold leading-none text-ims-ink sm:text-[15px] sm:leading-tight sm:whitespace-normal sm:overflow-visible">
            {region.label}
          </p>
          <p className="mt-0.5 truncate whitespace-nowrap text-[9px] leading-none text-slate-600 sm:mt-1 sm:text-[12px] sm:leading-snug sm:whitespace-normal sm:overflow-visible">
            {region.zone ? `${region.zone} · ` : ""}
            {region.areas} Areas · {region.properties} {region.properties === 1 ? "Property" : "Properties"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ims-card relative flex h-full min-h-0 flex-col overflow-hidden transition-shadow hover:shadow-[0_10px_26px_rgba(31,37,71,0.1)]">
      {region.canCreate && (
        <Link
          to={region.href}
          aria-label={`Create New Branch for ${region.label}`}
          title="Create New Branch"
          className="absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-ims-primary text-white shadow-sm no-underline transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      )}
      {region.canCreate ? (
        <div className="relative flex flex-1 flex-col">{body}</div>
      ) : (
        <Link to={region.href} className="relative flex flex-1 flex-col no-underline">
          {body}
        </Link>
      )}
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}

export function RegionCardsSection({
  regionCards,
  isBusinessTeam,
}: {
  regionCards: DashboardRegionCard[];
  isBusinessTeam: boolean;
}) {
  const pageSize = usePageSize();
  const [query, setQuery] = useState("");
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const normalized = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalized) return [];
    return regionCards
      .filter((region) => `${region.label} ${region.zone || ""}`.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [regionCards, normalized]);

  const filtered = useMemo(() => {
    if (!normalized) return regionCards;
    return regionCards.filter((region) => `${region.label} ${region.zone || ""}`.toLowerCase().includes(normalized));
  }, [regionCards, normalized]);

  const slides = useMemo(() => chunk(filtered, pageSize), [filtered, pageSize]);
  const pageCount = slides.length;
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage(0);
  }, [normalized, pageSize]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setOpenSuggestions(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickSuggestion(region: DashboardRegionCard) {
    setQuery(region.label);
    setOpenSuggestions(false);
    setPage(0);
  }

  function go(delta: number) {
    setPage((current) => Math.min(pageCount - 1, Math.max(0, current + delta)));
  }

  return (
    <section className="order-1 lg:order-none">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-semibold text-ims-ink lg:text-[17px] lg:font-medium">Properties by Region</h2>
        <div ref={searchRef} className="relative w-full sm:max-w-xs">
          <label htmlFor="region-search" className="sr-only">
            Search states
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="region-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpenSuggestions(true);
            }}
            onFocus={() => setOpenSuggestions(true)}
            placeholder="Search state…"
            autoComplete="off"
            className="ims-field w-full pl-9"
          />
          {openSuggestions && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-ims-line bg-white py-1 shadow-[0_10px_26px_rgba(31,37,71,0.12)]"
            >
              {suggestions.map((region) => (
                <li key={region.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ims-ink hover:bg-ims-drawer"
                    onClick={() => pickSuggestion(region)}
                  >
                    <span className="font-medium">{region.label}</span>
                    {region.zone ? <span className="text-xs text-slate-500">{region.zone}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isBusinessTeam && (
        <p className="mb-3 text-sm text-slate-600">
          Regions for your product line. Use <span className="font-medium text-ims-ink">+</span> on a card to create a New
          Branch (Zone autofills East / West / North / South).
        </p>
      )}

      <div className="relative px-0 sm:px-1">
        <div
          className="overflow-hidden"
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current == null) return;
            const dx = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) < 48) return;
            go(dx < 0 ? 1 : -1);
          }}
        >
          <div
            className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={{ transform: `translateX(-${safePage * 100}%)` }}
          >
            {slides.map((slide, slideIndex) => (
              <div
                key={slideIndex}
                className="grid w-full shrink-0 grid-cols-2 grid-rows-2 gap-3 md:grid-cols-3 md:grid-rows-1 xl:grid-cols-4"
                aria-hidden={slideIndex !== safePage}
              >
                {slide.map((region) => (
                  <RegionCard key={region.id} region={region} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous regions"
              disabled={safePage <= 0}
              onClick={() => go(-1)}
              className="absolute left-0 top-1/2 z-10 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ims-line bg-white/95 text-ims-ink shadow-[0_8px_20px_rgba(31,37,71,0.12)] backdrop-blur transition hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next regions"
              disabled={safePage >= pageCount - 1}
              onClick={() => go(1)}
              className="absolute right-0 top-1/2 z-10 inline-flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ims-line bg-white/95 text-ims-ink shadow-[0_8px_20px_rgba(31,37,71,0.12)] backdrop-blur transition hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Region pages">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === safePage}
              aria-label={`Go to page ${index + 1}`}
              onClick={() => setPage(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === safePage ? "w-5 bg-ims-primary" : "w-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}

      {isBusinessTeam && regionCards.length === 0 && (
        <p className="mt-3 text-sm text-amber-800">
          No regions for your product line yet. Role Master assigns the product line; zones/regions come from Regional
          Details (East / West / North / South).
        </p>
      )}

      {regionCards.length > 0 && filtered.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">No states match “{query.trim()}”.</p>
      )}
    </section>
  );
}
