import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { getMyPendingActions } from "@/api/dashboard";
import { queryKeys } from "@/api/keys";

/** Mobile-only: back + section title + notifications (Chola header is hidden on these pages). */
export function VerificationFlowTopBar({ title, fallback = "/chola360/leads" }: { title: string; fallback?: string }) {
  const pending = useQuery({ queryKey: queryKeys.pending, queryFn: getMyPendingActions });
  const pendingTotal = pending.data?.total ?? 0;

  return (
    <div className="flex items-center gap-2 pt-[env(safe-area-inset-top)]">
      <BackButton
        fallback={fallback}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
        iconClassName="h-5 w-5"
      />
      <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold leading-6 text-white">{title}</h1>
      <NavLink to="/pending" aria-label="Notifications" className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white no-underline">
        <Bell className="h-5 w-5" />
        {pendingTotal > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff3b3b] ring-2 ring-[#3a2a5e]" /> : null}
      </NavLink>
    </div>
  );
}

/** True on mobile lead / prospect verification flows that own the top chrome. */
export function isLeadVerificationFlowPath(pathname: string) {
  return /\/chola360\/(leads|prospects)\/.+\/(site-verification|site-images|property-details|owner-details|facility-details|documents|loi)\/?$/.test(
    pathname,
  );
}

/** Site Image Capture owns its own title bar — hide the Chola logo header on all breakpoints. */
export function isSiteImageCapturePath(pathname: string) {
  return /\/chola360\/(leads|prospects)\/.+\/site-images\/?$/.test(pathname);
}
