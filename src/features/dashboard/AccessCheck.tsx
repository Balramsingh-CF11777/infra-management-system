import { useQuery } from "@tanstack/react-query";
import { getRoleAccess } from "@/api/compat";
import { runtimeConfig } from "@/config/runtime";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { UserContext } from "@/types/api";

export function AccessCheck({ user }: { user: UserContext }) {
  const access = useQuery({ queryKey: ["roleAccess"], queryFn: () => getRoleAccess() });
  const server = runtimeConfig.frappeUrl || import.meta.env.VITE_FRAPPE_API_URL || window.location.origin;

  return (
    <section className="ims-card p-4 sm:p-5" aria-labelledby="access-check-title">
      <h2 id="access-check-title" className="text-[17px] font-semibold text-ims-ink">
        Access check
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Signed in to <strong>{server}</strong> as <strong>{user.user}</strong>. The portal API is not installed on this site yet, so this
        view is read-only and uses the existing Infra Management role queues. Workflow actions stay in Frappe until the portal API is installed.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Roles</dt>
          <dd>{user.role_labels.length ? user.role_labels.join(", ") : "No Infra Management roles returned"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Product lines (Infra User Based Role Master)</dt>
          <dd>{user.product_lines.length ? user.product_lines.join(", ") : "None mapped"}</dd>
        </div>
      </dl>
      <h3 className="mt-5 text-sm font-semibold text-ims-primary">Role queues on the server</h3>
      {access.isLoading ? (
        <SkeletonBlock className="mt-2 h-32" />
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {(access.data ?? []).map((entry) => (
            <li key={entry.method} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
              <span>{entry.label}</span>
              {entry.allowed ? (
                <StatusBadge label={`Allowed · ${entry.total} pending`} tone="done" />
              ) : (
                <StatusBadge label={entry.error ? "Unavailable" : "No access"} tone="neutral" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
