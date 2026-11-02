import { useId, useRef } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { MIS_DOCUMENT_TYPES, type MisAttachmentDraft, type MisAttachmentRow, type MisDocumentType } from "@/api/misDashboard";
import { frappeFileUrl } from "@/config/runtime";

function newDraft(): MisAttachmentDraft {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, document_type: "", file: null };
}

function attachmentLabel(row: MisAttachmentRow) {
  const fromUrl = row.attachment.split("file_name=")[1]?.split("&")[0];
  return row.file_name || (fromUrl ? decodeURIComponent(fromUrl) : "") || "View file";
}

export function MisAttachmentEditor({
  rows,
  onChange,
  existing = [],
  onExistingChange,
}: {
  rows: MisAttachmentDraft[];
  onChange: (rows: MisAttachmentDraft[]) => void;
  existing?: MisAttachmentRow[];
  onExistingChange?: (rows: MisAttachmentRow[]) => void;
}) {
  const inputId = useId();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const total = existing.length + rows.length;

  function update(id: string, patch: Partial<MisAttachmentDraft>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ims-line">
      <div className="bg-[#00c2d7] px-4 py-2.5">
        <h3 className="text-[15px] font-semibold text-ims-ink">Attachment</h3>
      </div>
      <div className="bg-white p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Attachments</p>
        <div className="overflow-x-auto rounded-lg border border-ims-line">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead className="bg-[#00c2d7]/35 text-[12px] font-semibold text-ims-ink">
              <tr>
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">
                  Document Type <span className="text-rose-600">*</span>
                </th>
                <th className="px-3 py-2">
                  Attachment <span className="text-rose-600">*</span>
                </th>
                <th className="px-3 py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {existing.map((row, index) => {
                const href = frappeFileUrl(row.attachment, row.file_name);
                return (
                  <tr key={row.name || `existing-${index}`} className="border-t border-ims-line">
                    <td className="px-3 py-2 align-middle text-slate-600">{index + 1}</td>
                    <td className="px-3 py-2 align-middle font-medium text-ims-ink">{row.document_type || "—"}</td>
                    <td className="px-3 py-2 align-middle">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="ims-link inline-flex max-w-full items-center gap-1 truncate">
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{attachmentLabel(row)}</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      {onExistingChange && (
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-ims-bg hover:text-rose-600"
                          aria-label={`Remove attachment row ${index + 1}`}
                          onClick={() => onExistingChange(existing.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-ims-line">
                  <td className="px-3 py-2 align-middle text-slate-600">{existing.length + index + 1}</td>
                  <td className="px-3 py-2 align-middle">
                    <label className="sr-only" htmlFor={`${inputId}-type-${row.id}`}>
                      Document Type
                    </label>
                    <select
                      id={`${inputId}-type-${row.id}`}
                      value={row.document_type}
                      onChange={(event) => update(row.id, { document_type: event.target.value as MisDocumentType | "" })}
                      className="ims-field"
                      required={Boolean(row.file)}
                    >
                      <option value="" />
                      {MIS_DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      ref={(node) => {
                        fileRefs.current[row.id] = node;
                      }}
                      id={`${inputId}-file-${row.id}`}
                      type="file"
                      className="sr-only"
                      onChange={(event) => update(row.id, { file: event.target.files?.[0] ?? null })}
                    />
                    {row.file ? (
                      <button
                        type="button"
                        className="ims-link inline-flex max-w-full items-center gap-1 truncate text-left"
                        onClick={() => fileRefs.current[row.id]?.click()}
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{row.file.name}</span>
                      </button>
                    ) : (
                      <button type="button" className="ims-link font-medium" onClick={() => fileRefs.current[row.id]?.click()}>
                        Attach
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle text-right">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-ims-bg hover:text-rose-600"
                      aria-label={`Remove attachment row ${existing.length + index + 1}`}
                      onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-slate-500">
                    No attachments yet. Add a row to attach Email, Pdf, or Others.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button type="button" className="ims-btn-secondary mt-3 min-h-9 px-3 text-sm" onClick={() => onChange([...rows, newDraft()])}>
          <Plus className="h-4 w-4" />
          Add Row
        </button>
      </div>
    </section>
  );
}

export function MisAttachmentViewer({ rows }: { rows: MisAttachmentRow[] }) {
  if (!rows.length) {
    return (
      <section className="overflow-hidden rounded-xl border border-ims-line">
        <div className="bg-[#00c2d7] px-4 py-2.5">
          <h3 className="text-[15px] font-semibold text-ims-ink">Attachment</h3>
        </div>
        <p className="px-4 py-3 text-sm text-slate-500">No attachments on this request.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ims-line">
      <div className="bg-[#00c2d7] px-4 py-2.5">
        <h3 className="text-[15px] font-semibold text-ims-ink">Attachment</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
          <thead className="bg-[#00c2d7]/35 text-[12px] font-semibold text-ims-ink">
            <tr>
              <th className="px-3 py-2">No.</th>
              <th className="px-3 py-2">Document Type</th>
              <th className="px-3 py-2">Attachment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const href = frappeFileUrl(row.attachment, row.file_name);
              return (
                <tr key={row.name || `${row.document_type}-${index}`} className="border-t border-ims-line">
                  <td className="px-3 py-2 text-slate-600">{row.idx || index + 1}</td>
                  <td className="px-3 py-2 font-medium text-ims-ink">{row.document_type || "—"}</td>
                  <td className="px-3 py-2">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="ims-link inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachmentLabel(row)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function emptyAttachmentDrafts(): MisAttachmentDraft[] {
  return [newDraft()];
}
