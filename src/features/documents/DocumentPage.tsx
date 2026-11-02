import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { executeRecordAction, getRecord, getRecordActions, getRecordActivity, saveRecord, uploadRecordAttachment } from "@/api/records";
import { queryKeys } from "@/api/keys";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState, SkeletonBlock } from "@/components/common/EmptyState";
import { DocumentForm } from "@/components/documents/DocumentForm";
import { WorkflowActions } from "@/components/workflow/WorkflowActions";
import { WorkflowTimeline } from "@/components/workflow/WorkflowTimeline";
import { CommentTimeline } from "@/components/workflow/CommentTimeline";
import { documentPath } from "@/lib/documentPath";
import { formatWhen } from "@/lib/format";
import { usesMisDashboard } from "@/lib/misAccess";
import { useSession, useToasts } from "@/stores/session";
import { ApiError, type DocumentPayload, type WorkflowAction } from "@/types/api";

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const fields = (error.details as { fields?: string[] } | undefined)?.fields;
  return fields?.length ? `${error.message} (${fields.join(", ")})` : error.message;
}

export function DocumentFormPanel({
  doctype,
  name,
  forcedTab,
  hideInnerTabs = false,
  autoEdit = false,
}: {
  doctype: string;
  name: string;
  /** When set (workspace nav), show only this Desk/SPA tab's sections. */
  forcedTab?: string;
  hideInnerTabs?: boolean;
  /** Open in edit mode when the form is editable (RIBP Property Details). */
  autoEdit?: boolean;
}) {
  const client = useQueryClient();
  const push = useToasts((state) => state.push);
  const [keepEditing, setKeepEditing] = useState(autoEdit);
  const [formTab, setFormTab] = useState<string | undefined>(forcedTab);
  const document = useQuery({ queryKey: queryKeys.document(doctype, name), queryFn: () => getRecord(doctype, name) });
  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => saveRecord(doctype, name, values, document.data?.summary.modified),
    onSuccess: (data) => applyUpdate(data),
  });
  const upload = useMutation({
    mutationFn: (input: { fieldname: string; file: File }) =>
      uploadRecordAttachment(doctype, name, input.fieldname, input.file, document.data?.summary.modified),
    onSuccess: (data) => applyUpdate(data),
  });

  async function applyUpdate(data: DocumentPayload) {
    client.setQueryData(queryKeys.document(doctype, name), data);
    await client.invalidateQueries({ queryKey: queryKeys.documentActions(doctype, name) });
    await client.invalidateQueries({ queryKey: queryKeys.documentActivity(doctype, name) });
    await client.invalidateQueries({ queryKey: queryKeys.request(name) });
    if (doctype === "MIS Product Wise Branch Initiate") {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["misDashboard"] }),
        client.invalidateQueries({ queryKey: ["misRequests"] }),
      ]);
    }
  }

  if (document.isLoading) return <SkeletonBlock className="h-64" />;
  if (document.isError || !document.data) {
    return <EmptyState title="Record unavailable" body={errorMessage(document.error, "This record could not be opened.")} />;
  }
  const formPayload =
    forcedTab && document.data
      ? {
          ...document.data,
          form: {
            ...document.data.form,
            sections: document.data.form.sections.filter((section) => section.tab === forcedTab),
          },
        }
      : document.data;

  return (
    <DocumentForm
      key={`${document.data.summary.modified}-${forcedTab || formTab || ""}`}
      payload={formPayload!}
      saving={save.isPending}
      initialEditing={keepEditing || autoEdit}
      initialTab={forcedTab || formTab}
      hideTabs={hideInnerTabs || Boolean(forcedTab)}
      onTabChange={setFormTab}
      onSave={async (values) => {
        try {
          await save.mutateAsync(values);
          setKeepEditing(false);
          push("Saved.", "success");
          return true;
        } catch (error) {
          push(errorMessage(error, "The record could not be saved."), "error");
          return false;
        }
      }}
      onUpload={async (fieldname, file) => {
        try {
          setKeepEditing(true);
          await upload.mutateAsync({ fieldname, file });
          push(`${file.name} uploaded.`, "success");
          return true;
        } catch (error) {
          push(errorMessage(error, "The file could not be uploaded."), "error");
          return false;
        }
      }}
    />
  );
}

