import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  ChevronRight,
  Command,
  Database,
  Gauge,
  LogOut,
  Menu,
  Moon,
  PackageSearch,
  Search,
  Stethoscope,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import { cn, titleCase } from "../lib/utils";
import { Button } from "./ui/button";
import { LogoMark } from "./LoginScreen";

const navigation = [
  { to: "/", label: "Operations", icon: Gauge },
  { to: "/facilities", label: "Facilities", icon: Building2 },
  { to: "/assets", label: "Asset registry", icon: PackageSearch },
  { to: "/troubleshoot", label: "Troubleshoot", icon: Stethoscope },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [sidebar, setSidebar] = useState(false);
  const [palette, setPalette] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("pnx-theme") !== "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("pnx-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    addEventListener("keydown", listener);
    return () => removeEventListener("keydown", listener);
  }, []);

  const current = navigation.find((item) => item.to === pathname)?.label ?? "Operations";

  return (
    <div className="app-canvas min-h-[100dvh] text-slate-100">
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[min(18rem,88vw)] flex-col border-r border-white/[0.08] bg-[#070b11]/98 text-white shadow-[24px_0_70px_rgba(0,0,0,0.14)] transition-transform xl:w-72 xl:translate-x-0",
          sidebar ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="app-sidebar-header flex min-h-24 items-center justify-between border-b border-white/[0.07] px-5 sm:px-6">
          <div className="flex items-center gap-3.5">
            <LogoMark />
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">PneuNexus Ops</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.22em] text-slate-600">
                Command center
              </p>
            </div>
          </div>
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-white/[0.05] hover:text-white xl:hidden"
            aria-label="Close navigation"
            onClick={() => setSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-4" aria-label="Primary navigation">
          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700">
            Operational workspace
          </p>
          <div className="space-y-1">
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebar(false)}
                className={cn(
                  "group relative flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-[13px] font-medium text-slate-500 transition-all hover:bg-white/[0.035] hover:text-slate-200",
                  pathname === to &&
                    "bg-teal-300/[0.075] text-teal-200 ring-1 ring-inset ring-teal-300/10 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-teal-300",
                )}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
              <Database size={13} className="text-teal-300/70" /> Active data scope
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-300">Great Lakes Regional Health</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600">
              <span className="status-pulse" /> Fictional demonstration data
            </div>
          </div>
        </nav>

        <div className="mx-4 mb-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-100/80">
            <ShieldAlert size={15} /> No PHI workspace
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-slate-600">
            Infrastructure records only. Automated detection has limits.
          </p>
        </div>

        <div className="border-t border-white/[0.07] p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-xs font-semibold text-slate-300">
              {user?.displayName
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-300">{user?.displayName}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-600">
                {titleCase(user?.role ?? "")}
              </p>
            </div>
            <button
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-200"
              onClick={() => void logout()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {sidebar && (
        <button
          className="fixed inset-0 z-30 bg-black/65 backdrop-blur-sm xl:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setSidebar(false)}
        />
      )}

      <div className="xl:pl-72">
        <header className="app-header sticky top-0 z-20 flex min-h-20 items-center gap-2.5 border-b border-white/[0.07] bg-[#070b11]/90 px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 xl:hidden"
            aria-label="Open navigation"
            onClick={() => setSidebar(true)}
          >
            <Menu size={19} />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
              <span className="hidden truncate sm:inline">Great Lakes Regional Health</span>
              <ChevronRight className="hidden sm:block" size={12} />
              <span className="truncate">All facilities</span>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-[-0.025em] text-slate-100">
              {current}
            </h1>
          </div>
          <button
            onClick={() => setPalette(true)}
            className="hidden min-h-10 w-64 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-slate-600 transition hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-slate-400 sm:flex"
          >
            <Search size={15} />
            Search or jump…
            <kbd className="ml-auto rounded-md border border-white/[0.09] bg-black/10 px-1.5 py-0.5 text-[9px] text-slate-600">
              Ctrl K
            </kbd>
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle color mode"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell size={18} />
          </Button>
        </header>
        <main className="app-main mx-auto max-w-[1800px] p-3 sm:p-6 lg:p-8 2xl:p-10">
          <Outlet />
        </main>
      </div>

      {palette && (
        <div
          className="command-palette fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-3 pt-[max(1rem,15dvh)] backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPalette(false);
          }}
        >
          <div className="surface-panel w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/[0.08] p-4">
              <Command className="text-teal-300" size={19} />
              <input
                autoFocus
                className="w-full bg-transparent text-base text-slate-200 outline-none placeholder:text-slate-700"
                placeholder="Search commands…"
              />
              <button
                className="rounded-lg p-2 text-slate-600 hover:bg-white/[0.05] hover:text-white"
                onClick={() => setPalette(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              {navigation.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setPalette(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-slate-400 transition hover:bg-white/[0.045] hover:text-white"
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
