import { useMutation, useQuery } from "@tanstack/react-query";
import { executeMisWorkflowAction, getMisWorkflowActions } from "@/api/misDashboard";
import { queryKeys } from "@/api/keys";
import { Dialog } from "@/components/common/Dialog";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkflowActions } from "@/components/workflow/WorkflowActions";
import { useToasts } from "@/stores/session";
import { ApiError, type MisRequestRow, type WorkflowAction } from "@/types/api";

export function MisActionDialog({ row, onClose, onDone }: { row: MisRequestRow; onClose: () => void; onDone: () => Promise<void> }) {
  const push = useToasts((state) => state.push);
  const actions = useQuery({
    queryKey: queryKeys.documentActions("MIS Product Wise Branch Initiate", row.name),
    queryFn: () => getMisWorkflowActions(row.name),
  });
  const execute = useMutation({
    mutationFn: (input: { action: WorkflowAction; comment: string }) =>
      executeMisWorkflowAction({
        name: row.name,
        action: input.action.action,
        comment: input.comment,
        doc: actions.data?.doc,
      }),
    onSuccess: async (data) => {
      push(`${row.name} moved to ${data.workflow_state_label}.`, "success");
      await onDone();
      onClose();
    },
    onError: (error) => push(error instanceof ApiError ? error.message : "The action could not be completed.", "error"),
  });

  return (
    <Dialog open title={row.name} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Product Line</dt>
          <dd className="font-medium text-ims-ink">{row.product_line || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Financial Year</dt>
          <dd className="font-medium text-ims-ink">{row.year || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="mb-1 text-slate-500">Workflow Status</dt>
          <dd>{row.workflow_state_label ? <StatusBadge label={row.workflow_state_label} /> : "—"}</dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-slate-100 pt-4">
        {actions.isLoading ? (
          <SkeletonBlock className="h-10" />
        ) : actions.isError ? (
          <p className="text-sm text-rose-700">
            {actions.error instanceof ApiError ? actions.error.message : "Workflow actions could not be loaded."}
          </p>
        ) : (
          <WorkflowActions
            actions={actions.data?.actions ?? []}
            pending={execute.isPending}
            onSubmit={async (action, comment) => {
              await execute.mutateAsync({ action, comment }).catch(() => undefined);
            }}
          />
        )}
      </div>
    </Dialog>
  );
}
