import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentForm } from "@/components/documents/DocumentForm";
import type { DocumentField, DocumentPayload } from "@/types/api";

function payload(fields: DocumentField[]): DocumentPayload {
  return {
    summary: {
      doctype: "MIS Product Wise Branch Initiate",
      doctype_label: "MIS Product Wise Branch",
      name: "PBIU/12102026/GL",
      title: "PBIU/12102026/GL",
      workflow_state: "Draft",
      workflow_state_label: "Draft",
      docstatus: 0,
      owner: "mis@example.com",
      creation: "",
      modified: "2026-10-12 07:00:00",
    },
    form: { can_write: true, editable: true, sections: [{ label: "Files", tab: "", fields }] },
  };
}

const attachField: DocumentField = {
  fieldname: "approval_mail",
  label: "Approval Mail",
  fieldtype: "Attach",
  options: "",
  description: "",
  reqd: true,
  read_only: false,
  value: "",
};

describe("DocumentForm attachments", () => {
  it("uploads a file for an editable Attach field", async () => {
    const onUpload = vi.fn().mockResolvedValue(true);
    render(<DocumentForm payload={payload([attachField])} saving={false} onSave={vi.fn()} onUpload={onUpload} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("No file attached")).toBeInTheDocument();

    const file = new File(["approval"], "approval.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/Approval Mail/), { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith("approval_mail", file));
  });

  it("keeps a read-only Attach field as a link", () => {
    const readOnly = { ...attachField, read_only: true, value: "/files/approval.pdf" };
    render(<DocumentForm payload={payload([readOnly])} saving={false} onSave={vi.fn()} onUpload={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Upload|Replace/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View attachment" })).toBeInTheDocument();
  });
});
