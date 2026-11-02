import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getRequestDetail } from "@/api/proposedBranch";
import { executeWorkflowAction, getWorkflowActions, getWorkflowComments, getWorkflowTimeline } from "@/api/workflow";
import { getQueries, raiseQuery, reopenQuery, resolveQuery, respondToQuery } from "@/api/query";
import { queryKeys } from "@/api/keys";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Dialog } from "@/components/common/Dialog";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { WorkflowActions } from "@/components/workflow/WorkflowActions";
import { WorkflowTimeline } from "@/components/workflow/WorkflowTimeline";
import { CommentTimeline } from "@/components/workflow/CommentTimeline";
import { QueryPanel } from "@/components/queries/QueryPanel";
import { DocumentFormPanel } from "@/features/documents/DocumentPage";
import { PROPOSED_BRANCH } from "@/lib/documentPath";
import { agingLabel, formatWhen } from "@/lib/format";
import { useToasts } from "@/stores/session";
import { ApiError, type WorkflowAction } from "@/types/api";

/** All-details Desk tabs promoted to the workspace nav (Overview removed). */
const DETAIL_TABS = [
  { to: "", label: "Request Info", formTab: "Request Info", end: true },
  { to: "property-details", label: "Property Details", formTab: "Property Details", end: false },
  { to: "commercial-details", label: "Commercial Details", formTab: "Commercial Details", end: false },
  { to: "facility-details", label: "Facility Details", formTab: "Facility Details", end: false },
  { to: "owner-details", label: "Owner Details", formTab: "Owner Details", end: false },
] as const;

const TABS = [
  ...DETAIL_TABS.map(({ to, label, end }) => ({ to, label, end })),
  { to: "queries", label: "Queries", end: false },
  { to: "activity", label: "Activity", end: false },
];

