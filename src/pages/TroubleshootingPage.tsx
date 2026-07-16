import {
  AlertOctagon,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileSearch,
  HardHat,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeading } from "../components/QueryState";
import { VoiceDiagnosticAssistant } from "../components/VoiceDiagnosticAssistant";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  diagnosticCategories,
  searchTroubleshootingGuides,
  troubleshootingGuides,
  type RiskLevel,
} from "../lib/troubleshooting";
import { cn, titleCase } from "../lib/utils";

const riskStyle: Record<RiskLevel, string> = {
  routine: "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-300",
  caution: "border-amber-300/15 bg-amber-300/[0.05] text-amber-300",
  restricted: "border-red-300/15 bg-red-300/[0.05] text-red-300",
};

const categoryIcons = {
  "Carrier movement": FileSearch,
  Station: Stethoscope,
  Diverter: Wrench,
  Blower: HardHat,
  "Controls & network": Network,
  "Safety & contamination": ShieldCheck,
};

export function TroubleshootingPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(troubleshootingGuides[0]?.id ?? "");
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => searchTroubleshootingGuides(query, category), [query, category]);
  const selected = filtered.find((guide) => guide.id === selectedId) ?? filtered[0] ?? null;

  function chooseGuide(id: string) {
    setSelectedId(id);
    setSafetyConfirmed(false);
    setCompletedSteps(new Set());
  }

  function toggleStep(index: number) {
    if (!safetyConfirmed) return;
    setCompletedSteps((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const progress = selected?.steps.length
    ? Math.round((completedSteps.size / selected.steps.length) * 100)
    : 0;

  return (
    <>
      <PageHeading
        eyebrow="Technician diagnostic center"
        title="Troubleshoot with evidence"
        description="A safety-gated field workflow for isolating pneumatic tube system faults by transaction state, device feedback, carrier sightings, and physical evidence. Guidance never controls live equipment."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-teal-300/10 bg-teal-300/[0.04] px-3.5 py-2.5 text-[11px] font-semibold text-teal-200">
            <BookOpenCheck size={15} /> Field knowledge reviewed
          </div>
        }
      />

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <SignalCard
          icon={Stethoscope}
          label="Guided protocols"
          value={troubleshootingGuides.length}
          detail="Symptom-to-resolution workflows"
        />
        <SignalCard
          icon={ShieldCheck}
          label="Safety model"
          value="Gated"
          detail="LOTO, infection control, IT separation"
        />
        <SignalCard
          icon={ClipboardCheck}
          label="Evidence standard"
          value="Traceable"
          detail="Sightings, states, checks, outcomes"
        />
      </section>

      {selected && (
        <VoiceDiagnosticAssistant
          selectedGuideId={selected.id}
          selectedGuideTitle={selected.title}
          completedStepIndexes={[...completedSteps]}
          onGuideSelected={chooseGuide}
        />
      )}
      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-4 border-b border-white/[0.055] bg-white/[0.012] p-4 lg:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-600" size={17} />
            <span className="sr-only">Search faults and symptoms</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-teal-300/30 focus:ring-2 focus:ring-teal-300/10"
              placeholder="Search a fault, symptom, device, or message…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Diagnostic categories">
            {diagnosticCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "min-h-11 rounded-xl border px-3.5 text-[11px] font-semibold transition",
                  category === item
                    ? "border-teal-300/20 bg-teal-300/[0.08] text-teal-200"
                    : "border-white/[0.06] bg-white/[0.018] text-slate-500 hover:border-white/[0.12] hover:text-slate-300",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-[11px] text-slate-600">
          <span>{filtered.length} matching diagnostic protocols</span>
          <span>Vendor profile: Pevco / Atlas</span>
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-28">
          <div className="border-b border-white/[0.055] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Diagnostic library
            </p>
          </div>
          <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-2">
            {filtered.map((guide) => {
              const Icon = categoryIcons[guide.category];
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => chooseGuide(guide.id)}
                  className={cn(
                    "group mb-1 w-full rounded-xl border p-3.5 text-left transition last:mb-0",
                    selected?.id === guide.id
                      ? "border-teal-300/15 bg-teal-300/[0.055]"
                      : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-500",
                        selected?.id === guide.id && "text-teal-300",
                      )}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-5 text-slate-300">
                        {guide.title}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600">
                        <span>{guide.category}</span>
                        <span>·</span>
                        <span>{guide.steps.length} checks</span>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="mt-2 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                    />
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center">
                <FileSearch className="mx-auto text-slate-700" />
                <p className="mt-3 text-sm font-medium text-slate-400">No matching protocol</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Try a device name, fault message, or observed symptom.
                </p>
              </div>
            )}
          </div>
        </Card>

        {selected && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="relative border-b border-white/[0.055] p-6 md:p-7">
                <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.07),transparent_68%)]" />
                <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{selected.category}</Badge>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                          riskStyle[selected.risk],
                        )}
                      >
                        {selected.risk} access
                      </span>
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-white md:text-3xl">
                      {selected.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                      {selected.summary}
                    </p>
                  </div>
                  <div className="min-w-40 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                      <span>Case progress</span>
                      <span className="text-teal-300">{progress}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-teal-400 transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-600">
                      {completedSteps.size} of {selected.steps.length} checks complete
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-2 md:p-7">
                <EvidenceList
                  title="Observed signals"
                  icon={FileSearch}
                  items={selected.symptoms}
                />
                <EvidenceList
                  title="Likely cause groups"
                  icon={Wrench}
                  items={selected.likelyCauses}
                />
              </div>
            </Card>

            <section
              className={cn(
                "rounded-2xl border p-5 md:p-6",
                selected.risk === "restricted"
                  ? "border-red-300/15 bg-red-300/[0.035]"
                  : "border-amber-300/15 bg-amber-300/[0.035]",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
                    selected.risk === "restricted"
                      ? "border-red-300/15 bg-red-300/[0.06] text-red-300"
                      : "border-amber-300/15 bg-amber-300/[0.06] text-amber-300",
                  )}
                >
                  <AlertOctagon size={19} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">Safety gate</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Review every condition before beginning. This application does not authorize
                    live equipment control or replace hospital policy.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {selected.safety.map((item) => (
                      <li key={item} className="flex gap-2.5 text-xs leading-5 text-slate-400">
                        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-300/70" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5"
                    variant={safetyConfirmed ? "secondary" : "primary"}
                    onClick={() => setSafetyConfirmed((value) => !value)}
                  >
                    {safetyConfirmed ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
                    {safetyConfirmed
                      ? "Safety conditions confirmed"
                      : "Confirm safe work conditions"}
                  </Button>
                </div>
              </div>
            </section>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.055] px-6 py-5">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Guided diagnostic sequence</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Observe first, isolate the failed layer, then verify restoration.
                  </p>
                </div>
                {!safetyConfirmed && (
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <LockKeyhole size={14} /> Safety gate locked
                  </div>
                )}
              </div>
              <div className="divide-y divide-white/[0.055]">
                {selected.steps.map((step, index) => {
                  const done = completedSteps.has(index);
                  return (
                    <article
                      key={step.title}
                      className={cn(
                        "grid gap-4 px-6 py-6 transition md:grid-cols-[44px_minmax(0,1fr)]",
                        done && "bg-teal-300/[0.018]",
                      )}
                    >
                      <button
                        type="button"
                        disabled={!safetyConfirmed}
                        onClick={() => toggleStep(index)}
                        aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${step.title}`}
                        aria-pressed={done}
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-xl border transition",
                          done
                            ? "border-teal-300/25 bg-teal-300/[0.1] text-teal-300"
                            : "border-white/[0.07] bg-white/[0.025] text-slate-600",
                          safetyConfirmed &&
                            !done &&
                            "hover:border-teal-300/20 hover:text-teal-300",
                          !safetyConfirmed && "cursor-not-allowed opacity-45",
                        )}
                      >
                        {done ? (
                          <Check size={17} />
                        ) : (
                          <span className="text-xs font-semibold">{index + 1}</span>
                        )}
                      </button>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-200">{step.title}</h3>
                          {step.role && <Badge>{titleCase(step.role)}</Badge>}
                          {step.requiresShutdown && (
                            <span className="flex items-center gap-1.5 rounded-full border border-red-300/15 bg-red-300/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-300/80">
                              <LockKeyhole size={10} /> Shutdown required
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-400">{step.instruction}</p>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.025] p-3.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">
                              Expected
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{step.expected}</p>
                          </div>
                          <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.025] p-3.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300/70">
                              If abnormal
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {step.ifAbnormal}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <OutcomeCard
                title="Return-to-service verification"
                icon={CheckCircle2}
                tone="success"
                items={selected.verification}
              />
              <OutcomeCard
                title="Stop and escalate when"
                icon={AlertOctagon}
                tone="danger"
                items={selected.escalateWhen}
              />
            </div>

            <Card className="flex flex-col justify-between gap-5 p-5 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <BookOpenCheck className="mt-0.5 shrink-0 text-teal-300/70" size={18} />
                <div>
                  <p className="text-xs font-semibold text-slate-300">Technical provenance</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                    Reviewed against {selected.sourceSection}. Site-specific manuals, revisions,
                    configuration, and hospital policies always take precedence.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[10px] text-slate-600">
                <ShieldCheck size={13} /> No PHI · No live control
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Stethoscope;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="stat-card flex items-center gap-4 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-teal-300/75">
        <Icon size={18} />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-semibold tracking-tight text-white">{value}</p>
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-600">{detail}</p>
      </div>
    </Card>
  );
}

function EvidenceList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof Search;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        <Icon size={14} className="text-teal-300/65" /> {title}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-xs leading-5 text-slate-400">
            <Circle size={7} className="mt-1.5 shrink-0 fill-slate-700 text-slate-700" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OutcomeCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: typeof CheckCircle2;
  tone: "success" | "danger";
  items: string[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            tone === "success"
              ? "border-emerald-300/10 bg-emerald-300/[0.04] text-emerald-300"
              : "border-red-300/10 bg-red-300/[0.04] text-red-300",
          )}
        >
          <Icon size={16} />
        </div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-xs leading-5 text-slate-500">
            <Check
              size={13}
              className={cn(
                "mt-1 shrink-0",
                tone === "success" ? "text-emerald-300/65" : "text-red-300/65",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
