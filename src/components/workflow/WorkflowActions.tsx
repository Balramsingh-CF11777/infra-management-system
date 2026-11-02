import { useState } from "react";
import type { WorkflowAction } from "@/types/api";
import { Dialog } from "@/components/common/Dialog";

export function WorkflowActions({
  actions,
  pending,
  onSubmit,
}: {
  actions: WorkflowAction[];
  pending: boolean;
  onSubmit: (action: WorkflowAction, comment: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<WorkflowAction | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function confirm() {
    if (!selected) return;
    if (selected.requires_comment && !comment.trim()) {
      setError("A comment is required for this action.");
      return;
    }
    setError("");
    await onSubmit(selected, comment.trim());
    setSelected(null);
    setComment("");
  }

  if (actions.length === 0) {
    return (
      <div className="space-y-1 text-sm text-slate-500">
        <p>No workflow actions are available for your role at this stage.</p>
        <p className="text-xs text-slate-400">
          For RIBP, actions appear on <span className="font-medium text-slate-600">Proposed Branch Details</span> (Request ID starting with{" "}
          <span className="font-medium text-slate-600">NBO/</span>) when the workflow allows your role. Opening only the linked New Branch (
          <span className="font-medium text-slate-600">NBI/</span> Property ID) will not show RIBP property-stage actions. Save field edits with Edit /
          Save; workflow buttons only advance the stage.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
        {actions.map((action) => (
          <button
            key={`${action.action}-${action.next_state}`}
            type="button"
            disabled={pending || action.blocked}
            title={action.blocked ? action.block_reason : action.next_state_label}
            onClick={() => {
              setSelected(action);
              setComment("");
              setError("");
            }}
            className={`min-w-28 ${action.send_back ? "ims-btn-secondary" : "ims-btn-primary"}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      {Array.from(new Set(actions.filter((action) => action.blocked && action.block_reason).map((action) => action.block_reason))).map(
        (reason) => (
          <p key={reason} className="mt-3 text-sm font-medium text-amber-800">
            {reason}
          </p>
        ),
      )}
      <Dialog open={Boolean(selected)} title={selected?.label || "Workflow action"} onClose={() => setSelected(null)}>
        <p className="text-sm text-slate-600">
          This will move the request
          {selected?.next_state_label ? ` toward ${selected.next_state_label}` : ""}. Saving form fields does not run this action.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="workflow-comment">
          Comment {selected?.requires_comment ? "(required)" : "(optional)"}
        </label>
        <textarea
          id="workflow-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="ims-field mt-1 min-h-28"
        />
        {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="ims-btn-secondary" onClick={() => setSelected(null)}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className="ims-btn-primary"
            onClick={() => void confirm()}
          >
            {pending ? "Submitting…" : "Confirm"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
