import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Fan,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Mail,
  MonitorCog,
  PackageOpen,
  Route,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../auth";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const assurances = [
  {
    icon: PackageOpen,
    label: "Three device families",
    detail: "Stations · diverters · blowers",
  },
  {
    icon: MonitorCog,
    label: "Atlas reference",
    detail: "Technician-entered faults · history",
  },
  {
    icon: ShieldCheck,
    label: "Standalone guide",
    detail: "No server or equipment connection",
  },
];

export function LoginScreen() {
  const { login, error: serviceError } = useAuth();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-ambient relative min-h-[100dvh] overflow-hidden bg-[#05080c] text-slate-100">
      <div className="login-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.85fr)]">
        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-16 xl:py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <LogoMark />
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">Resovii</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Pneumatic tube maintenance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[11px] font-medium text-slate-400">
              <span className="status-pulse" />
              Secure demo workspace
            </div>
          </div>

          <div className="max-w-[760px] py-12">
            <div className="mb-7 flex items-center gap-3">
              <div className="h-px w-8 bg-teal-300/70" />
              <p className="eyebrow">Technician troubleshooting reference</p>
            </div>
            <h1 className="max-w-3xl text-[clamp(3.2rem,5.7vw,6.25rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-white">
              Diagnose the fault.
              <br />
              <span className="text-teal-300">Restore the route.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-slate-400 xl:text-lg xl:leading-8">
              A standalone field reference for hospital engineering teams. Troubleshoot from
              technician-entered observations, complete station, diverter, and blower PM procedures,
              document findings, and escalate when service is required.
            </p>

            <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080e14]/90 px-6 pb-5 pt-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Route size={14} className="text-teal-300" />
                  Diagnostic system model
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Standalone reference model
                </span>
              </div>
              <SystemServiceModel />
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08] py-4">
              {assurances.map(({ icon: Icon, label, detail }, index) => (
                <div key={label} className={cn("pr-5", index > 0 && "pl-5")}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Icon size={15} className="text-teal-300" />
                    {label}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between gap-6 text-[11px] leading-5 text-slate-600">
            <p className="max-w-xl">
              This app does not connect to Atlas, a hospital server, or tube equipment. Current site
              manuals, hospital policy, and qualified technicians remain authoritative.
            </p>
            <p className="shrink-0 uppercase tracking-[0.16em]">Field guide / 01</p>
          </div>
        </section>

        <section className="login-form-panel relative flex min-h-[100dvh] items-center justify-center border-l border-white/[0.08] bg-[#080d13]/90 px-5 py-8 backdrop-blur-sm sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-[420px]">
            <div className="mb-14 flex items-center gap-3.5 lg:hidden">
              <LogoMark />
              <div>
                <p className="font-semibold text-white">Resovii</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Pneumatic tube maintenance
                </p>
              </div>
            </div>

            <div className="mb-9">
              <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">
                <LockKeyhole size={14} /> Technician sign in
              </div>
              <h2 className="text-4xl font-semibold tracking-[-0.045em] text-white">
                Maintenance guide
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use the temporary demo credentials or your assigned account.
              </p>
            </div>

            <form className="space-y-5" onSubmit={(event) => void submit(event)}>
              <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Username or email
                <div className="relative mt-2.5">
                  <Mail
                    aria-hidden="true"
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    className="min-h-[52px] w-full rounded-xl border border-white/[0.09] bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm font-normal normal-case tracking-normal text-slate-100 outline-none transition placeholder:text-slate-700 hover:border-white/[0.16] focus:border-teal-300/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-teal-400/[0.06]"
                    type="text"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Password
                <div className="relative mt-2.5">
                  <KeyRound
                    aria-hidden="true"
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    className="min-h-[52px] w-full rounded-xl border border-white/[0.09] bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm font-normal normal-case tracking-normal text-slate-100 outline-none transition placeholder:text-slate-700 hover:border-white/[0.16] focus:border-teal-300/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-teal-400/[0.06]"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>

              {(error ?? serviceError) && (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs leading-5 text-amber-100/80"
                >
                  {error ?? serviceError}
                </div>
              )}

              <Button className="mt-2 w-full" type="submit" disabled={pending}>
                {pending ? "Signing in…" : "Open maintenance guide"}
                <ArrowRight size={17} />
              </Button>
            </form>

            <div className="mt-8 flex items-start gap-3 border-t border-white/[0.08] pt-6 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 shrink-0 text-teal-300/70" size={16} />
              <p>
                <strong className="font-semibold text-slate-300">No PHI.</strong> Never enter
                patient, specimen, medication, or medical-record information. Automated detection
                has limits.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
              <span>Invite only</span>
              <span className="h-1 w-1 rounded-full bg-slate-800" />
              <span>Secure session</span>
              <span className="h-1 w-1 rounded-full bg-slate-800" />
              <span>Audited access</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SystemServiceModel() {
  return (
    <div className="py-5">
      <div className="flex items-center gap-3 rounded-xl border border-teal-300/12 bg-teal-300/[0.035] px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-300/[0.08] text-teal-300">
          <MonitorCog size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200">
            Technician-entered Atlas or equipment evidence
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-600">
            Transaction state · route · device faults · carrier sightings · history
          </p>
        </div>
      </div>

      <div className="my-3 flex items-center px-6" aria-hidden="true">
        <span className="h-4 w-px bg-teal-300/25" />
        <span className="h-px flex-1 bg-gradient-to-r from-teal-300/25 via-teal-300/10 to-transparent" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SystemDevice icon={PackageOpen} label="Station" detail="Send · receive · position" />
        <SystemDevice icon={GitBranch} label="Diverter" detail="Port · alignment · sensing" />
        <SystemDevice icon={Fan} label="Blower" detail="Vacuum · pressure · airflow" />
      </div>

      <div className="mt-3 flex items-center gap-2 px-1 text-[10px] leading-4 text-slate-600">
        <ShieldCheck size={13} className="shrink-0 text-teal-300/60" />
        The technician enters what is visible locally. The guide cannot read or operate these
        devices.
      </div>
    </div>
  );
}

function SystemDevice({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof PackageOpen;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <Icon size={17} className="text-teal-300/75" />
      <p className="mt-3 text-xs font-semibold text-slate-200">{label}</p>
      <p className="mt-1 text-[9px] leading-4 text-slate-600">{detail}</p>
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-teal-200/25 bg-[#0a2c2a] text-teal-100 shadow-[0_14px_32px_rgba(45,212,191,0.2)] before:absolute before:inset-1 before:rounded-lg before:border before:border-teal-200/20 before:bg-teal-300/[0.12]",
        className,
      )}
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-teal-300 text-[#04100f] shadow-[0_4px_12px_rgba(45,212,191,0.36)]">
        <Route size={17} strokeWidth={2.5} />
      </span>
      <div className="absolute right-0 top-0 h-3 w-3 border-b border-l border-teal-100/30" />
    </div>
  );
}
