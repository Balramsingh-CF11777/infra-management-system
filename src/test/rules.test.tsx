import { fireEvent, render, screen } from "@testing-library/react";
import { commentRequired, displayRole, displayState, ownerPercentagesValid, queryBlocksAction } from "@/lib/rules";
import { visibleNavigation } from "@/config/navigation";
import { WorkflowActions } from "@/components/workflow/WorkflowActions";
import type { WorkflowAction } from "@/types/api";

describe("workflow presentation", () => {
  it("hides legacy approval manager labels", () => {
    expect(displayRole("Approval Manager 2")).toBe("Infra Head");
    expect(displayState("Assigned to Approval Manager 3")).toBe("Assigned to Finance Head");
  });

  it("requires a comment for send back and approve", () => {
    expect(commentRequired("Send Back")).toBe(true);
    expect(commentRequired("Approve")).toBe(true);
  });

  it("blocks forward actions when queries are open", () => {
    expect(queryBlocksAction("Assigned to Infra Head", "Assigned to Finance Head", 1)).toBe(true);
    expect(queryBlocksAction("Assigned to Infra Head", "Assigned to HO Infra Legal Team on Document Verification", 1)).toBe(true);
    expect(queryBlocksAction("Assigned to ZIBP", "Assigned to RIBP for Property Details", 1)).toBe(false);
    expect(queryBlocksAction("Assigned to RIBP for Property Details", "Assigned to RLM", 2)).toBe(false);
  });

  it("requires owner percentages to total 100 when any owner is set", () => {
    expect(ownerPercentagesValid(["60", "40", "", ""])).toBe(true);
    expect(ownerPercentagesValid(["60", "30", "", ""])).toBe(false);
    expect(ownerPercentagesValid(["", "", "", ""])).toBe(true);
  });

  it("shows administration only for admin modules", () => {
    const labels = visibleNavigation(["dashboard", "requests", "admin"]).map((item) => item.label);
    expect(labels).toContain("Administration");
    expect(visibleNavigation(["dashboard", "requests"]).map((item) => item.id)).not.toContain("admin");
  });
});

describe("workflow action dialog", () => {
  const action: WorkflowAction = {
    action: "Send Back",
    label: "Send Back",
    next_state: "Assigned to RLM",
    next_state_label: "Assigned to RLM",
    requires_comment: true,
    send_back: true,
    blocked: false,
    block_reason: "",
  };

  it("asks for a comment before confirming send back", () => {
    const onSubmit = vi.fn();
    render(<WorkflowActions actions={[action]} pending={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Send Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("A comment is required for this action.")).toBeInTheDocument();
  });
});
