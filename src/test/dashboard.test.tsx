import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { useSession } from "@/stores/session";
import type { DashboardSummary, PendingItem, UserContext } from "@/types/api";

const item: PendingItem = {
  module: "requests",
  doctype: "Proposed Branch Details",
  name: "NBO/Trichy/1044",
  reference: "NBO/Trichy/1044",
  request_id: "NBO/Trichy/1044",
  property_id: "NBI/09102026/GL-Testing/6",
  branch: "Thillai Nagar",
  zone: "South",
  region: "Trichy",
  workflow_state: "Send Back to RIBP",
  workflow_state_label: "Send Back to RIBP",
  role: "RIBP",
  role_label: "RIBP",
  pending_since: "2026-10-01 10:00:00",
};

const summary: DashboardSummary = {
  full_name: "Anbarasan DP",
  primary_role: "RIBP",
  primary_role_label: "RIBP",
  generated_at: "2026-10-09 10:00:00",
  kpis: [],
  alerts: [],
  queues: [{ role_label: "RIBP", count: 1, items: [item] }],
  home: {
    product_line: "GL",
    launches: 3,
    status: { review_pending: 4, rework_raised: 1, approved: 2 },
    regions: [{ id: "tamilnadu", label: "TamilNadu", areas: 2, properties: 5 }],
  },
};

vi.mock("@/api/dashboard", () => ({
  getDashboardSummary: () => Promise.resolve(summary),
  getMyPendingActions: () => Promise.resolve({ total: 1, items: [item] }),
}));

const user: UserContext = {
  user: "anbarasan@example.com",
  full_name: "Anbarasan DP",
  roles: ["RIBP"],
  role_labels: ["RIBP"],
  product_lines: ["Gold Loan"],
  zones: [],
  regions: [],
  areas: [],
  permissions: { is_admin: false, can_administer: false },
  default_role: "RIBP",
  default_role_label: "RIBP",
  available_modules: ["dashboard", "pending", "requests"],
  scope: [],
  api_mode: "portal",
};

describe("themed dashboard", () => {
  it("renders the overview tiles, region cards, and task table inside the app shell", async () => {
    useSession.getState().setUser(user);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Total Properties")).toBeInTheDocument();
    expect(screen.getByText("Review Pending").parentElement).toHaveTextContent("4");
    expect(screen.getByText("TamilNadu")).toBeInTheDocument();
    expect(screen.getAllByText("NBO/Trichy/1044").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NBI/09102026/GL-Testing/6").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Send Back to RIBP")[0].parentElement?.className).toContain("text-[#7c4dd6]");
    expect(screen.getAllByAltText("Chola").length).toBeGreaterThan(0);
  });
});
