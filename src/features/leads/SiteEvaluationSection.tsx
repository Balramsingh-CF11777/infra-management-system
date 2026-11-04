import { useState } from "react";
import { SHORTLISTING_CHECKS } from "@/features/leads/siteVerification";

export type SiteAnswer = "yes" | "no" | "pending" | "";

const CHECKS = Object.fromEntries(SHORTLISTING_CHECKS.map((item) => [item.key, item]));

/** Existing Annexure A checks, grouped into the five site-evaluation categories. */
export const SITE_EVAL_CATEGORIES = [
  {
    id: "property",
    label: "Property Details",
    note: "Physical suitability of the premises. A No does not reject the prospect.",
    keys: ["sl_frontage", "sl_floor", "sl_columns", "sl_height", "sl_walls", "sl_shutter", "sl_ground", "sl_area"],
  },
  {
    id: "owner",
    label: "Owner Details",
    note: "Ownership count is declared here. Owner records are captured after this prospect becomes a Lead Request.",
    keys: ["sl_owners"],
  },
  {
    id: "facilities",
    label: "Facilities Details",
    note: "Parking, locality, utilities, drainage, and structure.",
    keys: ["sl_parking", "sl_adjacency", "sl_locality", "sl_flood", "sl_utilities", "sl_manholes", "sl_structure"],
  },
  {
    id: "documents",
    label: "Documents",
    note: "Confirm statutory approvals. Files are uploaded on the Lead Request after this prospect is converted.",
    keys: ["sl_approvals"],
  },
  {
    id: "loi",
    label: "LOI & Consent",
    note: "Letter of Intent and owner consent stay on the Lead Request. They open only after every site check is declared and this prospect is converted.",
    keys: [] as string[],
  },
] as const;

export function emptySiteAnswers(): Record<string, SiteAnswer> {
  const next: Record<string, SiteAnswer> = {};
  for (const item of SHORTLISTING_CHECKS) next[item.key] = "";
  return next;
}

export function siteAnswersDeclared(value: Record<string, SiteAnswer>) {
  return SHORTLISTING_CHECKS.every((item) => value[item.key] === "yes" || value[item.key] === "no" || value[item.key] === "pending");
}

export function siteAnswersFromChecklist(value: Record<string, boolean>): Record<string, SiteAnswer> {
  const next = emptySiteAnswers();
  for (const key of Object.keys(next)) {
    if (value[key]) next[key] = "yes";
  }
  return next;
}

export function siteAnswersToChecklist(value: Record<string, SiteAnswer>): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const item of SHORTLISTING_CHECKS) next[item.key] = value[item.key] === "yes";
  return next;
}

export function SiteEvaluationSection({
  value,
  onChange,
}: {
  value: Record<string, SiteAnswer>;
  onChange: (key: string, answer: SiteAnswer) => void;
}) {
  const [active, setActive] = useState<(typeof SITE_EVAL_CATEGORIES)[number]["id"]>("property");
  const category = SITE_EVAL_CATEGORIES.find((item) => item.id === active) ?? SITE_EVAL_CATEGORIES[0];
  const passed = SHORTLISTING_CHECKS.filter((item) => value[item.key] === "yes").length;
  const failed = SHORTLISTING_CHECKS.filter((item) => value[item.key] === "no").length;
  const pending = SHORTLISTING_CHECKS.filter((item) => value[item.key] !== "yes" && value[item.key] !== "no").length;

  return (
    <section className="min-w-0 max-w-full space-y-3 lg:col-span-2">
      <div>
        <h3 className="text-sm font-semibold text-ims-ink">Site evaluation</h3>
        <p className="mt-1 text-xs text-slate-500">
          Declare every site check on this Lead Prospect. A Lead Request is created only after the prospect is saved and the checklist is complete.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SITE_EVAL_CATEGORIES.map((item, index) => {
          const answered = item.keys.filter((key) => value[key] === "yes" || value[key] === "no" || value[key] === "pending").length;
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={[
                "shrink-0 rounded-full border px-3 py-1.5 text-left text-[12px] font-semibold leading-4",
                selected ? "border-[#5940b6] bg-[#5940b6] text-white" : "border-[#dde5f2] bg-white text-ims-ink",
              ].join(" ")}
            >
              {index + 1}. {item.label}
              {item.keys.length ? (
                <span className={selected ? "ml-1 font-medium text-white/80" : "ml-1 font-medium text-slate-500"}>
                  {answered}/{item.keys.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">{category.note}</p>
      {category.keys.length ? (
        <ul className="grid grid-cols-1 gap-2">
          {category.keys.map((key) => {
            const item = CHECKS[key];
            if (!item) return null;
            const answer = value[key] || "";
            return (
              <li key={key} className="rounded-lg border border-[#dde5f2] bg-white px-3 py-2.5">
                <p className="text-[13px] font-semibold text-ims-ink">{item.title}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{item.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["yes", "Yes"],
                      ["no", "No"],
                      ["pending", "Not verified"],
                    ] as const
                  ).map(([next, label]) => {
                    const on = answer === next;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(key, next)}
                        className={[
                          "rounded-full border px-3 py-1 text-[12px] font-semibold",
                          on
                            ? next === "yes"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : next === "no"
                                ? "border-rose-600 bg-rose-600 text-white"
                                : "border-slate-500 bg-slate-500 text-white"
                            : "border-[#dde5f2] bg-white text-ims-ink",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Summary label="Passed" value={passed} />
        <Summary label="Failed" value={failed} />
        <Summary label="Pending" value={pending} />
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#dde5f2] bg-white px-2 py-2">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="text-[18px] font-semibold tabular-nums text-ims-ink">{value}</p>
    </div>
  );
}
