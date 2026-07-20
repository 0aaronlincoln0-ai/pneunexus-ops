import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  KeyRound,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import type { SubscriptionPlan } from "../lib/api";
import { cn } from "../lib/utils";
import { BrandMark } from "./BrandMark";
import { Button } from "./ui/button";

type Mode = "sign-in" | "create";
type CreateStep = "details" | "plan";

const plans: Array<{
  id: SubscriptionPlan;
  name: string;
  price: string;
  cadence: string;
  description: string;
  accountLimit: string;
}> = [
  {
    id: "individual",
    name: "Individual",
    price: "$49.99",
    cadence: "per month",
    description: "A focused workspace for one technician or administrator.",
    accountLimit: "One account",
  },
  {
    id: "team",
    name: "Group of 4",
    price: "Four accounts",
    cadence: "group workspace",
    description: "A shared workspace for a four-person maintenance group.",
    accountLimit: "Four accounts",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "$299.99",
    cadence: "one time",
    description: "A permanent Resovii workspace for the whole maintenance team.",
    accountLimit: "Unlimited accounts",
  },
];

export function WelcomeScreen() {
  const { login, register, error: serviceError } = useAuth();
  const [mode, setMode] = useState<Mode>("create");
  const [step, setStep] = useState<CreateStep>("details");
  const [organizationName, setOrganizationName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan>("individual");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStep("details");
    setError(null);
  }

  function continueToPlan(event: FormEvent) {
    event.preventDefault();
    if (password.length < 12) {
      setError("Use a password of at least 12 characters.");
      return;
    }
    setError(null);
    setStep("plan");
  }

  async function signIn(event: FormEvent) {
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

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await register({ organizationName, displayName, email, password, plan });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account setup failed");
    } finally {
      setPending(false);
    }
  }

  const activePlan = plans.find((candidate) => candidate.id === plan) ?? plans[0]!;

  return (
    <main className="login-ambient relative min-h-[100dvh] overflow-hidden bg-[#05080c] text-slate-100">
      <div className="login-grid pointer-events-none absolute inset-0 opacity-40" />
      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div>
            <p className="text-base font-semibold text-white">Resovii</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Field operations
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <ShieldCheck size={15} className="text-teal-300/75" />
          Secure organization workspace
        </div>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-10 px-5 pb-10 pt-4 sm:px-8 lg:min-h-[calc(100dvh-5.5rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.72fr)_minmax(0,0.7fr)] lg:items-center lg:px-12 lg:pb-16 lg:pt-0">
        <section className="hidden lg:block">
          <p className="eyebrow">Pneumatic tube operations</p>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.02] text-white xl:text-6xl">
            Give your maintenance team one reliable place to work.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Build a private Resovii workspace for planned maintenance, live troubleshooting, service
            knowledge, and supervisor-ready reporting.
          </p>
          <div className="mt-9 space-y-4 border-l border-teal-300/20 pl-5 text-sm text-slate-400">
            <Feature
              icon={Building2}
              text="Start blank and import only your hospital device configuration."
            />
            <Feature
              icon={Users}
              text="Keep technician evidence and resolved service calls in one shared workspace."
            />
            <Feature
              icon={ShieldCheck}
              text="Designed for infrastructure records without patient information."
            />
          </div>
        </section>

        <section className="surface-panel w-full rounded-2xl p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-7">
          <div
            className="mb-7 grid grid-cols-2 rounded-lg border border-white/[0.08] bg-black/10 p-1"
            role="tablist"
            aria-label="Account access"
          >
            <button
              className={cn(
                "min-h-10 rounded-md text-sm font-semibold transition",
                mode === "create"
                  ? "bg-teal-300 text-[#04100f]"
                  : "text-slate-500 hover:text-slate-200",
              )}
              role="tab"
              aria-selected={mode === "create"}
              onClick={() => switchMode("create")}
            >
              Create account
            </button>
            <button
              className={cn(
                "min-h-10 rounded-md text-sm font-semibold transition",
                mode === "sign-in"
                  ? "bg-teal-300 text-[#04100f]"
                  : "text-slate-500 hover:text-slate-200",
              )}
              role="tab"
              aria-selected={mode === "sign-in"}
              onClick={() => switchMode("sign-in")}
            >
              Sign in
            </button>
          </div>

          {mode === "sign-in" ? (
            <form className="space-y-5" onSubmit={(event) => void signIn(event)}>
              <FormHeading
                title="Welcome back"
                description="Sign in to open your Resovii workspace."
              />
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                icon={Mail}
                autoComplete="email"
              />
              <TextField
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                icon={KeyRound}
                autoComplete="current-password"
              />
              <FormError error={error ?? serviceError} />
              <Button className="w-full" type="submit" disabled={pending}>
                {pending ? "Signing in..." : "Sign in"} <ArrowRight size={17} />
              </Button>
            </form>
          ) : step === "details" ? (
            <form className="space-y-5" onSubmit={continueToPlan}>
              <FormHeading
                title="Create your workspace"
                description="Set up the organization that will hold your equipment and service knowledge."
              />
              <TextField
                label="Organization name"
                value={organizationName}
                onChange={setOrganizationName}
                icon={Building2}
                autoComplete="organization"
              />
              <TextField
                label="Your name"
                value={displayName}
                onChange={setDisplayName}
                icon={Users}
                autoComplete="name"
              />
              <TextField
                label="Work email"
                value={email}
                onChange={setEmail}
                type="email"
                icon={Mail}
                autoComplete="email"
              />
              <TextField
                label="Create password"
                value={password}
                onChange={setPassword}
                type="password"
                icon={KeyRound}
                autoComplete="new-password"
              />
              <FormError error={error ?? serviceError} />
              <Button className="w-full" type="submit">
                Choose a plan <ArrowRight size={17} />
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={(event) => void createAccount(event)}>
              <div className="flex items-start gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Back to account details"
                  onClick={() => setStep("details")}
                >
                  <ArrowLeft size={18} />
                </Button>
                <FormHeading
                  title="Choose your plan"
                  description="Select the plan that matches the way your maintenance team works."
                />
              </div>
              <div className="space-y-2" role="radiogroup" aria-label="Resovii plan">
                {plans.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    role="radio"
                    aria-checked={plan === candidate.id}
                    onClick={() => setPlan(candidate.id)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition",
                      plan === candidate.id
                        ? "border-teal-300/55 bg-teal-300/[0.08]"
                        : "border-white/[0.08] bg-white/[0.018] hover:border-white/[0.18]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{candidate.name}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {candidate.description}
                        </p>
                      </div>
                      {plan === candidate.id && (
                        <Check size={18} className="shrink-0 text-teal-300" />
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-3 text-xs">
                      <span className="font-semibold text-teal-200">{candidate.price}</span>
                      <span className="text-slate-600">
                        {candidate.cadence} · {candidate.accountLimit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-black/10 px-4 py-3 text-xs leading-5 text-slate-500">
                <strong className="font-semibold text-slate-300">{activePlan.name}</strong> is
                selected. No payment details are collected during workspace setup.
              </div>
              <FormError error={error ?? serviceError} />
              <Button className="w-full" type="submit" disabled={pending}>
                {pending ? "Creating workspace..." : "Create workspace"} <ArrowRight size={17} />
              </Button>
            </form>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="border-y border-white/[0.08] py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Inside your workspace
            </p>
            <div className="mt-5 space-y-5">
              <WorkspacePoint
                title="PM workspace"
                detail="Select imported equipment and complete field-ready maintenance steps."
              />
              <WorkspacePoint
                title="Pocket Technician"
                detail="Work through live symptoms with evidence, history, and safe next checks."
              />
              <WorkspacePoint
                title="Administrator records"
                detail="Capture photos, video, procedures, and detailed service resolutions."
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function FormHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: "email" | "password" | "text";
  icon: typeof Mail;
  autoComplete: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
      {label}
      <div className="relative mt-2.5">
        <Icon
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
        />
        <input
          className="min-h-[52px] w-full rounded-lg border border-white/[0.09] bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm font-normal normal-case tracking-normal text-slate-100 outline-none transition placeholder:text-slate-700 hover:border-white/[0.16] focus:border-teal-300/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-teal-400/[0.06]"
          type={type}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs leading-5 text-amber-100/80"
    >
      {error}
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Building2; text: string }) {
  return (
    <div className="flex items-start gap-3 leading-6">
      <Icon size={17} className="mt-0.5 shrink-0 text-teal-300" />
      <p>{text}</p>
    </div>
  );
}

function WorkspacePoint({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
