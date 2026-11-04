import designSketchArt from "@/assets/design/ChatGPT Image Sep 1, 2026, 05_39_30 PM 3 (2).png";
import cadConsentArt from "@/assets/design/ChatGPT Image Sep 1, 2026, 06_18_15 PM 1 (1).png";
import llAgreementArt from "@/assets/design/ChatGPT Image Sep 1, 2026, 06_59_39 PM 1 (1).png";
import siteVerificationArt from "@/assets/design/ChatGPT Image Sep 8, 2026, 11_15_18 AM 2 (1).png";
import shortlistingArt from "@/assets/design/ChatGPT Image Sep 16, 2026, 05_34_40 PM 2.png";
import leadCreationArt from "@/assets/design/ChatGPT Image Sep 23, 2026, 11_46_14 AM 1 (1).png";
import cholaBuildingCutout from "@/assets/design/Chola Branded Contemporary Building Cutout.png";
import infraReadinessArt from "@/assets/design/Modern Chola Bank Building Emblem.png";
import type { RibPipelineBucketId } from "@/features/leads/types";

export type RibPipelineArt = {
  src: string;
  /** Tailwind size / position tweaks per illustration crop */
  className?: string;
};

/** Stage illustrations for Regional Infra Business Partner Pipeline Overview. */
export const RIB_PIPELINE_ART: Record<RibPipelineBucketId, RibPipelineArt> = {
  lead_creation: {
    src: leadCreationArt,
    className: "h-[5.25rem] w-[5.25rem] sm:h-[6.5rem] sm:w-[6.5rem] md:h-[8.5rem] md:w-[8.5rem]",
  },
  site_verification: {
    src: siteVerificationArt,
    className: "h-[5.25rem] w-[5.25rem] sm:h-[6.5rem] sm:w-[6.5rem] md:h-[8.5rem] md:w-[8.5rem]",
  },
  design_sketch: {
    src: designSketchArt,
    className: "h-[5.75rem] w-[5.75rem] sm:h-[7.5rem] sm:w-[7.5rem] md:h-[10.5rem] md:w-[10.5rem]",
  },
  cad_consent: {
    src: cadConsentArt,
    className: "h-[5rem] w-[5rem] sm:h-[6.25rem] sm:w-[6.25rem] md:h-[8.25rem] md:w-[8.25rem]",
  },
  ll_agreement: {
    src: llAgreementArt,
    className: "h-[5rem] w-[5rem] sm:h-[6.25rem] sm:w-[6.25rem] md:h-[8.25rem] md:w-[8.25rem]",
  },
  infra_readiness: {
    src: infraReadinessArt,
    className: "h-[5.25rem] w-[5.25rem] sm:h-[6.5rem] sm:w-[6.5rem] md:h-[8.5rem] md:w-[8.5rem]",
  },
};

/** Extra cutouts available for other RIBP surfaces (empty states, task headers). */
export const RIB_EXTRA_ART = {
  shortlisting: shortlistingArt,
  cholaBuilding: cholaBuildingCutout,
} as const;

export const RIB_PIPELINE_LINKS: Record<RibPipelineBucketId, string> = {
  lead_creation: "/chola360/leads?pipeline=lead_creation",
  site_verification: "/chola360/leads?pipeline=site_verification",
  design_sketch: "/infra/requests?pipeline=design_sketch",
  cad_consent: "/infra/requests?pipeline=cad_consent",
  ll_agreement: "/infra/requests?pipeline=ll_agreement",
  infra_readiness: "/infra/requests?pipeline=infra_readiness",
};

export function ribPipelineArtFor(id: string): RibPipelineArt | null {
  if (id in RIB_PIPELINE_ART) return RIB_PIPELINE_ART[id as RibPipelineBucketId];
  return null;
}
