import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { getLeadDetail, saveLeadSiteVerification } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { LeadDocumentUploadPage } from "@/features/leads/LeadDocumentUploadPage";
import { LeadLoiPage } from "@/features/leads/LeadLoiPage";
import { LeadPropertyDetailsPage } from "@/features/leads/LeadPropertyDetailsPage";
import { isPropertyDetailsModuleComplete } from "@/features/leads/propertyVerification";
import { sectionLocked } from "@/features/leads/sectionReview";
import { ShortlistingChecklist } from "@/features/leads/ShortlistingChecklist";
import {
  SITE_CHECK_FLAGS,
  SITE_CHECK_YES,
  emptyShortlisting,
  isSiteVerificationComplete,
  shortlistingComplete,
  isRimExtraKey,
  shortlistingFrom,
  siteCheckCardsForLead,
  siteCheckYesForLead,
} from "@/features/leads/siteVerification";
import { ApiError } from "@/types/api";

const STEPS = [
  { id: "onsite", label: "Onsite Vetting" },
  { id: "property", label: "Property Details" },
  { id: "loi", label: "LOI Generation" },
  { id: "documents", label: "Document Upload" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

export function SiteVerificationPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const requested = params.get("step");
  const step: StepId = STEPS.some((item) => item.id === requested) ? (requested as StepId) : "onsite";
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [shortlist, setShortlist] = useState<Record<string, boolean>>(emptyShortlisting);
  const [yesNo, setYesNo] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  useEffect(() => {
    if (!detail.data || hydrated) return;
    const lead = detail.data as Record<string, unknown>;
    const nextFlags: Record<string, boolean> = {};
    for (const item of SITE_CHECK_FLAGS) nextFlags[item.key] = Boolean(Number(lead[item.key]));
    const nextYes: Record<string, string> = {};
    for (const item of SITE_CHECK_YES) nextYes[item.key] = text(lead[item.key]);
    setChecks(nextFlags);
    setShortlist(shortlistingFrom(lead.shortlisting_checklist));
    setYesNo(nextYes);
    setHydrated(true);
  }, [detail.data, hydrated]);

  const lead = (detail.data || {}) as Record<string, unknown>;
  const documentsDone = [lead.premise_related_document, lead.kyc_related_documents].some(
    (rows) => Array.isArray(rows) && rows.some((row) => String((row as { document_attachment?: string }).document_attachment || "").trim()),
  );
  const stepDone: Record<StepId, boolean> = {
    onsite: shortlistingComplete(shortlist) && isSiteVerificationComplete({ ...lead, ...checks, ...yesNo }),
    property: isPropertyDetailsModuleComplete(lead),
    loi: Boolean(text(lead.loi_consent_status)),
    documents: documentsDone,
  };

  const saveOnsite = useMutation({
    mutationFn: () =>
      saveLeadSiteVerification(name, {
        ...Object.fromEntries(SITE_CHECK_FLAGS.map((item) => [item.key, Boolean(checks[item.key])])),
        ...Object.fromEntries(SITE_CHECK_YES.map((item) => [item.key, yesNo[item.key] || ""])),
        shortlisting_checklist: JSON.stringify(shortlist),
      }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      setParams({ step: "property" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save Onsite Vetting."),
  });

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="Site Verification needs a valid Lead Request." />;
  }

  const yesChecks = siteCheckYesForLead(lead);
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <section className="mx-auto w-full min-w-0 max-w-lg pb-24 lg:max-w-3xl lg:pb-0">
      <div className="mb-4 flex items-center gap-2">
        <BackButton
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ims-ink"
          iconClassName="h-5 w-5"
        />
        <h1 className="text-[18px] font-semibold text-ims-ink">Site Verification</h1>
      </div>

      <ol className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-[linear-gradient(90deg,#3a2774,#542f86)] px-2 py-3">
        {STEPS.map((item, index) => {
          const current = item.id === step;
          const complete = stepDone[item.id];
          const active = false;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setParams({ step: item.id })}
                className="flex w-full flex-col items-center gap-1.5 text-center"
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold",
                    complete
                      ? "bg-emerald-500 text-white"
                      : current
                        ? "bg-white text-[#3a2774] ring-2 ring-white"
                        : active
                          ? "bg-white/90 text-[#3a2774]"
                          : "bg-white/25 text-white",
                  ].join(" ")}
                >
                  {complete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`text-[11px] leading-tight text-white ${current ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === "onsite" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveOnsite.mutate();
          }}
        >
          <h2 className="text-[15px] font-semibold text-ims-ink">Onsite Vetting</h2>
          <fieldset disabled={sectionLocked(lead, "Site Verification")} className="space-y-4 disabled:opacity-70">
          <ShortlistingChecklist
            disabled={sectionLocked(lead, "Site Verification")}
            value={shortlist}
            onToggle={(key) => setShortlist((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
          <ShortlistingChecklist
            disabled={sectionLocked(lead, "Site Verification")}
            title="Site checks"
            items={siteCheckCardsForLead(lead)}
            value={{
              ...checks,
              ...shortlist,
              ...Object.fromEntries(yesChecks.map((item) => [item.key, yesNo[item.key] === "Yes"])),
            }}
            onToggle={(key) => {
              if (isRimExtraKey(key)) {
                setShortlist((prev) => ({ ...prev, [key]: !prev[key] }));
                return;
              }
              if (yesChecks.some((item) => item.key === key)) {
                setYesNo((prev) => ({ ...prev, [key]: prev[key] === "Yes" ? "No" : "Yes" }));
                return;
              }
              setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
            }}
          />
          </fieldset>
          <Link
            to={`/chola360/leads/${encodeURIComponent(name)}/site-images`}
            className="inline-flex text-[13px] font-semibold text-ims-primary no-underline"
          >
            Site images
          </Link>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button type="submit" className="ims-btn-primary w-full min-h-12" disabled={saveOnsite.isPending || sectionLocked(lead, "Site Verification")}>
            {saveOnsite.isPending ? "Saving…" : "Continue"}
          </button>
        </form>
      ) : null}

      {step === "property" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ims-ink">Owner Details</h2>
            <Link
              to={`/chola360/leads/${encodeURIComponent(name)}/owner-details`}
              className="text-[13px] font-semibold text-ims-primary no-underline"
            >
              View Owners List
            </Link>
          </div>
          <LeadPropertyDetailsPage embedded onSaved={() => setParams({ step: "loi" })} />
        </div>
      ) : null}

      {step === "documents" ? (
        <div className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ims-ink">Document Upload</h2>
          <LeadDocumentUploadPage embedded />
        </div>
      ) : null}

      {step === "loi" ? (
        <div className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ims-ink">LOI Generation</h2>
          <LeadLoiPage embedded />
        </div>
      ) : null}

      <p className="sr-only">Step {stepIndex + 1} of {STEPS.length}</p>
    </section>
  );
}
