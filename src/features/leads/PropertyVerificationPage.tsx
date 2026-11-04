import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  FileBadge2,
  PenLine,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { applyLeadWorkflowAction, getLeadDetail } from "@/api/leads";
import { queryKeys } from "@/api/keys";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import {
  countCompletedPropertyVerificationModules,
  PROPERTY_VERIFICATION_MODULES,
  propertyVerificationStatus,
  type PropertyVerificationModuleId,
} from "@/features/leads/propertyVerification";
import { SitePhotoGallery } from "@/features/leads/SitePhotoGallery";
import { ApiError } from "@/types/api";
import { useState } from "react";

const ICONS: Record<PropertyVerificationModuleId, LucideIcon> = {
  property: Building2,
  owner: UserRound,
  facility: Star,
  documents: FileBadge2,
  loi: PenLine,
};

export function PropertyVerificationPage() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.leadDetail(name),
    queryFn: () => getLeadDetail(name),
    enabled: Boolean(name),
  });

  const submit = useMutation({
    mutationFn: () => applyLeadWorkflowAction({ name, action: "Submit" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadDetail(name) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.leadHome });
      navigate(`/chola360/leads/${encodeURIComponent(name)}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Submit failed"),
  });

  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  if (detail.isError || !detail.data) {
    return <EmptyState title="Lead unavailable" body="Property verification needs a valid Lead Request." />;
  }

  const lead = detail.data as Record<string, unknown>;
  const state = String(lead.workflow_state || "Draft");
  const canSubmit = state === "Draft" || state === "Re-Work";
  const completed = countCompletedPropertyVerificationModules(lead);

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-lg flex-col gap-4 pb-28 lg:max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ims-ink ring-1 ring-ims-line" />
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold text-ims-ink md:text-[20px]">Property Verification</h1>
          <p className="text-xs text-slate-500">
            {String(lead.property_id || lead.name)} · {completed} of {PROPERTY_VERIFICATION_MODULES.length} steps done
          </p>
        </div>
      </div>

      <SitePhotoGallery lead={lead} />

      <div>
        <h2 className="text-[13px] font-semibold text-ims-ink">Property Verification Steps</h2>
        <p className="mt-1 text-xs text-slate-500">
          {completed} of {PROPERTY_VERIFICATION_MODULES.length} steps done. Open whichever step is still pending.
        </p>
      </div>

      <ul className="space-y-3">
        {PROPERTY_VERIFICATION_MODULES.map((module) => {
          const status = propertyVerificationStatus(module.id, lead);
          const Icon = ICONS[module.id];
          const done = status === "completed";
          return (
            <li key={module.id}>
              <Link
                to={`/chola360/leads/${encodeURIComponent(name)}/${module.path}`}
                className="flex items-center gap-2 rounded-xl border border-ims-line bg-white px-3 py-2.5 no-underline shadow-[0_4px_14px_rgba(31,37,71,0.04)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF1FB] text-ims-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-ims-ink">{module.label}</span>
                  <span className="mt-0.5 block text-[12px] text-slate-500">{module.hint}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    done ? "bg-[#DDF5E8] text-[#1F7A4D]" : "bg-[#F8E4D4] text-[#8B4A1F]"
                  }`}
                >
                  {done ? "Completed" : "Pending"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {canSubmit ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ims-line bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="button"
            className="ims-btn-primary w-full min-h-12"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Submitting…" : state === "Re-Work" ? "Resubmit" : "Submit"}
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Lead is in <span className="font-semibold">{state}</span>. Open a step above to continue verification.
        </p>
      )}
    </section>
  );
}
