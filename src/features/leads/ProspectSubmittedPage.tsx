import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { getProspect } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { ApiError } from "@/types/api";
import { BackButton } from "@/components/common/BackButton";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { CREATE_LEAD_CHECKS, captureChecksFrom } from "@/features/leads/CreateLeadCapture";

function placeTitle(location: string) {
  const label = location.trim();
  if (!label) return "Property Lead";
  return label.toLowerCase().includes("branch") ? label : `${label} Branch`;
}

export function ProspectSubmittedPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const prospectQuery = useQuery({
    queryKey: queryKeys.leadProspect(name),
    queryFn: () => getProspect(name),
    enabled: Boolean(name),
  });

  if (prospectQuery.isLoading) return <SkeletonBlock className="h-64" />;
  if (prospectQuery.isError || !prospectQuery.data) {
    return (
      <p className="text-sm text-rose-600">
        {prospectQuery.error instanceof ApiError
          ? prospectQuery.error.message
          : "This submitted lead could not be loaded."}
      </p>
    );
  }

  const row = prospectQuery.data;
  const location = String(row.location_details || "").trim();
  const propertyId = String(row.property_id || row.name || "").trim();
  const direction = String(row.main_entrance_direction || "").trim();
  const address = String(row.geo_location || row.complete_address_of_the_property || "").trim();
  const lat = String(row.geo_latitude || "").trim();
  const lng = String(row.geo_longitude || "").trim();
  const mapHref = lat && lng ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}` : "";
  const checks = captureChecksFrom(row.shortlisting_checklist);
  const converted = Boolean(row.converted_lead) || row.status === "Converted";
  const photos = (row.additional_attachment || []).filter(
    (item) => item.document_type && item.document_attachment,
  );

  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="mb-4 flex items-center gap-3">
        <BackButton
          fallback="/chola360/leads"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line"
        />
        <h1 className="min-w-0 truncate text-[17px] font-semibold text-ims-ink md:text-[20px]">
          {placeTitle(location)}
        </h1>
      </div>

      <div className="space-y-3">
        <article className="rounded-2xl border border-[#D6E3F0] bg-white p-4 shadow-[0_4px_14px_rgba(31,37,71,0.04)] sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#5940b6]">Submitted Details</h2>
          <dl className="mt-3 divide-y divide-[#eef2f8]">
            <DetailRow label="Branch" value={location || "—"} />
            <DetailRow label="Property ID" value={propertyId || "—"} />
            <DetailRow label="Direction" value={direction || "—"} />
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Location</dt>
              <dd className="min-w-0 max-w-[65%] text-right text-sm font-medium text-[#2F6FED]">
                {mapHref ? (
                  <a href={mapHref} target="_blank" rel="noreferrer" className="underline decoration-[#2F6FED]/50 underline-offset-2">
                    {address || `${lat}, ${lng}`}
                  </a>
                ) : (
                  <span className="text-ims-ink">{address || "—"}</span>
                )}
              </dd>
            </div>
          </dl>
        </article>

        {photos.length ? (
          <article className="rounded-2xl border border-[#D6E3F0] bg-white p-4 shadow-[0_4px_14px_rgba(31,37,71,0.04)] sm:p-5">
            <h2 className="text-[15px] font-semibold text-[#5940b6]">Site Images</h2>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((item) => (
                <li key={`${item.document_type}-${item.document_attachment}`} className="overflow-hidden rounded-xl border border-[#dde5f2]">
                  <img
                    src={String(item.document_attachment)}
                    alt={String(item.document_type || "Site photo")}
                    className="aspect-square w-full object-cover"
                  />
                  <p className="truncate px-1.5 py-1 text-[10px] text-slate-500">{item.document_type}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        <article className="rounded-2xl border border-[#D6E3F0] bg-white p-4 shadow-[0_4px_14px_rgba(31,37,71,0.04)] sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#5940b6]">Checklist</h2>
          <ul className="mt-2 divide-y divide-[#eef2f8]">
            {CREATE_LEAD_CHECKS.map((label) => (
              <li key={label} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-ims-ink">{label}</span>
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    checks[label] ? "bg-[#1F9D55] text-white" : "bg-slate-100 text-slate-300"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </li>
            ))}
          </ul>
        </article>

        {converted && row.converted_lead ? (
          <Link
            to={`/chola360/leads/${encodeURIComponent(String(row.converted_lead))}/approval`}
            className="ims-btn-primary w-full no-underline"
          >
            Open Lead Request
          </Link>
        ) : (
          <Link
            to={`/chola360/prospects/${encodeURIComponent(name)}/checkpoints`}
            className="ims-btn-primary w-full no-underline"
          >
            Edit Property Lead
          </Link>
        )}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 max-w-[65%] truncate text-right text-sm font-semibold text-ims-ink">{value}</dd>
    </div>
  );
}
