import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import {
  executeMisWorkflowAction,
  getMisCreateForm,
  getMisRequest,
  getMisWorkflowActions,
  updateMisRequest,
  type MisAttachmentDraft,
  type MisAttachmentRow,
} from "@/api/misDashboard";
import { queryKeys } from "@/api/keys";
import { Dialog } from "@/components/common/Dialog";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkflowActions } from "@/components/workflow/WorkflowActions";
import { MisAttachmentEditor, MisAttachmentViewer } from "@/features/mis/MisAttachmentTable";
import { formatWhen } from "@/lib/format";
import { useToasts } from "@/stores/session";
import { ApiError, type MisRequestRow, type WorkflowAction } from "@/types/api";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ims-ink">{children}</dd>
    </div>
  );
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function DraftEditor({
  name,
  branchCountLabel,
  initialProductLine,
  initialBranchCount,
  initialAttachments,
  year,
  workflowLabel,
  onSaved,
  onClose,
}: {
  name: string;
  branchCountLabel?: string;
  initialProductLine: string;
  initialBranchCount: string;
  initialAttachments: MisAttachmentRow[];
  year: string;
  workflowLabel: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const push = useToasts((state) => state.push);
  const [productLine, setProductLine] = useState(initialProductLine);
  const [branchCount, setBranchCount] = useState(initialBranchCount);
  const [existing, setExisting] = useState(initialAttachments);
  const [drafts, setDrafts] = useState<MisAttachmentDraft[]>([]);
  const [error, setError] = useState("");
  const form = useQuery({ queryKey: queryKeys.misCreateForm, queryFn: () => getMisCreateForm() });
  const save = useMutation({ mutationFn: updateMisRequest });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!productLine) {
      setError("Choose a product line.");
      return;
    }
    const count = Number(branchCount);
    if (!Number.isFinite(count) || count <= 0) {
      setError("New Branch Count Included must be greater than 0. Please enter at least 1 branch before saving the request.");
      return;
    }
    for (const row of drafts) {
      if (row.document_type && !row.file) {
        setError("Attach a file for each Document Type row.");
        return;
      }
      if (row.file && !row.document_type) {
        setError("Choose a Document Type for each attachment.");
        return;
      }
    }
    try {
      await save.mutateAsync({
        name,
        product_line: productLine,
        new_branch_count_included: count,
        keep_attachments: existing,
        new_attachments: drafts,
      });
      push(`${name} saved.`, "success");
      await onSaved();
    } catch (caught) {
      setError(errorText(caught, "The draft request could not be saved."));
    }
  }

  if (form.isLoading) return <SkeletonBlock className="h-56" />;
  if (form.isError || !form.data) {
    return <p className="text-sm text-rose-700">{errorText(form.error, "The request form could not be loaded.")}</p>;
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <p className="rounded-xl bg-ims-bg px-3 py-2 text-sm text-slate-600">Draft — edit and save before submitting for approval.</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Request ID">{name}</Field>
        <Field label="Workflow Status">{workflowLabel ? <StatusBadge label={workflowLabel} /> : "Draft"}</Field>
        <Field label="Financial Year">{year || "—"}</Field>
      </dl>

      <div>
        <label htmlFor="mis-edit-product-line" className="block text-sm font-medium text-slate-700">
          Product Line <span className="text-rose-600">*</span>
        </label>
        <select
          id="mis-edit-product-line"
          value={productLine}
          onChange={(event) => {
            setProductLine(event.target.value);
            setError("");
          }}
          className="ims-field mt-1"
          required
        >
          <option value="">Select product line</option>
          {form.data.product_lines.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mis-edit-branch-count" className="block text-sm font-medium text-slate-700">
          {branchCountLabel || form.data.branch_count_label || "Number of Branches"} <span className="text-rose-600">*</span>
        </label>
        <input
          id="mis-edit-branch-count"
          type="number"
          min={1}
          step={1}
          value={branchCount}
          onChange={(event) => {
            setBranchCount(event.target.value);
            setError("");
          }}
          className="ims-field mt-1"
          required
        />
      </div>

      <MisAttachmentEditor rows={drafts} onChange={setDrafts} existing={existing} onExistingChange={setExisting} />

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="ims-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="ims-btn-primary" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {save.isPending ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </form>
  );
}

