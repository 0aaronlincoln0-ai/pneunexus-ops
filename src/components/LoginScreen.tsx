import { useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  Route,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { useAuth } from "../auth";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const assurances = [
  { icon: Waypoints, label: "Vendor-neutral mapping", detail: "One system of record" },
  { icon: ShieldCheck, label: "Tenant isolated", detail: "Capability-based access" },
  { icon: CheckCircle2, label: "Audit ready", detail: "Immutable event history" },
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
    <main className="login-ambient relative min-h-screen overflow-hidden bg-[#05080c] text-slate-100">
      <div className="login-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.85fr)]">
        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-16 xl:py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <LogoMark />
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                  PneuNexus Systems
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Infrastructure intelligence
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
              <p className="eyebrow">Hospital infrastructure operations</p>
            </div>
            <h1 className="max-w-3xl text-[clamp(3.2rem,5.7vw,6.25rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-white">
              Every route.
              <br />
              Every device.
              <br />
              <span className="text-teal-300">One truth.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-slate-400 xl:text-lg xl:leading-8">
              A secure operational system of record for the infrastructure that keeps hospitals
              moving—mapped, maintained, and accountable.
            </p>

            <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080e14]/90 px-6 pb-5 pt-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Activity size={14} className="text-teal-300" />
                  Infrastructure topology
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Illustrative system view
                </span>
              </div>
              <TopologyBackdrop />
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
              Infrastructure operations only. PneuNexus Ops does not control live equipment and is
              not a patient-record system.
            </p>
            <p className="shrink-0 uppercase tracking-[0.16em]">PneuNexus Ops / 01</p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center border-l border-white/[0.08] bg-[#080d13]/90 px-6 py-10 backdrop-blur-sm sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-[420px]">
            <div className="mb-14 flex items-center gap-3.5 lg:hidden">
              <LogoMark />
              <div>
                <p className="font-semibold text-white">PneuNexus Ops</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Infrastructure intelligence
                </p>
              </div>
            </div>

            <div className="mb-9">
              <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">
                <LockKeyhole size={14} /> Secure workspace
              </div>
              <h2 className="text-4xl font-semibold tracking-[-0.045em] text-white">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in with your verified, invitation-only account.
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
                {pending ? "Verifying…" : "Enter command center"}
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

function TopologyBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 720 230"
      className="mt-2 block h-[190px] w-full xl:h-[220px]"
    >
      <path className="topology-line-muted" d="M30 44H690M30 116H690M30 188H690" />
      <path className="topology-line-muted" d="M88 18V212M244 18V212M410 18V212M612 18V212" />
      <path className="topology-line" d="M88 116H244L318 62H410L490 166H612" />
      <path className="topology-line" d="M244 116L330 166H490" />
      <path className="topology-line" d="M410 62L520 76L612 116" />
      {[
        [88, 116],
        [244, 116],
        [318, 62],
        [410, 62],
        [330, 166],
        [490, 166],
        [520, 76],
        [612, 116],
      ].map(([cx, cy], index) => (
        <g key={`${cx}-${cy}`}>
          <circle className="topology-node" cx={cx} cy={cy} r={index === 1 ? 14 : 9} />
          <circle className="topology-node-core" cx={cx} cy={cy} r={index === 1 ? 3.5 : 2.5} />
        </g>
      ))}
      <text x="65" y="142" className="fill-slate-600 text-[10px] font-semibold uppercase">
        Station
      </text>
      <text x="218" y="145" className="fill-slate-500 text-[10px] font-semibold uppercase">
        Core hub
      </text>
      <text x="588" y="143" className="fill-slate-600 text-[10px] font-semibold uppercase">
        Zone 04
      </text>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-teal-200/20 bg-teal-300 text-[#04100f] shadow-[0_12px_30px_rgba(45,212,191,0.16)]",
        className,
      )}
    >
      <Route size={21} strokeWidth={2.25} />
      <div className="absolute right-0 top-0 h-2.5 w-2.5 border-b border-l border-[#04100f]/20" />
    </div>
  );
}
