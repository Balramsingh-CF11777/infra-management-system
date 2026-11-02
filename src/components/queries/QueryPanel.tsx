import { useState } from "react";
import type { QueryItem, QueryList } from "@/types/api";
import type { RaiseQueryInput } from "@/api/query";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatWhen } from "@/lib/format";
import { frappeFileUrl } from "@/config/runtime";

type Outcome = Promise<boolean>;

export function QueryPanel({
  data,
  busy,
  onRaise,
  onRespond,
  onResolve,
  onReopen,
}: {
  data: QueryList;
  busy: boolean;
  onRaise: (input: RaiseQueryInput) => Outcome;
  onRespond: (queryName: string, response: string) => Outcome;
  onResolve: (queryName: string, comment: string) => Outcome;
  onReopen: (queryName: string, reason: string) => Outcome;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [respondedBy, setRespondedBy] = useState("");
  const noResponders = data.can_raise && data.responder_options.length === 0;

  return (
    <div className="space-y-4">
      {data.can_raise && (
        <form
          className="rounded-2xl border border-slate-100 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onRaise({ subject, description, respondedBy }).then((done) => {
              if (!done) return;
              setSubject("");
              setDescription("");
              setRespondedBy("");
            });
          }}
        >
          <h3 className="text-sm font-semibold text-ims-primary">Raise a query</h3>
          <p className="mt-1 text-xs text-slate-500">Saved in {data.raise_table_label}.</p>
          <label className="mt-3 block text-sm" htmlFor="query-subject">
            Subject
          </label>
          <input
            id="query-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="ims-field mt-1"
            required
          />
          <label className="mt-3 block text-sm" htmlFor="query-description">
            Description
          </label>
          <textarea
            id="query-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="ims-field mt-1 min-h-20"
            required
          />
          <label className="mt-3 block text-sm" htmlFor="query-responder">
            To be answered by
          </label>
          <select
            id="query-responder"
            value={respondedBy}
            onChange={(event) => setRespondedBy(event.target.value)}
            className="ims-field mt-1"
            required
          >
            <option value="">Select a user</option>
            {data.responder_options.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
          {noResponders && (
            <p className="mt-2 text-xs text-amber-800">
              No HO Infra Legal Team or Regional Infra Business Partner user has worked on this request yet, so there is
              nobody to send a query to.
            </p>
          )}
          <button
            type="submit"
            disabled={busy || noResponders}
            className="mt-3 ims-btn-primary disabled:opacity-50"
          >
            Raise query
          </button>
        </form>
      )}
      {data.items.length === 0 && (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No queries have been raised on this request.</p>
      )}
      <ul className="space-y-3">
        {data.items.map((item) => (
          <QueryCard
            key={item.name}
            item={item}
            busy={busy}
            onRespond={onRespond}
            onResolve={onResolve}
            onReopen={onReopen}
          />
        ))}
      </ul>
    </div>
  );
}

function QueryCard({
  item,
  busy,
  onRespond,
  onResolve,
  onReopen,
}: {
  item: QueryItem;
  busy: boolean;
  onRespond: (queryName: string, response: string) => Outcome;
  onResolve: (queryName: string, comment: string) => Outcome;
  onReopen: (queryName: string, reason: string) => Outcome;
}) {
  const [draft, setDraft] = useState("");
  const canAct = item.can_respond || item.can_close || item.can_reopen;
  const clear = (done: boolean) => {
    if (done) setDraft("");
  };

  return (
    <li className="rounded-2xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-800">{item.subject || item.query_id || item.name}</p>
        <StatusBadge label={item.status || "Open"} tone={item.blocking ? "open" : "done"} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {item.table_label}
        {item.query_id ? ` · ${item.query_id}` : ""} · {item.raised_by} · {formatWhen(item.raised_on)}
      </p>
      {item.responded_by && <p className="mt-1 text-xs text-slate-500">To be answered by {item.responded_by}</p>}
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>
      {item.attachment && (
        <a className="mt-1 inline-block text-sm text-ims-primary underline" href={frappeFileUrl(item.attachment)} target="_blank" rel="noopener noreferrer">
          View query attachment
        </a>
      )}
      {item.response && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-medium text-ims-primary">Latest response</p>
          <p className="mt-1 whitespace-pre-wrap">{item.response}</p>
          {item.response_attachment && (
            <a className="mt-2 inline-block text-ims-primary underline" href={frappeFileUrl(item.response_attachment)} target="_blank" rel="noopener noreferrer">
              View attachment
            </a>
          )}
        </div>
      )}
      {item.reopen_reason && (
        <p className="mt-2 text-xs text-amber-900">Reopen reason: {item.reopen_reason}</p>
      )}
      {canAct && (
        <>
          <label className="mt-3 block text-sm" htmlFor={`query-note-${item.name}`}>
            {item.can_respond ? "Response" : "Comment"}
          </label>
          <textarea
            id={`query-note-${item.name}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="ims-field mt-1 min-h-16"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {item.can_respond && (
              <button
                type="button"
                className="ims-btn-primary min-h-10 px-3 disabled:opacity-50"
                disabled={busy || !draft.trim()}
                onClick={() => void onRespond(item.name, draft).then(clear)}
              >
                Submit response
              </button>
            )}
            {item.can_close && (
              <button
                type="button"
                className="rounded-xl bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={busy || !draft.trim()}
                onClick={() => void onResolve(item.name, draft).then(clear)}
              >
                Close query
              </button>
            )}
            {item.can_reopen && (
              <button
                type="button"
                className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-950 disabled:opacity-50"
                disabled={busy || !draft.trim()}
                onClick={() => void onReopen(item.name, draft).then(clear)}
              >
                Reopen
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
