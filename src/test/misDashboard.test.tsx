import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { useSession, useToasts } from "@/stores/session";
import type { MisCreateForm, MisDashboard, UserContext } from "@/types/api";

const dashboard = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  getMyPendingActions: vi.fn(),
}));
const mis = vi.hoisted(() => ({
  getMisDashboard: vi.fn(),
  getMisRequests: vi.fn(),
  getMisCreateForm: vi.fn(),
  createMisRequest: vi.fn(),
  misDeskPath: (name: string) => `/app/mis-product-wise-branch-initiate/${encodeURIComponent(name)}`,
}));
vi.mock("@/api/dashboard", () => dashboard);
vi.mock("@/api/misDashboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/misDashboard")>();
  return { ...actual, ...mis };
});

const row = {
  name: "PBIU/09102026/GL/1",
  product_line: "GL",
  year: "2026-2027",
  branches_requested: 12,
  workflow_state: "Approval Pending",
  workflow_state_label: "Approval Pending",
  owner: "mis@example.com",
  owner_name: "MIS User",
  creation: "2026-10-09 10:00:00",
  modified: "2026-10-09 10:00:00",
  actions: ["Complete", "Reject"] as string[],
};

function misDash(overrides: Partial<MisDashboard> = {}): MisDashboard {
  return {
    doctype: "MIS Product Wise Branch Initiate",
    fy: "current",
    fy_options: [
      { id: "all", label: "All", range: "" },
      { id: "current", label: "Current Year", range: "FY 2026-27" },
      { id: "last", label: "Last Year", range: "FY 2025-26" },
    ],
    kpis: { total: 7, in_progress: 3 },
    branch_count_label: "New Branch Count Included",
    recent: [row],
    recent_total: 7,
    can_create: true,
    sections: [
      { state: "Draft", label: "Draft", count: 0, items: [] },
      { state: "Approval Pending", label: "Approval Pending", count: 1, items: [row] },
      { state: "Complete", label: "Complete", count: 0, items: [] },
    ].filter((section) => section.count > 0),
    ...overrides,
  };
}

const createForm: MisCreateForm = {
  doctype: "MIS Product Wise Branch Initiate",
  year: "2026-2027",
  year_label: "FY 2026-2027",
  product_lines: ["GL", "VF"],
  branch_count_field: "new_branch_count_included",
  branch_count_label: "New Branch Count Included",
  product_field: "product_line",
  year_field: "year",
};

function misUser(roles: string[], canCreate: boolean): UserContext {
  return {
    user: "mis@example.com",
    full_name: "MIS User",
    roles,
    role_labels: roles,
    product_lines: [],
    zones: [],
    regions: [],
    areas: [],
    permissions: { is_admin: false, can_administer: false, can_create_mis_request: canCreate },
    dashboard: "mis",
    default_role: roles[0],
    default_role_label: roles[0],
    available_modules: ["dashboard"],
    scope: [],
    api_mode: "compat",
  };
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("IMS MIS User dashboard (Frappe shared APIs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mis.getMisCreateForm.mockResolvedValue(createForm);
  });

  it("shows themed overview KPIs with art, View All card, and workflow state sections", async () => {
    mis.getMisDashboard.mockResolvedValue(misDash());
    useSession.getState().setUser(misUser(["IMS MIS User"], true));
    renderAt("/dashboard");

    expect(await screen.findByText(/Hey MIS!/)).toBeInTheDocument();
    expect(screen.getByText("MIS Branch Requests")).toBeInTheDocument();
    expect(screen.getByText("All Requests")).toBeInTheDocument();
    expect((await screen.findByText("Total Branch Requests Raised")).parentElement).toHaveTextContent("7");
    expect(screen.getByText("Requests In Progress").parentElement).toHaveTextContent("3");
    expect(screen.getByLabelText(/Financial year/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Search by request ID/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Create MIS Request/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeInTheDocument();
    expect((await screen.findAllByText("Approval Pending")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("PBIU/09102026/GL/1").length).toBeGreaterThan(0);
    expect(dashboard.getDashboardSummary).not.toHaveBeenCalled();
  });

  it("hides Complete until revealed and omits Draft owner/state columns", async () => {
    const draft = {
      ...row,
      name: "PBIU/09102026/GL/DRAFT",
      workflow_state: "Draft",
      workflow_state_label: "Draft",
      actions: [] as string[],
    };
    const done = {
      ...row,
      name: "PBIU/09102026/GL/DONE",
      workflow_state: "Complete",
      workflow_state_label: "Complete",
      actions: [] as string[],
    };
    mis.getMisDashboard.mockResolvedValue(
      misDash({
        sections: [
          { state: "Draft", label: "Draft", count: 1, items: [draft] },
          { state: "Approval Pending", label: "Approval Pending", count: 1, items: [row] },
          { state: "Complete", label: "Complete", count: 1, items: [done] },
        ],
      }),
    );
    useSession.getState().setUser(misUser(["IMS MIS User"], true));
    renderAt("/dashboard");

    expect((await screen.findAllByText("PBIU/09102026/GL/DRAFT")).length).toBeGreaterThan(0);
    const draftSection = screen.getByRole("heading", { name: "Draft" }).closest("section");
    expect(draftSection).toBeTruthy();
    expect(within(draftSection!).queryByText("Initiated By")).not.toBeInTheDocument();
    expect(within(draftSection!).queryByText("Current Workflow State")).not.toBeInTheDocument();
    expect(screen.queryByText("PBIU/09102026/GL/DONE")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show Complete/ }));
    expect((await screen.findAllByText("PBIU/09102026/GL/DONE")).length).toBeGreaterThan(0);
  });

  it("creates via Frappe insert fields and refreshes", async () => {
    mis.getMisDashboard.mockResolvedValue(misDash());
    mis.createMisRequest.mockResolvedValue({ name: "PBIU/09102026/VF/2" });
    useSession.getState().setUser(misUser(["IMS MIS User"], true));
    renderAt("/dashboard");

    fireEvent.click(await screen.findByRole("button", { name: /Create MIS Request/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(await within(dialog).findByLabelText(/Product Line/), { target: { value: "VF" } });
    fireEvent.change(within(dialog).getByLabelText(/New Branch Count Included/), { target: { value: "5" } });
    const calls = mis.getMisDashboard.mock.calls.length;
    fireEvent.click(within(dialog).getByRole("button", { name: /Submit for Approval/ }));
    await waitFor(() => {
      expect(mis.createMisRequest.mock.calls[0]?.[0]).toEqual({
        product_line: "VF",
        new_branch_count_included: 5,
      });
      expect(Array.isArray(mis.createMisRequest.mock.calls[0]?.[1])).toBe(true);
    });
    await waitFor(() => expect(mis.getMisDashboard.mock.calls.length).toBeGreaterThan(calls));
    expect(useToasts.getState().toasts.map((toast) => toast.message)).toContain("MIS request PBIU/09102026/VF/2 created.");
  });
});