export function RequestWorkspace() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const detail = useQuery({ queryKey: queryKeys.request(name), queryFn: () => getRequestDetail(name), enabled: Boolean(name) });

  if (detail.isLoading) return <SkeletonBlock className="h-80" />;
  if (detail.isError || !detail.data) {
    const message = detail.error instanceof ApiError ? detail.error.message : "This request could not be opened.";
    return <EmptyState title="Request unavailable" body={message} />;
  }
  const summary = detail.data.summary;
  // Prefer the resolved Proposed Branch name (NBO/…) even if the URL still has NBI/….
  const resolvedName = summary.request_id || summary.name || name;

  return (
      <article className="space-y-4">
        <nav aria-label="Breadcrumb" className="hidden text-sm lg:block">
          <Link to="/pending" className="text-slate-500 no-underline hover:text-ims-primary">
            My Tasks
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="font-semibold text-ims-ink">{resolvedName}</span>
        </nav>
        <header className="ims-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-ims-ink">Site Details</h1>
              <p className="mt-0.5 text-xs text-slate-500">{agingLabel(summary.modified)}</p>
            </div>
            <StatusBadge label={detail.data.workflow_state_label} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 xl:grid-cols-6 [&_dd]:mt-1 [&_dd]:min-w-0 [&_dd]:truncate [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-ims-ink [&_dt]:text-[11px] [&_dt]:font-medium [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-slate-500">
            <div>
              <dt>Request ID</dt>
              <dd className="!text-ims-primary">{summary.request_id || summary.name}</dd>
            </div>
            <div>
              <dt>Property ID</dt>
              <dd className="!text-ims-primary">{summary.property_id || "—"}</dd>
            </div>
            <div>
              <dt>Zone</dt>
              <dd>{summary.zone || "—"}</dd>
            </div>
            <div>
              <dt>Region</dt>
              <dd>{summary.region || "—"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{summary.location || "—"}</dd>
            </div>
            <div>
              <dt>Product</dt>
              <dd>{summary.product_line || "—"}</dd>
            </div>
            <div>
              <dt>Assignee</dt>
              <dd>{summary.assignee || summary.requester || summary.owner || "—"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Last updated {formatWhen(summary.modified)}</p>
          <ActionBar name={resolvedName} modified={summary.modified} />
        </header>
        <nav className="scroll-row -mx-3 flex gap-6 overflow-x-auto border-b border-ims-line px-3 sm:mx-0 sm:px-1" aria-label="Request sections">
          {TABS.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `-mb-px whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium no-underline ${
                  isActive ? "border-[#404574] text-ims-ink" : "border-transparent text-slate-500 hover:text-ims-ink"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <section className="ims-card p-4 sm:p-5">
          <Outlet />
        </section>
      </article>
  );
}

function ActionBar({ name, modified }: { name: string; modified?: string }) {
  const client = useQueryClient();
  const push = useToasts((state) => state.push);
  const [result, setResult] = useState("");
  const actions = useQuery({ queryKey: queryKeys.workflowActions(name), queryFn: () => getWorkflowActions(name) });
  const mutation = useMutation({
    mutationFn: (input: { action: WorkflowAction; comment: string }) =>
      executeWorkflowAction({
        name,
        action: input.action.action,
        comment: input.comment,
        expectedModified: modified,
        expectedNextState: input.action.next_state,
      }),
    onSuccess: async (data) => {
      setResult(`${data.workflow_state_label} is now the current stage.`);
      await client.invalidateQueries({ queryKey: queryKeys.request(name) });
      await client.invalidateQueries({ queryKey: queryKeys.workflowActions(name) });
      await client.invalidateQueries({ queryKey: queryKeys.workflowTimeline(name) });
      await client.invalidateQueries({ queryKey: queryKeys.comments(name) });
      await client.invalidateQueries({ queryKey: queryKeys.pending });
      await client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "The workflow action could not be completed.";
      push(message, "error");
    },
  });

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      {actions.data?.query_block_status.count ? (
        <Link to={`/infra/requests/${encodeURIComponent(name)}/queries`} className="mb-3 block text-sm font-medium text-amber-800">
          Resolve the open queries before proceeding.
        </Link>
      ) : null}
      <WorkflowActions
        actions={actions.data?.actions ?? []}
        pending={mutation.isPending}
        onSubmit={async (action, comment) => {
          await mutation.mutateAsync({ action, comment });
        }}
      />
      <Dialog open={Boolean(result)} title="Action completed" onClose={() => setResult("")}>
        <p className="text-sm text-slate-700">{result}</p>
        <button type="button" className="ims-btn-primary mt-4 w-full" onClick={() => setResult("")}>
          Stay on this request
        </button>
      </Dialog>
    </div>
  );
}

export function DetailsSectionTab({ formTab }: { formTab: string }) {
  const { id = "" } = useParams();
  const detail = useQuery({
    queryKey: queryKeys.request(decodeURIComponent(id)),
    queryFn: () => getRequestDetail(decodeURIComponent(id)),
    enabled: Boolean(id),
  });
  const name = detail.data?.summary.request_id || detail.data?.summary.name || decodeURIComponent(id);
  const autoEdit =
    formTab === "Property Details" ||
    formTab === "Commercial Details" ||
    formTab === "Facility Details" ||
    formTab === "Owner Details";
  if (detail.isLoading) return <SkeletonBlock className="h-64" />;
  return (
    <DocumentFormPanel
      doctype={PROPOSED_BRANCH}
      name={name}
      forcedTab={formTab}
      hideInnerTabs
      autoEdit={autoEdit}
    />
  );
}

/** @deprecated Overview removed — request info is the default tab. */
export function OverviewTab() {
  return <DetailsSectionTab formTab="Request Info" />;
}

/** @deprecated Use Property Details workspace tab. */
export function PropertyTab() {
  return <DetailsSectionTab formTab="Property Details" />;
}

export function QueriesTab() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const client = useQueryClient();
  const push = useToasts((state) => state.push);
  const queries = useQuery({ queryKey: queryKeys.queries(name), queryFn: () => getQueries(name) });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: queryKeys.queries(name) });
    await client.invalidateQueries({ queryKey: queryKeys.workflowActions(name) });
  };
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await work();
      push(success, "success");
      await refresh();
      return true;
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Query update failed.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (queries.isLoading) return <SkeletonBlock className="h-40" />;
  if (!queries.data) return <p className="text-sm text-slate-600">Queries could not be loaded.</p>;
  return (
    <QueryPanel
      data={queries.data}
      busy={busy}
      onRaise={(input) => run(() => raiseQuery(name, input), "Query raised.")}
      onRespond={(queryName, response) => run(() => respondToQuery(name, queryName, response), "Response submitted.")}
      onResolve={(queryName, comment) => run(() => resolveQuery(name, queryName, comment), "Query closed.")}
      onReopen={(queryName, reason) => run(() => reopenQuery(name, queryName, reason), "Query reopened.")}
    />
  );
}

export function DetailsTab() {
  return <DetailsSectionTab formTab="Request Info" />;
}

export function ActivityTab() {
  const { id = "" } = useParams();
  const name = decodeURIComponent(id);
  const comments = useQuery({ queryKey: queryKeys.comments(name), queryFn: () => getWorkflowComments(name) });
  const timeline = useQuery({ queryKey: queryKeys.workflowTimeline(name), queryFn: () => getWorkflowTimeline(name) });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-[17px] font-semibold text-ims-ink">Comments</h2>
        {comments.isLoading ? <SkeletonBlock className="h-40" /> : <CommentTimeline comments={comments.data?.items ?? []} />}
      </div>
      <div>
        <h2 className="mb-3 text-[17px] font-semibold text-ims-ink">Stage history</h2>
        {timeline.isLoading ? (
          <SkeletonBlock className="h-40" />
        ) : (
          <WorkflowTimeline current={timeline.data?.current_state_label || ""} entries={timeline.data?.entries ?? []} />
        )}
      </div>
    </div>
  );
}
