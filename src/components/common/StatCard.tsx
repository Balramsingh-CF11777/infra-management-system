import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import propertiesArt from "@/assets/design/stat-properties.webp";
import reviewArt from "@/assets/design/stat-review.webp";
import reworkArt from "@/assets/design/stat-rework.webp";
import completedArt from "@/assets/design/stat-completed.webp";
import rejectedArt from "@/assets/design/stat-rejected.webp";
import slaArt from "@/assets/design/stat-sla.webp";
import branchArt from "@/assets/design/stat-branch.webp";

const TONES = {
  sky: {
    wash: "bg-[linear-gradient(160deg,#e4f3ff_0%,#f5fbff_70%)]",
    ink: "text-[#2d6fbe]",
    dot: "rgba(45,111,190,0.18)",
  },
  gold: {
    wash: "bg-[linear-gradient(160deg,#fff1cc_0%,#fff9ee_70%)]",
    ink: "text-[#c48412]",
    dot: "rgba(196,132,18,0.18)",
  },
  lilac: {
    wash: "bg-[linear-gradient(160deg,#efe7ff_0%,#f8f5ff_70%)]",
    ink: "text-[#6b4eb8]",
    dot: "rgba(107,78,184,0.18)",
  },
  mint: {
    wash: "bg-[linear-gradient(160deg,#e3f8ea_0%,#f4fff7_70%)]",
    ink: "text-[#1c8a42]",
    dot: "rgba(28,138,66,0.18)",
  },
  rose: {
    wash: "bg-[linear-gradient(160deg,#ffe6ea_0%,#fff6f7_70%)]",
    ink: "text-[#d24d60]",
    dot: "rgba(210,77,96,0.18)",
  },
  peach: {
    wash: "bg-[linear-gradient(160deg,#ffe6cf_0%,#fff6ec_70%)]",
    ink: "text-[#d4782a]",
    dot: "rgba(212,120,42,0.2)",
  },
} as const;

const ART = {
  properties: propertiesArt,
  review: reviewArt,
  rework: reworkArt,
  completed: completedArt,
  rejected: rejectedArt,
  sla: slaArt,
  branch: branchArt,
} as const;

export type StatTone = keyof typeof TONES;
export type StatArt = keyof typeof ART;

export function StatCard({
  to,
  label,
  value,
  tone,
  art,
}: {
  to: string;
  label: string;
  value: number;
  tone: StatTone;
  art?: StatArt;
}) {
  const style = TONES[tone];
  return (
    <Link
      to={to}
      className={`group relative flex min-h-[104px] items-center overflow-hidden rounded-[22px] px-3.5 py-3 no-underline shadow-[0_8px_18px_rgba(31,37,71,0.05)] transition-shadow hover:shadow-[0_12px_26px_rgba(31,37,71,0.1)] md:min-h-[118px] md:px-4 md:py-3.5 ${style.wash}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${style.dot} 1px, transparent 1.2px)`,
          backgroundSize: "14px 14px",
        }}
      />
      <span className="absolute right-2.5 top-2.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_2px_8px_rgba(31,37,71,0.08)]">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
      <span className="relative z-[1] min-w-0 flex-1 pr-[4.25rem] md:pr-[5.25rem]">
        <span className={`block text-[13px] font-medium leading-snug md:text-[15px] ${style.ink}`}>{label}</span>
        <span className={`stat-card-value mt-2 block ${style.ink}`}>{value}</span>
      </span>
      {art ? (
        <img
          src={ART[art]}
          alt=""
          className="pointer-events-none absolute bottom-1.5 right-1.5 z-[1] h-14 w-14 object-contain transition-transform group-hover:scale-105 md:h-[4.5rem] md:w-[4.5rem]"
        />
      ) : null}
    </Link>
  );
}