export function MisViewDialog({
  row,
  branchCountLabel,
  onClose,
  onDone,
}: {
  row: MisRequestRow;
  branchCountLabel?: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const push = useToasts((state) => state.push);
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: queryKeys.misRequest(row.name),
    queryFn: () => getMisRequest(row.name),
  });
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
        doc: actions.data?.doc ?? detail.data?.doc,
      }),
    onSuccess: async (data) => {
      push(`${row.name} moved to ${data.workflow_state_label}.`, "success");
      await onDone();
      onClose();
    },
    onError: (error) => push(error instanceof ApiError ? error.message : "The action could not be completed.", "error"),
  });

  const doc = detail.data;
  const isDraft = (doc?.workflow_state || row.workflow_state || "Draft") === "Draft";

  async function refreshDetail() {
    await client.invalidateQueries({ queryKey: queryKeys.misRequest(row.name) });
    await client.invalidateQueries({ queryKey: queryKeys.documentActions("MIS Product Wise Branch Initiate", row.name) });
    await onDone();
  }

  return (
    <Dialog open title={row.name} onClose={onClose} size="lg">
      {detail.isLoading ? (
        <SkeletonBlock className="h-48" />
      ) : detail.isError || !doc ? (
        <p className="text-sm text-rose-700">
          {detail.error instanceof ApiError ? detail.error.message : "This request could not be loaded from Frappe."}
        </p>
      ) : isDraft ? (
        <div className="space-y-5">
          <DraftEditor
            key={doc.modified || doc.name}
            name={doc.name}
            branchCountLabel={branchCountLabel}
            initialProductLine={doc.product_line}
            initialBranchCount={doc.branches_requested === null || doc.branches_requested === "" ? "" : String(doc.branches_requested)}
            initialAttachments={doc.attachments}
            year={doc.year}
            workflowLabel={doc.workflow_state_label}
            onSaved={refreshDetail}
            onClose={onClose}
          />
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-ims-ink">Workflow actions</p>
            {actions.isLoading ? (
              <SkeletonBlock className="h-10" />
            ) : actions.isError ? (
              <p className="text-sm text-rose-700">
                {actions.error instanceof ApiError ? actions.error.message : "Workflow actions could not be loaded."}
              </p>
            ) : (actions.data?.actions.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">Save the draft, then submit when a workflow action is available.</p>
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
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Request ID">{doc.name}</Field>
            <Field label="Workflow Status">{doc.workflow_state_label ? <StatusBadge label={doc.workflow_state_label} /> : "—"}</Field>
            <Field label="Product Line">{doc.product_line || "—"}</Field>
            <Field label="Financial Year">{doc.year || "—"}</Field>
            <Field label={branchCountLabel || "New Branch Count Included"}>
              {doc.branches_requested === null || doc.branches_requested === "" ? "—" : String(doc.branches_requested)}
            </Field>
            <Field label="Initiated By">{doc.owner || "—"}</Field>
            <Field label="Initiated Date">{doc.creation ? formatWhen(doc.creation) : "—"}</Field>
            <Field label="Last Updated">{doc.modified ? formatWhen(doc.modified) : "—"}</Field>
            {doc.comment ? (
              <div className="col-span-2">
                <Field label="Comment">{doc.comment}</Field>
              </div>
            ) : null}
          </dl>

          <MisAttachmentViewer rows={doc.attachments} />

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-ims-ink">Workflow actions</p>
            {actions.isLoading ? (
              <SkeletonBlock className="h-10" />
            ) : actions.isError ? (
              <p className="text-sm text-rose-700">
                {actions.error instanceof ApiError ? actions.error.message : "Workflow actions could not be loaded."}
              </p>
            ) : (actions.data?.actions.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No actions available for your role on this request.</p>
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
        </div>
      )}
    </Dialog>
  );
}
