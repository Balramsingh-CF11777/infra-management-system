import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  House,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Settings,
  Store,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMyPendingActions } from "@/api/dashboard";
import { logout } from "@/api/auth";
import { queryKeys } from "@/api/keys";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { bottomNavigationForUser, modulesForRole, visibleNavigation } from "@/config/navigation";
import { isLeadVerificationFlowPath, isSiteImageCapturePath } from "@/features/leads/VerificationFlowTopBar";
import { usesMisDashboard } from "@/lib/misAccess";
import { useSession } from "@/stores/session";
import Logo from "@/assets/design/chola-white.webp";

const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: House,
  pending: ClipboardList,
  leads: MapPin,
  requests: Building2,
  documents: FolderOpen,
  "new-branch": Store,
  operations: Wrench,
  reports: FileBarChart,
  admin: Settings,
};

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

export function AppLayout() {
  const user = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const setActiveRole = useSession((state) => state.setActiveRole);
  const clear = useSession((state) => state.clear);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const flowTopChrome = isLeadVerificationFlowPath(location.pathname);
  const siteImageCapture = isSiteImageCapturePath(location.pathname);
  const misDashboard = usesMisDashboard(user);
  const pending = useQuery({ queryKey: queryKeys.pending, queryFn: getMyPendingActions, enabled: !misDashboard });
  const roleModules = modulesForRole(user, activeRole);
  const items = visibleNavigation(roleModules, misDashboard ? "mis" : user?.dashboard);
  const roleLabels = user?.role_labels ?? [];
  const pendingTotal = pending.data?.total ?? 0;
  const displayName = user?.full_name || user?.user || "";
  const roleLabel = activeRole || user?.default_role_label || "";

  useEffect(() => {
    const onOpenNav = () => setOpen(true);
    document.addEventListener("ims:open-nav", onOpenNav);
    return () => document.removeEventListener("ims:open-nav", onOpenNav);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // The drawer is lg:hidden, so a resize to desktop would leave the page scroll-locked.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const roleSwitcher = (id: string) =>
    roleLabels.length > 1 ? (
      <select
        id={id}
        aria-label="Active role context"
        value={activeRole}
        onChange={(event) => setActiveRole(event.target.value)}
        className="ims-field min-h-10 py-2"
      >
        {roleLabels.map((role) => (
          <option key={role}>{role}</option>
        ))}
      </select>
    ) : null;

  const bottomIconByKey = {
    home: House,
    pending: ClipboardList,
    leads: MapPin,
    create: Plus,
    requests: Building2,
    documents: FolderOpen,
    "new-branch": Store,
  } as const;

  const bottomItems = bottomNavigationForUser({
    user,
    activeRole,
    misDashboard,
    pendingTotal,
  }).map((item) => ({
    ...item,
    icon: bottomIconByKey[item.iconKey],
  }));

  async function onLogout() {
    try {
      await logout();
    } finally {
      clear();
      navigate("/login", { replace: true });
    }
  }

  function submitSearch() {
    navigate(`/infra/requests?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  }

  return (
    <div
      className={[
        "flex h-dvh min-h-0 flex-col overflow-hidden lg:h-auto lg:min-h-screen lg:overflow-visible",
        // Match the flow bar so pull-to-overscroll does not flash the light app bg.
        flowTopChrome ? "bg-[#283769] lg:bg-ims-bg" : "bg-ims-bg",
      ].join(" ")}
    >
      <OfflineBanner />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,85vw)] flex-col overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="ims-header-bg flex items-center justify-between px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white">
          <img src={Logo} alt="Chola" className="h-8 w-auto" />
          <button type="button" className="rounded-lg p-2" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="flex items-center gap-3 border-b border-ims-line px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ims-primary text-sm font-semibold text-white">
            {initials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ims-ink">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3" aria-label="Primary">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.id] ?? House;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                    isActive ? "bg-ims-bg text-ims-primary" : "text-slate-600 hover:bg-slate-50"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.id === "pending" && pendingTotal > 0 && (
                  <span className="rounded-full bg-ims-primary px-2 py-0.5 text-xs font-semibold text-white">{pendingTotal}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-ims-line px-5 py-4">
          {roleLabels.length > 1 && (
            <label className="block text-xs font-medium text-slate-500" htmlFor="drawer-role">
              Working as
              <div className="mt-1">{roleSwitcher("drawer-role")}</div>
            </label>
          )}
          <button type="button" onClick={() => void onLogout()} className="ims-btn-secondary w-full">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <header
        className={`ims-header-bg sticky top-0 z-20 shrink-0 text-white ${
          flowTopChrome && !siteImageCapture ? "hidden lg:block" : ""
        }`}
      >
        <div className="mx-auto box-content flex h-14 max-w-[1440px] items-center gap-3 px-3 pt-[env(safe-area-inset-top)] sm:px-5 lg:h-16">
          <button type="button" className="rounded-lg p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="flex min-w-0 flex-1 justify-center lg:flex-none lg:justify-start">
            {siteImageCapture ? (
              <h1 className="truncate text-[17px] font-bold leading-6 text-white lg:text-[18px]">Site Image Capture</h1>
            ) : (
              <img src={Logo} alt="Chola" className="h-8 w-auto lg:h-9" />
            )}
          </div>
          <nav className="ml-6 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex scroll-row" aria-label="Primary">
            {items.map((item) => {
              const Icon = NAV_ICONS[item.id] ?? House;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
                      isActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {item.label}
                  {item.id === "pending" && pendingTotal > 0 && (
                    <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold leading-4 text-ims-primary">{pendingTotal}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {!misDashboard && (
              <>
                <div className="relative hidden lg:block">
                  {searchOpen ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitSearch();
                      }}
                    >
                      <label className="sr-only" htmlFor="global-search">
                        Search properties
                      </label>
                      <input
                        id="global-search"
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onBlur={() => !query && setSearchOpen(false)}
                        type="search"
                        enterKeyHint="search"
                        placeholder="Search property ID, location"
                        className="w-64 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none"
                      />
                    </form>
                  ) : (
                    <button type="button" aria-label="Search" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setSearchOpen(true)}>
                      <Search className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <NavLink to="/pending" aria-label="Notifications" className="relative rounded-lg p-2 text-white hover:bg-white/10">
                  <Bell className="h-5 w-5" />
                  {pendingTotal > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff3b3b] ring-2 ring-white" /> : null}
                </NavLink>
              </>
            )}
            <span className="mx-1 hidden h-8 w-px bg-white/40 lg:block" aria-hidden />
            <div ref={menuRef} className="relative hidden lg:block">
              <button
                type="button"
                className="flex items-center gap-3 rounded-lg py-1 pl-1 pr-2 hover:bg-white/10"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-ims-ink">
                  {initials(displayName)}
                </span>
                <span className="max-w-[11rem] text-left leading-tight">
                  <span className="block truncate text-sm font-semibold">{displayName}</span>
                  <span className="block truncate text-[11px] text-white/80">{roleLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div role="menu" className="ims-card absolute right-0 top-full mt-2 w-64 p-3 text-ims-ink">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.user}</p>
                  {roleLabels.length > 1 && (
                    <label className="mt-3 block text-xs font-medium text-slate-500" htmlFor="header-role">
                      Working as
                      <div className="mt-1">{roleSwitcher("header-role")}</div>
                    </label>
                  )}
                  <button type="button" role="menuitem" onClick={() => void onLogout()} className="ims-btn-secondary mt-3 w-full">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div
        className={`ims-header-bg -mt-px h-7 shrink-0 lg:hidden ${
          flowTopChrome && !siteImageCapture ? "hidden" : ""
        }`}
        aria-hidden
      />

      <main
        className={[
          "relative z-10 mx-auto min-h-0 w-full min-w-0 max-w-[1440px] flex-1 overflow-y-auto overscroll-y-contain bg-ims-surface px-3 pb-5 sm:px-5 lg:mt-0 lg:flex-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:px-6 lg:py-6 lg:pb-10",
          flowTopChrome && !siteImageCapture
            ? "mt-0 rounded-none pb-5 pt-0 lg:pt-6"
            : "-mt-7 rounded-t-[28px] py-5",
        ].join(" ")}
      >
        <Outlet />
      </main>

      <nav
        className="z-20 flex shrink-0 border-t border-ims-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Mobile"
      >
        {bottomItems.map((item) => (
          <NavLink
            key={`${item.label}:${item.to}`}
            to={item.to}
            end={item.end ?? item.to === "/dashboard"}
            className={({ isActive }) =>
              `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline ${
                isActive ? "text-ims-primary" : "text-slate-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-ims-primary" aria-hidden />}
                <item.icon className="h-5 w-5" />
                {item.label}
                {item.badge ? (
                  <span className="absolute right-[calc(50%-1.4rem)] top-1.5 min-w-4 rounded-full bg-[#ff3b3b] px-1 text-center text-[10px] font-semibold leading-4 text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </nav>
    </div>
  );
}
