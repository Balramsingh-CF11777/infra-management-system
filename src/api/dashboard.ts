import { callMethod } from "@/api/client";
import { getCompatDashboard, getCompatPending } from "@/api/compat";
import { useSession } from "@/stores/session";
import type { DashboardSummary, PendingItem } from "@/types/api";

function compatUser() {
  const user = useSession.getState().user;
  return user?.api_mode === "compat" ? user : null;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  const user = compatUser();
  if (user) return getCompatDashboard(user);
  return callMethod<DashboardSummary>("infra_ms.portal.dashboard.get_dashboard_summary");
}

export function getMyPendingActions(): Promise<{ total: number; items: PendingItem[] }> {
  if (compatUser()) return getCompatPending();
  return callMethod<{ total: number; items: PendingItem[] }>("infra_ms.portal.dashboard.get_my_pending_actions");
}
