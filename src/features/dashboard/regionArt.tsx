import andhraTelanganaArt from "@/assets/design/region-andhra-telangana.png";
import biharArt from "@/assets/design/region-bihar.png";
import chhattisgarhArt from "@/assets/design/region-chhattisgarh.png";
import delhiArt from "@/assets/design/region-delhi.png";
import gujaratArt from "@/assets/design/region-gujarat.png";
import haryanaArt from "@/assets/design/region-haryana.png";
import jharkhandArt from "@/assets/design/region-jharkhand.png";
import karnatakaArt from "@/assets/design/region-karnataka.png";
import keralaArt from "@/assets/design/region-kerala.png";
import madhyaPradeshArt from "@/assets/design/region-madhya-pradesh.png";
import maharashtraArt from "@/assets/design/region-maharashtra.png";
import northEastArt from "@/assets/design/region-north-east.png";
import odishaArt from "@/assets/design/region-odisha.png";
import punjabHillsArt from "@/assets/design/region-punjab-hills.png";
import rajasthanArt from "@/assets/design/region-rajasthan.png";
import tamilNaduArt from "@/assets/design/region-tamilnadu.png";
import uttarPradeshArt from "@/assets/design/region-uttar-pradesh.png";
import uttarakhandArt from "@/assets/design/region-uttarakhand.png";
import westBengalArt from "@/assets/design/region-west-bengal.png";
import otherRegionArt from "@/assets/design/region-other.png";
import branchArt from "@/assets/design/stat-branch.webp";

const REGION_ART: Record<string, string> = {
  "andhra-telangana": andhraTelanganaArt,
  bihar: biharArt,
  chhattisgarh: chhattisgarhArt,
  delhi: delhiArt,
  gujarat: gujaratArt,
  haryana: haryanaArt,
  jharkhand: jharkhandArt,
  karnataka: karnatakaArt,
  kerala: keralaArt,
  "madhya-pradesh": madhyaPradeshArt,
  maharashtra: maharashtraArt,
  "north-east": northEastArt,
  odisha: odishaArt,
  "punjab-hills": punjabHillsArt,
  rajasthan: rajasthanArt,
  tamilnadu: tamilNaduArt,
  "uttar-pradesh": uttarPradeshArt,
  uttarakhand: uttarakhandArt,
  "west-bengal": westBengalArt,
  other: otherRegionArt,
};

/** Blue accent behind collage art (must stay below the image layer). */
export function RegionCircle() {
  return (
    <svg
      viewBox="0 0 380 340"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden
      preserveAspectRatio="xMinYMax meet"
    >
      <circle cx="70" cy="250" r="130" fill="#1f6fe0" />
    </svg>
  );
}

export function BranchArt() {
  return <img src={branchArt} alt="" className="h-14 w-20 shrink-0 object-contain" />;
}

const ART_IMG =
  "pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom object-right";

/** Full asset visible in the card (bottom-right). Unmatched regions use India heritage collage. */
export function regionArt(id: string) {
  const src = REGION_ART[id] ?? otherRegionArt;
  return <img src={src} alt="" className={ART_IMG} draggable={false} />;
}
