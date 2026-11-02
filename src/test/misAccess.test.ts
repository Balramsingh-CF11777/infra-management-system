import { describe, expect, it } from "vitest";
import { normalizeUserContext, usesMisDashboard } from "@/lib/misAccess";
import type { UserContext } from "@/types/api";

function user(roles: string[], dashboard?: UserContext["dashboard"]): UserContext {
  return {
    user: "mis@example.com",
    full_name: "MIS User",
    roles,
    role_labels: roles,
    product_lines: [],
    zones: [],
    regions: [],
    areas: [],
    permissions: { is_admin: false, can_administer: false },
    dashboard,
    default_role: roles[0] || "",
    default_role_label: roles[0] || "",
    available_modules: ["dashboard", "pending", "new_branch"],
    scope: [],
    api_mode: "compat",
  };
}

describe("usesMisDashboard", () => {
  it("uses the server flag when present", () => {
    expect(usesMisDashboard(user(["Business Team"], "mis"))).toBe(true);
    expect(usesMisDashboard(user(["IMS MIS User"], "default"))).toBe(false);
  });

  it("falls back to MIS-only roles when the server omits dashboard", () => {
    expect(usesMisDashboard(user(["IMS MIS User", "Employee"]))).toBe(true);
    expect(usesMisDashboard(user(["IMS MIS Approver"]))).toBe(true);
    expect(usesMisDashboard(user(["IMS MIS"]))).toBe(true);
    expect(usesMisDashboard(user(["IMS MIS User", "Business Team"]))).toBe(false);
    expect(usesMisDashboard(user(["Regional Infra Business Partner"]))).toBe(false);
  });

  it("normalizes omitted dashboard and create permission from roles", () => {
    const normalized = normalizeUserContext(user(["IMS MIS User"]));
    expect(normalized.dashboard).toBe("mis");
    expect(normalized.permissions.can_create_mis_request).toBe(true);
    expect(normalized.available_modules).toEqual(["dashboard"]);
  });

  it("removes common Frappe roles from Working as options", () => {
    const normalized = normalizeUserContext(user(["Desk User", "Guest", "All", "IMS MIS User"]));
    expect(normalized.roles).toEqual(["IMS MIS User"]);
    expect(normalized.role_labels).toEqual(["IMS MIS User"]);
    expect(normalized.default_role_label).toBe("IMS MIS User");
  });
});
