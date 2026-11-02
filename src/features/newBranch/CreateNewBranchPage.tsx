import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createNewBranch, getNewBranchCreateOptions } from "@/api/newBranch";
import { queryKeys } from "@/api/keys";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { documentPath } from "@/lib/documentPath";
import { zoneForMasterRegion } from "@/lib/regionZoneMap";
import { useToasts } from "@/stores/session";
import { ApiError } from "@/types/api";

const DOCTYPE = "New Branch Details";

export function CreateNewBranchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const push = useToasts((state) => state.push);
  const prefProduct = (params.get("product") || "").trim();
  const prefZone = (params.get("zone") || "").trim();
  const prefRegion = (params.get("region") || "").trim();
  const resolvedPrefZone = prefZone || zoneForMasterRegion(prefRegion) || "";

  const [productLine, setProductLine] = useState(prefProduct);
  const [year, setYear] = useState("");
  const [zone, setZone] = useState(resolvedPrefZone);
  const [region, setRegion] = useState(prefRegion);
  const [area, setArea] = useState("");
  const [location, setLocation] = useState("");
  const [viaLeadRequest, setViaLeadRequest] = useState(false);
  const appliedProduct = useRef(false);
  const appliedZone = useRef(false);
  const appliedRegion = useRef(false);

  const options = useQuery({
    queryKey: queryKeys.newBranchOptions({ product_line: productLine, zone, region }),
    queryFn: () => getNewBranchCreateOptions({ product_line: productLine, zone, region }),
  });

  useEffect(() => {
    const data = options.data;
    if (!data) return;

    if (!appliedProduct.current) {
      if (prefProduct && data.product_lines.includes(prefProduct)) {
        setProductLine(prefProduct);
        appliedProduct.current = true;
      } else if (!prefProduct && data.product_lines.length === 1) {
        setProductLine(data.product_lines[0]);
        appliedProduct.current = true;
      } else if (productLine && data.product_lines.includes(productLine)) {
        appliedProduct.current = true;
      }
    }

    if (year && !data.years.includes(year)) setYear("");
    if (area && !data.areas.includes(area)) setArea("");

    if (zone && data.zones.length > 0 && !data.zones.includes(zone) && !resolvedPrefZone) {
      setZone("");
    }
    if (region && data.regions.length > 0 && !data.regions.includes(region) && !prefRegion) {
      setRegion("");
    }

    if (!appliedZone.current && resolvedPrefZone && data.zones.includes(resolvedPrefZone)) {
      setZone(resolvedPrefZone);
      appliedZone.current = true;
    }
    if (!appliedRegion.current && prefRegion && data.regions.includes(prefRegion)) {
      setRegion(prefRegion);
      appliedRegion.current = true;
    }
  }, [options.data, year, zone, region, area, productLine, prefProduct, prefRegion, resolvedPrefZone]);

  const create = useMutation({
    mutationFn: () =>
      createNewBranch({
        product_line: productLine,
        year,
        zone,
        region,
        area,
        location_details: location.trim(),
        lead_competition: viaLeadRequest ? 1 : 0,
      }),
    onSuccess: (payload) => {
      push("New Branch request created.", "success");
      navigate(documentPath(DOCTYPE, payload.summary.name));
    },
    onError: (error) => {
      push(error instanceof ApiError ? error.message : "The request could not be created.", "error");
    },
  });

  if (options.isLoading && !options.data) return <SkeletonBlock className="h-80" />;
  if (options.isError || !options.data) {
    return (
      <EmptyState
        title="Create is unavailable"
        body={options.error instanceof ApiError ? options.error.message : "Only Business Team can create a New Branch request."}
      />
    );
  }

  const ready = productLine && year && zone && region && area && location.trim();
  const fromRegionCard = Boolean(resolvedPrefZone || prefRegion);
  const toOptions = (items: string[]) => items.map((item) => ({ value: item, label: item }));

  return (
    <section className="ims-card p-4 sm:p-5">
      <Link to="/new-branch" className="text-xs font-medium text-ims-primary no-underline">
        ← New Branch
      </Link>
      <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-ims-ink">Create New Branch request</h1>
      <p className="mt-1 text-sm text-slate-600">
        Same masters as Desk. Leave “Select via Lead Request” off to raise a Proposed Branch on Submit, or turn it on so
        Lead Requests compete and one PBD is created on Lead Approve.
      </p>
      {fromRegionCard && (
        <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Prefilling from region card
          {resolvedPrefZone ? ` — Zone: ${resolvedPrefZone}` : ""}
          {prefRegion ? `, Region: ${prefRegion}` : ""}. Confirm year, area and location, then create.
        </p>
      )}
      {options.data.product_lines.length === 0 && (
        <p className="mt-3 text-sm text-amber-800">No product line is mapped to your user in Infra User Based Role Master.</p>
      )}
      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) void create.mutateAsync();
        }}
      >
        <label className="block space-y-1.5 text-sm">
          <span>Product line</span>
          <FieldSelect
            value={productLine}
            required
            placeholder="Select"
            options={toOptions(options.data.product_lines)}
            onChange={(next) => {
              setProductLine(next);
              setYear("");
              setZone("");
              setRegion("");
              setArea("");
            }}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Year</span>
          <FieldSelect
            value={year}
            required
            disabled={!productLine}
            placeholder={productLine && options.data.years.length === 0 ? "No quota remaining" : "Select"}
            emptyMessage="No quota remaining"
            options={toOptions(options.data.years)}
            onChange={setYear}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Zone</span>
          <FieldSelect
            value={zone}
            required
            disabled={!productLine}
            placeholder="Select"
            options={toOptions(options.data.zones)}
            onChange={(next) => {
              setZone(next);
              setRegion("");
              setArea("");
            }}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Region</span>
          <FieldSelect
            value={region}
            required
            disabled={!zone}
            placeholder="Select"
            options={toOptions(options.data.regions)}
            onChange={(next) => {
              setRegion(next);
              setArea("");
            }}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Area</span>
          <FieldSelect
            value={area}
            required
            disabled={!region}
            placeholder="Select"
            options={toOptions(options.data.areas)}
            onChange={setArea}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Location details</span>
          <input
            className="ims-field"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
          />
        </label>
        <label className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-ims-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-ims-primary"
            checked={viaLeadRequest}
            onChange={(event) => setViaLeadRequest(event.target.checked)}
          />
          <span>
            <span className="font-semibold">Select via Lead Request</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-600">
              When enabled, Submit uses MIS quota but does not create a Proposed Branch. One PBD is created when a Lead
              Request is Approved.
            </span>
          </span>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={!ready || create.isPending}
            className="ims-btn-primary disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create request"}
          </button>
        </div>
      </form>
    </section>
  );
}
