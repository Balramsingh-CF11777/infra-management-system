import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { createMisRequest, getMisCreateForm, type MisAttachmentDraft } from "@/api/misDashboard";
import { queryKeys } from "@/api/keys";
import { Dialog } from "@/components/common/Dialog";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { emptyAttachmentDrafts, MisAttachmentEditor } from "@/features/mis/MisAttachmentTable";
import { ApiError } from "@/types/api";

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function CreateForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (message: string) => Promise<void> }) {
  const [productLine, setProductLine] = useState("");
  const [branchCount, setBranchCount] = useState("");
  const [attachments, setAttachments] = useState<MisAttachmentDraft[]>(() => emptyAttachmentDrafts());
  const [error, setError] = useState("");
  const form = useQuery({ queryKey: queryKeys.misCreateForm, queryFn: () => getMisCreateForm() });
  const create = useMutation({
    mutationFn: (input: { values: Record<string, unknown>; attachments: MisAttachmentDraft[] }) =>
      createMisRequest(input.values, input.attachments),
  });

  if (form.isLoading) return <SkeletonBlock className="h-56" />;
  if (form.isError || !form.data) {
    return <p className="text-sm text-rose-700">{errorText(form.error, "The request form could not be loaded.")}</p>;
  }

  const data = form.data;

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
    for (const row of attachments) {
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
      const created = await create.mutateAsync({
        values: {
          [data.product_field]: productLine,
          [data.branch_count_field]: count,
        },
        attachments,
      });
      await onCreated(`MIS request ${created.name} created.`);
    } catch (caught) {
      setError(errorText(caught, "The MIS request could not be created."));
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <div>
        <label htmlFor="mis-year" className="block text-sm font-medium text-slate-700">
          Financial Year
        </label>
        <div id="mis-year" className="mt-1 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-ims-ink">
          {data.year || data.year_label || "—"}
          <span className="ml-2 text-xs text-slate-500">Current financial year</span>
        </div>
      </div>
      <div>
        <label htmlFor="mis-product-line" className="block text-sm font-medium text-slate-700">
          Product Line <span className="text-rose-600">*</span>
        </label>
        <select
          id="mis-product-line"
          value={productLine}
          onChange={(event) => {
            setProductLine(event.target.value);
            setError("");
          }}
          className="ims-field mt-1"
          required
        >
          <option value="">Select product line</option>
          {data.product_lines.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="mis-branch-count" className="block text-sm font-medium text-slate-700">
          {data.branch_count_label || "Number of Branches"} <span className="text-rose-600">*</span>
        </label>
        <input
          id="mis-branch-count"
          type="number"
          min={1}
          step={1}
          value={branchCount}
          onChange={(event) => {
            setBranchCount(event.target.value);
            setError("");
          }}
          className="ims-field mt-1"
          placeholder="Enter branches to initiate"
          required
        />
      </div>

      <MisAttachmentEditor rows={attachments} onChange={setAttachments} />

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Attachments upload to DMS through Frappe. The request ID and workflow state are assigned on submit.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="ims-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="ims-btn-primary" disabled={create.isPending}>
          {create.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {create.isPending ? "Submitting…" : "Submit for Approval"}
        </button>
      </div>
    </form>
  );
}

export function MisCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (message: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} title="Create MIS Request" onClose={onClose} size="lg">
      {open && <CreateForm onCancel={onClose} onCreated={onCreated} />}
    </Dialog>
  );
}
