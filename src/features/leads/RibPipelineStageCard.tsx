import { Link } from "react-router-dom";
import { ribPipelineArtFor, RIB_PIPELINE_LINKS } from "@/features/leads/ribPipelineArt";
import type { RibPipelineBucket, RibPipelineBucketId } from "@/features/leads/types";

/** Prefer a clean two-line label on narrow cards instead of mid-word wraps. */
const MOBILE_LABEL: Partial<Record<RibPipelineBucketId, string>> = {
  lead_creation: "Lead\nCreation",
  site_verification: "Site\nVerification",
  design_sketch: "Design\nSketch",
  cad_consent: "CAD\nConsent",
  ll_agreement: "LL\nAgreement",
  infra_readiness: "Infra\nReadiness",
};

export function RibPipelineStageCard({
  bucket,
  active = false,
}: {
  bucket: RibPipelineBucket;
  active?: boolean;
}) {
  const art = ribPipelineArtFor(bucket.id);
  const to =
    (bucket.id in RIB_PIPELINE_LINKS
      ? RIB_PIPELINE_LINKS[bucket.id as RibPipelineBucketId]
      : null) || "/chola360/leads?list=1";
  const mobileLabel =
    (bucket.id in MOBILE_LABEL ? MOBILE_LABEL[bucket.id as RibPipelineBucketId] : null) || bucket.label;

  const lines = mobileLabel.split("\n").filter(Boolean);

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex h-full min-h-[104px] items-center overflow-hidden rounded-[22px] border bg-white px-3.5 py-3 no-underline shadow-[0_8px_18px_rgba(31,37,71,0.05)] transition-shadow hover:shadow-[0_12px_26px_rgba(31,37,71,0.1)] md:min-h-[118px] md:px-4 md:py-3.5",
        active ? "border-[#2f6fed] ring-1 ring-[#2f6fed]/35" : "border-ims-line",
      ].join(" ")}
    >
      <span className="relative z-[2] min-w-0 flex-1 pr-[4.5rem] sm:pr-[5.5rem] md:pr-[6.5rem]">
        <span className="block text-[13px] font-semibold leading-[1.15] text-ims-ink md:hidden">
          {lines.map((line) => (
            <span key={line} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
        <span className="hidden text-[15px] font-medium leading-snug text-ims-ink md:block">{bucket.label}</span>
        <span className="stat-card-value mt-2 block text-ims-ink">{bucket.count}</span>
      </span>
      {art ? (
        <img
          src={art.src}
          alt=""
          className={[
            "pointer-events-none absolute bottom-0 right-0 z-[1] object-contain object-bottom object-right transition-transform group-hover:scale-[1.03]",
            art.className || "h-[5.25rem] w-[5.25rem] md:h-[8.5rem] md:w-[8.5rem]",
          ].join(" ")}
        />
      ) : null}
    </Link>
  );
}
