import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarCheck2,
  ClipboardList,
  Command,
  Gauge,
  LogOut,
  Moon,
  PackageSearch,
  Search,
  Stethoscope,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import { cn, titleCase } from "../lib/utils";
import { LogoMark } from "./LoginScreen";
import { Button } from "./ui/button";

const navigation = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/maintenance", label: "PM workspace", icon: CalendarCheck2 },
  { to: "/troubleshoot", label: "Pocket Technician", icon: Stethoscope },
  { to: "/information", label: "Information center", icon: BookOpen },
  { to: "/assets", label: "Equipment", icon: PackageSearch },
  { to: "/facilities", label: "Site notes", icon: Building2 },
  { to: "/admin", label: "Administrator", icon: ClipboardList },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
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

  const current = navigation.find((item) => item.to === pathname)?.label ?? "Overview";

  return (
    <div className="app-canvas min-h-[100dvh] text-slate-100">
      <header className="app-topbar sticky top-0 z-30 border-b border-white/[0.07] bg-[#070b11]/94 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.5rem] max-w-[1800px] items-center gap-3 px-3 sm:px-6 lg:px-8 2xl:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Resovii overview">
            <LogoMark />
            <div className="hidden sm:block">
              <p className="text-[15px] font-semibold">Resovii</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.18em] text-slate-600">
                Field operations
              </p>
            </div>
          </Link>

          <nav className="app-primary-tabs min-w-0 flex-1" aria-label="Primary navigation">
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "app-primary-tab inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition sm:px-3.5",
                  pathname === to
                    ? "border-teal-300 text-teal-200"
                    : "border-transparent text-slate-500 hover:border-white/[0.14] hover:text-slate-200",
                )}
              >
                <Icon size={16} strokeWidth={1.9} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              onClick={() => setPalette(true)}
              className="hidden min-h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-slate-600 transition hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-slate-400 lg:flex"
              aria-label="Search or jump"
            >
              <Search size={15} />
              <span>Search</span>
              <kbd className="rounded border border-white/[0.09] px-1 py-0.5 text-[9px]">
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
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </Button>
            {user ? (
              <button
                aria-label={`Sign out ${user.displayName}`}
                className="hidden min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white md:inline-flex"
                onClick={() => void logout()}
              >
                <span className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.045] text-[10px] font-semibold text-slate-300">
                  {user.displayName
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="hidden xl:block">{titleCase(user.role)}</span>
                <LogOut size={16} />
              </button>
            ) : (
              <Link
                to="/admin"
                className="hidden min-h-10 items-center px-2 text-xs font-semibold text-teal-200 md:inline-flex"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        <div className="border-t border-white/[0.05] px-3 py-1 sm:hidden">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
            {current}
          </p>
        </div>
      </header>

      <main className="app-main mx-auto max-w-[1800px] p-3 sm:p-6 lg:p-8 2xl:p-10">
        <Outlet />
      </main>

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
          <div className="surface-panel w-full max-w-xl overflow-hidden rounded-xl shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/[0.08] p-4">
              <Command className="text-teal-300" size={19} />
              <input
                autoFocus
                className="w-full bg-transparent text-base text-slate-200 outline-none placeholder:text-slate-700"
                placeholder="Search pages"
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
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm text-slate-400 transition hover:bg-white/[0.045] hover:text-white"
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