export function DocumentPage() {
  const { doctype: encodedType = "", name: encodedName = "" } = useParams();
  const doctype = decodeURIComponent(encodedType);
  const name = decodeURIComponent(encodedName);
  const client = useQueryClient();
  const push = useToasts((state) => state.push);
  const user = useSession((state) => state.user);
  const misDashboard = usesMisDashboard(user);
  const [tab, setTab] = useState<"details" | "activity">("details");

  const document = useQuery({ queryKey: queryKeys.document(doctype, name), queryFn: () => getRecord(doctype, name) });
  const actions = useQuery({
    queryKey: queryKeys.documentActions(doctype, name),
    queryFn: () => getRecordActions(doctype, name),
    enabled: document.isSuccess,
  });
  const activity = useQuery({
    queryKey: queryKeys.documentActivity(doctype, name),
    queryFn: () => getRecordActivity(doctype, name),
    enabled: document.isSuccess && tab === "activity",
  });
  const execute = useMutation({
    mutationFn: (input: { action: WorkflowAction; comment: string }) =>
      executeRecordAction({
        doctype,
        name,
        action: input.action.action,
        comment: input.comment,
        expectedModified: document.data?.summary.modified,
        expectedNextState: input.action.next_state,
      }),
    onSuccess: async (data) => {
      push(`Moved to ${data.workflow_state_label}.`, "success");
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.document(doctype, name) }),
        client.invalidateQueries({ queryKey: queryKeys.documentActions(doctype, name) }),
        client.invalidateQueries({ queryKey: queryKeys.documentActivity(doctype, name) }),
        client.invalidateQueries({ queryKey: queryKeys.pending }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard }),
        client.invalidateQueries({ queryKey: ["misDashboard"] }),
        client.invalidateQueries({ queryKey: ["misRequests"] }),
      ]);
    },
  });

  if (document.isLoading) return <SkeletonBlock className="h-80" />;
  if (document.isError || !document.data) {
    return <EmptyState title="Record unavailable" body={errorMessage(document.error, "This record could not be opened.")} />;
  }
  const summary = document.data.summary;

  return (
    <article className="space-y-4">
      <header className="ims-card p-4 sm:p-5">
        <Link
          to={misDashboard ? "/dashboard" : `/documents/${encodeURIComponent(doctype)}`}
          className="text-xs font-medium text-ims-primary no-underline"
        >
          ← {misDashboard ? "Dashboard" : summary.doctype_label}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-ims-ink">{summary.title}</h1>
            {summary.title !== summary.name && <p className="text-sm text-slate-500">{summary.name}</p>}
          </div>
          {summary.workflow_state && <StatusBadge label={summary.workflow_state_label} />}
        </div>
        <dl className="mt-4 grid gap-3 text-sm min-[420px]:grid-cols-2 sm:grid-cols-3 [&_dd]:min-w-0">
          <div>
            <dt className="text-slate-500">Created by</dt>
            <dd>{summary.owner || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd>{formatWhen(summary.creation)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Last updated</dt>
            <dd>{formatWhen(summary.modified)}</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-slate-100 pt-4">
          {actions.isLoading ? (
            <SkeletonBlock className="h-10" />
          ) : (
            <WorkflowActions
              actions={actions.data?.actions ?? []}
              pending={execute.isPending}
              onSubmit={async (action, comment) => {
                try {
                  await execute.mutateAsync({ action, comment });
                } catch (error) {
                  push(errorMessage(error, "The workflow action could not be completed."), "error");
                }
              }}
            />
          )}
        </div>
      </header>
      {(document.data.related?.length ?? 0) > 0 && (
        <section className="ims-card p-4 sm:p-5" aria-labelledby="related-title">
          <h2 id="related-title" className="text-sm font-semibold text-ims-primary">
            Linked records
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {document.data.related?.map((item) => (
              <li key={`${item.doctype}-${item.name}`}>
                <Link to={documentPath(item.doctype, item.name)} className="block rounded-2xl bg-slate-50 px-3 py-2 no-underline">
                  <span className="text-sm font-medium text-slate-800">{item.doctype_label || item.doctype}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">{item.name}</span>
                  {item.workflow_state_label || item.workflow_state ? (
                    <span className="mt-1 block text-xs text-slate-500">{item.workflow_state_label || item.workflow_state}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav className="flex gap-2" aria-label="Record sections">
        {(["details", "activity"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === item ? "bg-ims-drawer text-ims-ink ring-1 ring-ims-field-line" : "bg-white text-slate-600 ring-1 ring-ims-line hover:text-ims-ink"
            }`}
          >
            {item === "details" ? "Details" : "Activity"}
          </button>
        ))}
      </nav>
      <section className="ims-card p-4 sm:p-5">
        {tab === "details" ? (
          <DocumentFormPanel doctype={doctype} name={name} />
        ) : activity.isLoading ? (
          <SkeletonBlock className="h-40" />
        ) : activity.data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-ims-primary">Stage history</h2>
              <WorkflowTimeline current={activity.data.current_state_label} entries={activity.data.entries} />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold text-ims-primary">Comments</h2>
              <CommentTimeline comments={activity.data.comments} />
            </div>
          </div>
        ) : (
          <EmptyState title="Activity unavailable" body={errorMessage(activity.error, "Activity could not be loaded.")} />
        )}
      </section>
    </article>
  );
}
