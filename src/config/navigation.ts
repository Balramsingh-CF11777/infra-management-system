import type { LucideIcon } from "lucide-react";
import type { NavItem, UserContext } from "@/types/api";
import { APPROVER_MODULES, isApproverRole } from "@/config/leadRoles";
import { homePathForUser, usesArbmLeadHome } from "@/lib/arbmAccess";
import { usesRibLeadHome } from "@/lib/ribAccess";

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", module: "dashboard" },
  { id: "pending", label: "Pending With Me", path: "/pending", module: "pending" },
  { id: "leads", label: "Property Leads", path: "/chola360/leads", module: "leads" },
  { id: "requests", label: "Branch Requests", path: "/infra/requests", module: "requests" },
  { id: "documents", label: "Records", path: "/documents", module: "documents" },
  { id: "new-branch", label: "New Branch", path: "/new-branch", module: "new_branch" },
  { id: "operations", label: "Operations", path: "/operations", module: "operations" },
  { id: "reports", label: "Reports", path: "/reports", module: "reports" },
  { id: "admin", label: "Administration", path: "/admin", module: "admin" },
];

/** Mirrors portal auth MODULE_BY_ROLE (display labels) for bottom-bar scoping. */
export const MODULES_BY_ROLE_LABEL: Record<string, string[]> = {
  "System Manager": ["dashboard", "requests", "pending", "leads", "reports", "admin", "documents"],
  "HO Infra Branch Admin": ["dashboard", "requests", "pending", "leads", "reports", "admin", "documents"],
  "Business Head": ["dashboard", "requests", "pending", "leads"],
  "Finance Head": ["dashboard", "requests", "pending"],
  "Infra Head": ["dashboard", "requests", "pending", "leads"],
  "HO Corporate Legal Team": ["dashboard", "requests", "pending"],
  "Corporate Legal Team": ["dashboard", "requests", "pending"],
  "Approval Manager 1": ["dashboard", "requests", "pending", "leads"],
  "Approval Manager 2": ["dashboard", "requests", "pending", "leads"],
  "Approval Manager 3": ["dashboard", "requests", "pending", "leads"],
  "Approval Manager 4": ["dashboard", "requests", "pending", "leads"],
  "HO Infra Legal Team": ["dashboard", "requests", "pending", "operations"],
  "Zonal Infra Business Partner": ["dashboard", "requests", "pending", "leads"],
  RLM: ["dashboard", "requests", "pending"],
  "RB Manager": ["dashboard", "requests", "pending", "leads"],
  "Regional Infra Business Partner": ["dashboard", "requests", "pending", "leads", "operations"],
  "Area Regional Business Manager": ["dashboard", "pending", "leads"],
  "Business Team": ["dashboard", "requests", "pending", "new_branch"],
  "IMS MIS User": ["dashboard"],
  "IMS MIS Approver": ["dashboard"],
  "IMS MIS": ["dashboard"],
  "HO Infra Process Owner": ["dashboard", "operations"],
  "HO Infra Payment Team": ["dashboard", "operations"],
};

export type BottomNavItem = {
  to: string;
  label: string;
  iconKey: "home" | "pending" | "leads" | "create" | "requests" | "documents" | "new-branch";
  badge?: number;
  end?: boolean;
};

export function visibleNavigation(modules: string[], dashboard?: UserContext["dashboard"]): NavItem[] {
  const allowed = new Set(modules);
  if (allowed.size === 0 || dashboard === "mis") {
    return NAV_ITEMS.filter((item) => item.module === "dashboard");
  }
  return NAV_ITEMS.filter((item) => allowed.has(item.module) || item.module === "dashboard" || item.module === "pending");
}

