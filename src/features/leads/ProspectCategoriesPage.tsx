import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProspect, saveProspectCheckpoints } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { ApiError } from "@/types/api";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { BackButton } from "@/components/common/BackButton";
import {
  SiteEvaluationSection,
  siteAnswersFromChecklist,
  siteAnswersToChecklist,
  type SiteAnswer,
} from "@/features/leads/SiteEvaluationSection";
import { shortlistingComplete, shortlistingFrom } from "@/features/leads/siteVerification";

export function ProspectCategoriesPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, SiteAnswer>>({});
  const [error, setError] = useState("");

  const prospectQuery = useQuery({
    queryKey: queryKeys.leadProspect(id),
    queryFn: () => getProspect(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!prospectQuery.data) return;
    setAnswers(siteAnswersFromChecklist(shortlistingFrom(prospectQuery.data.shortlisting_checklist)));
  }, [prospectQuery.data]);

  const checklist = siteAnswersToChecklist(answers);
  const complete = shortlistingComplete(checklist);
  const alreadyConverted = Boolean(prospectQuery.data?.converted_lead) || prospectQuery.data?.status === "Converted";

  const saveMutation = useMutation({
    mutationFn: () => saveProspectCheckpoints(id, checklist),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leadProspect(id) });
    },
  });

  async function onContinue() {
    setError("");
    try {
      await saveMutation.mutateAsync();
      navigate(`/chola360/prospects/${encodeURIComponent(id)}/property-verification`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save evaluation.");
    }
  }

  const busy = saveMutation.isPending;

  return (
    <section className="w-full min-w-0 max-w-full overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:pb-0">
      <Breadcrumb current="Property categories" />
      <div className="ims-card w-full min-w-0 max-w-full overflow-hidden">
        <CardHeader
          title="Property evaluation"
          subtitle="Optional notes. The Lead Request is created after the 17-point checklist."
          subtitleClassName="mt-0.5 hidden text-sm text-slate-500 lg:block"
        >
          <BackButton
            fallback={`/chola360/prospects/${encodeURIComponent(id)}/checkpoints`}
            className="ims-btn-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center p-0 lg:h-auto lg:w-auto lg:px-4"
          >
            <span className="hidden lg:inline">Back</span>
          </BackButton>
        </CardHeader>
        {prospectQuery.isLoading ? (
          <div className="px-4 pb-5 sm:px-5">
            <SkeletonBlock className="h-48" />
          </div>
        ) : prospectQuery.isError ? (
          <p className="px-4 pb-5 text-sm text-rose-600 sm:px-5">
            {prospectQuery.error instanceof ApiError ? prospectQuery.error.message : "Could not load this Lead Prospect."}
          </p>
        ) : (
          <div className="space-y-4 border-t border-ims-line px-4 py-4 sm:px-5 sm:py-5">
            {!complete ? (
              <p className="text-sm text-amber-700">
                The site checklist is not complete.{" "}
                <Link className="font-semibold text-ims-primary" to={`/chola360/prospects/${encodeURIComponent(id)}/checkpoints`}>
                  Return to the checklist
                </Link>
              </p>
            ) : null}
            <SiteEvaluationSection
              value={answers}
              onChange={(key, answer) => setAnswers((current) => ({ ...current, [key]: answer }))}
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {alreadyConverted ? (
              <Link
                to={`/chola360/leads/${encodeURIComponent(String(prospectQuery.data?.converted_lead || ""))}/property-verification`}
                className="ims-btn-primary inline-flex no-underline"
              >
                Open Lead Request
              </Link>
            ) : (
              <button type="button" className="ims-btn-primary disabled:opacity-50" disabled={busy} onClick={() => void onContinue()}>
                {busy ? "Saving…" : "Continue to Property Verification"}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
