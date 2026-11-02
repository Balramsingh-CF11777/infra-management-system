import type { WorkflowComment } from "@/types/api";
import { formatWhen } from "@/lib/format";

export function CommentTimeline({ comments }: { comments: WorkflowComment[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-slate-500">No workflow comments yet. Comments stay visible after the request moves to the next stage.</p>;
  }
  return (
    <ol className="space-y-3" aria-label="Workflow comments">
      {comments.map((comment) => (
        <li key={comment.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ims-primary">{comment.user}</p>
            <p className="text-xs text-slate-500">{formatWhen(comment.timestamp)}</p>
          </div>
          {comment.send_back && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Send back</p>
          )}
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
        </li>
      ))}
    </ol>
  );
}