/** Modules available for the current Working-as role (falls back to full session modules). */
export function modulesForRole(
  user: UserContext | null | undefined,
  activeRoleLabel?: string | null,
): string[] {
  const all = user?.available_modules ?? [];
  const role = (activeRoleLabel || user?.default_role_label || "").trim();
  if (!role) return all;
  const scoped = MODULES_BY_ROLE_LABEL[role] ?? (isApproverRole(role, user) ? APPROVER_MODULES : undefined);
  if (!scoped?.length) return all;
  const allow = new Set(scoped);
  // Keep documents if the session already unlocked it (permission-based).
  if (all.includes("documents")) allow.add("documents");
  // Keep every module this role owns, even when the session list was built before the role was mapped.
  const filtered = all.filter((module) => allow.has(module));
  const merged = [...filtered];
  for (const module of scoped) {
    if (!merged.includes(module)) merged.push(module);
  }
  return merged;
}

/**
 * Mobile bottom tabs by role / modules.
 * ARBM: Lead Request–first (Leads + Create). RIBP: Leads home. MIS: Dashboard only.
 */
export function bottomNavigationForUser(input: {
  user: UserContext | null | undefined;
  activeRole?: string | null;
  misDashboard?: boolean;
  pendingTotal?: number;
}): BottomNavItem[] {
  const { user, activeRole, misDashboard, pendingTotal = 0 } = input;
  if (misDashboard) {
    return [{ to: "/dashboard", label: "Home", iconKey: "home", end: true }];
  }

  const modules = new Set(modulesForRole(user, activeRole));
  const isArbm = usesArbmLeadHome(user, activeRole);
  const isRibp = usesRibLeadHome(user, activeRole);
  const leadHome = isArbm || isRibp;

  // Area Regional Business Manager — Lead Request is the primary workspace.
  if (isArbm) {
    const items: BottomNavItem[] = [
      { to: "/chola360/leads", label: "Leads", iconKey: "leads", end: true },
      { to: "/chola360/leads/new", label: "Create", iconKey: "create" },
    ];
    if (modules.has("pending")) {
      items.push({
        to: "/pending",
        label: "Tasks",
        iconKey: "pending",
        badge: pendingTotal > 0 ? pendingTotal : undefined,
      });
    }
    return items.slice(0, 4);
  }

  // Regional Infra Business Partner — create stays on the floating plus.
  if (isRibp) {
    const items: BottomNavItem[] = [
      { to: "/chola360/leads", label: "Leads", iconKey: "leads", end: true },
    ];
    if (modules.has("pending")) {
      items.push({
        to: "/pending",
        label: "Tasks",
        iconKey: "pending",
        badge: pendingTotal > 0 ? pendingTotal : undefined,
      });
    }
    if (modules.has("requests")) {
      items.push({ to: "/infra/requests", label: "Properties", iconKey: "requests" });
    }
    return items.slice(0, 4);
  }

  const home = homePathForUser(user, activeRole);
  const items: BottomNavItem[] = [
    {
      to: home,
      label: "Home",
      iconKey: "home",
      end: home === "/dashboard",
    },
  ];

  if (modules.has("pending")) {
    items.push({
      to: "/pending",
      label: "Tasks",
      iconKey: "pending",
      badge: pendingTotal > 0 ? pendingTotal : undefined,
    });
  }

  if (modules.has("leads") && !leadHome) {
    items.push({ to: "/chola360/leads", label: "Leads", iconKey: "leads" });
  }

  if (modules.has("requests")) {
    items.push({ to: "/infra/requests", label: "Properties", iconKey: "requests" });
  }

  if (modules.has("new_branch")) {
    items.push({ to: "/new-branch", label: "New Branch", iconKey: "new-branch" });
  }

  if (modules.has("documents")) {
    items.push({ to: "/documents", label: "Records", iconKey: "documents" });
  }

  // Keep four shortcuts max; Menu drawer covers the rest.
  return items.slice(0, 4);
}

/** Resolve Lucide icons for bottom tabs without importing icons into this config module. */
export function bottomNavIconMap(icons: {
  home: LucideIcon;
  pending: LucideIcon;
  leads: LucideIcon;
  create: LucideIcon;
  requests: LucideIcon;
  documents: LucideIcon;
  "new-branch": LucideIcon;
}): Record<BottomNavItem["iconKey"], LucideIcon> {
  return icons;
}
