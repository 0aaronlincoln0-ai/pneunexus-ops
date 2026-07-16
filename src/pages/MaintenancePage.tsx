import {
  AlertOctagon,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  Fan,
  FileText,
  GitBranch,
  LockKeyhole,
  PackageOpen,
  Phone,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeading } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  getMaintenanceTemplate,
  maintenanceTemplates,
  type MaintenanceDeviceFamily,
} from "../lib/maintenance";
import { cn } from "../lib/utils";

const iconByFamily = {
  station: PackageOpen,
  diverter: GitBranch,
  blower: Fan,
};

type Finding = "pass" | "attention" | "not-applicable";

interface SavedPmState {
  equipmentId: string;
  location: string;
  safetyConfirmed: boolean;
  completed: number[];
  findings: Record<number, Finding>;
  notes: Record<number, string>;
}

function storageKey(templateId: string) {
  return `pneunexus-pm-${templateId}`;
}

function loadState(templateId: string): SavedPmState {
  const empty: SavedPmState = {
    equipmentId: "",
    location: "",
    safetyConfirmed: false,
    completed: [],
    findings: {},
    notes: {},
  };
  try {
    const stored = localStorage.getItem(storageKey(templateId));
    return stored ? { ...empty, ...(JSON.parse(stored) as Partial<SavedPmState>) } : empty;
  } catch {
    return empty;
  }
}

export function MaintenancePage() {
  const [selectedId, setSelectedId] = useState<MaintenanceDeviceFamily>("station");
  const template = useMemo(() => getMaintenanceTemplate(selectedId), [selectedId]);
  const [state, setState] = useState<SavedPmState>(() => loadState(selectedId));

  useEffect(() => {
    setState(loadState(selectedId));
  }, [selectedId]);

  useEffect(() => {
    localStorage.setItem(storageKey(selectedId), JSON.stringify(state));
  }, [selectedId, state]);

  const completed = new Set(state.completed);
  const progress = Math.round((completed.size / template.steps.length) * 100);
  const attentionCount = Object.values(state.findings).filter(
    (finding) => finding === "attention",
  ).length;
  const readyToClose = completed.size === template.steps.length && attentionCount === 0;

  function update(patch: Partial<SavedPmState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function setFinding(index: number, finding: Finding) {
    update({
      findings: { ...state.findings, [index]: finding },
      completed: completed.has(index) ? state.completed : [...state.completed, index],
    });
  }

  function toggleComplete(index: number) {
    if (!state.safetyConfirmed) return;
    const next = new Set(completed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    update({ completed: [...next] });
  }

  function resetPm() {
    localStorage.removeItem(storageKey(selectedId));
    setState(loadState(selectedId));
  }

  return (
    <>
      <PageHeading
        eyebrow="Standalone planned maintenance"
        title="Complete a PM from start to finish"
        description="Choose the equipment family, identify the device, confirm safe work conditions, complete each inspection, record findings, and verify operation. This checklist does not connect to Atlas or the tube system."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] px-3.5 py-2.5 text-[11px] font-semibold text-emerald-200">
            <ShieldCheck size={15} /> Manual checklist · saved on this device
          </div>
        }
      />

      <Card className="mb-6 border-teal-300/10 bg-teal-300/[0.025] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
            <BookOpenCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">How this PM guide works</p>
            <p className="mt-2 max-w-4xl text-xs leading-6 text-slate-500">
              All equipment identification, inspection results, and completion marks are entered by
              the technician. The app provides the procedure and saves progress in this browser; it
              does not read device states, issue commands, update Atlas, or synchronize with a
              hospital network.
            </p>
          </div>
        </div>
      </Card>

      <section className="mb-6 grid gap-3 md:grid-cols-3" aria-label="PM equipment family">
        {maintenanceTemplates.map((item) => {
          const Icon = iconByFamily[item.id];
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "rounded-2xl border p-5 text-left transition",
                active
                  ? "border-teal-300/25 bg-teal-300/[0.07] ring-1 ring-inset ring-teal-300/10"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.035]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl border",
                    active
                      ? "border-teal-300/20 bg-teal-300/[0.08] text-teal-300"
                      : "border-white/[0.07] bg-white/[0.025] text-slate-500",
                  )}
                >
                  <Icon size={19} />
                </span>
                {active && <CheckCircle2 size={18} className="text-teal-300" />}
              </div>
              <p className="mt-4 text-base font-semibold text-white">{item.shortName}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.purpose}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {item.steps.length} inspection tasks
              </p>
            </button>
          );
        })}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-28">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300/70">
                PM identification
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{template.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">{template.interval}</p>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="text-xs font-semibold text-slate-300">Equipment ID or tag</span>
                <input
                  value={state.equipmentId}
                  onChange={(event) => update({ equipmentId: event.target.value })}
                  placeholder={`Example: ${template.shortName.toUpperCase()}-014`}
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-300">Location</span>
                <input
                  value={state.location}
                  onChange={(event) => update({ location: event.target.value })}
                  placeholder="Building, floor, department"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
                />
              </label>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                  <span>Checklist progress</span>
                  <span className="text-teal-300">{progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  {completed.size} of {template.steps.length} inspections recorded
                </p>
              </div>
              <Button variant="ghost" className="w-full" onClick={resetPm}>
                <RotateCcw size={16} /> Reset this PM
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Wrench size={16} className="text-teal-300" /> Tools and references
            </div>
            <ul className="mt-4 space-y-2.5">
              {template.tools.map((tool) => (
                <li key={tool} className="flex gap-2.5 text-xs leading-5 text-slate-500">
                  <Circle size={7} className="mt-1.5 shrink-0 fill-slate-700 text-slate-700" />
                  {tool}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-300">
                <ShieldCheck size={19} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  1. Confirm safe work conditions
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review every condition. Confirmation unlocks the inspection checklist but does not
                  replace site authorization or lockout/tagout.
                </p>
                <ul className="mt-4 space-y-2.5">
                  {template.safety.map((item) => (
                    <li key={item} className="flex gap-2.5 text-xs leading-5 text-slate-400">
                      <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-300/70" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5"
                  variant={state.safetyConfirmed ? "secondary" : "primary"}
                  onClick={() => update({ safetyConfirmed: !state.safetyConfirmed })}
                >
                  {state.safetyConfirmed ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}
                  {state.safetyConfirmed
                    ? "Safe work conditions confirmed"
                    : "Confirm and unlock checklist"}
                </Button>
              </div>
            </div>
          </section>

          <Card className="overflow-hidden">
            <div className="flex flex-col justify-between gap-3 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  2. Complete the equipment inspection
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">
                  Mark the result and record any observation needed for the PM report.
                </p>
              </div>
              {!state.safetyConfirmed && (
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  <LockKeyhole size={13} /> Checklist locked
                </span>
              )}
            </div>
            <div className="divide-y divide-white/[0.06]">
              {template.steps.map((step, index) => {
                const done = completed.has(index);
                const finding = state.findings[index];
                return (
                  <article
                    key={step.title}
                    className={cn("p-5 sm:p-6", done && "bg-teal-300/[0.015]")}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        disabled={!state.safetyConfirmed}
                        onClick={() => toggleComplete(index)}
                        aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${step.title}`}
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition",
                          done
                            ? "border-teal-300/25 bg-teal-300/[0.1] text-teal-300"
                            : "border-white/[0.08] bg-white/[0.025] text-slate-600",
                          !state.safetyConfirmed && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {done ? <Check size={17} /> : <span className="text-xs">{index + 1}</span>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
                          {step.requiresShutdown && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/[0.07] px-2.5 py-1 text-[10px] font-semibold text-red-300 ring-1 ring-inset ring-red-400/15">
                              <LockKeyhole size={10} /> Shutdown
                            </span>
                          )}
                          {step.qualifiedElectrical && <Badge>Qualified electrical</Badge>}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-400">{step.instruction}</p>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.025] p-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300/70">
                              Pass condition
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {step.passCriteria}
                            </p>
                          </div>
                          <div className="rounded-xl border border-red-300/10 bg-red-300/[0.025] p-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-300/70">
                              If it fails
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{step.ifFailed}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {(
                            [
                              ["pass", "Pass"],
                              ["attention", "Needs attention"],
                              ["not-applicable", "Not applicable"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={!state.safetyConfirmed}
                              onClick={() => setFinding(index, value)}
                              className={cn(
                                "min-h-11 rounded-xl border px-3 text-xs font-semibold transition",
                                finding === value
                                  ? value === "pass"
                                    ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200"
                                    : value === "attention"
                                      ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
                                      : "border-slate-400/20 bg-white/[0.06] text-slate-300"
                                  : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:border-white/[0.14]",
                                !state.safetyConfirmed && "cursor-not-allowed opacity-40",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <label className="mt-3 block">
                          <span className="sr-only">Notes for {step.title}</span>
                          <textarea
                            rows={2}
                            disabled={!state.safetyConfirmed}
                            value={state.notes[index] ?? ""}
                            onChange={(event) =>
                              update({ notes: { ...state.notes, [index]: event.target.value } })
                            }
                            placeholder="Record wear, adjustment, part needed, or observed result…"
                            className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-base leading-6 text-slate-200 outline-none placeholder:text-slate-700 focus:border-teal-300/25 disabled:opacity-40"
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChecklistCard
              title="3. Return-to-service verification"
              icon={ClipboardCheck}
              tone="success"
              items={template.verification}
            />
            <ChecklistCard
              title="Stop and escalate when"
              icon={AlertOctagon}
              tone="danger"
              items={template.escalation}
            />
          </div>

          <Card
            className={cn(
              "p-5 sm:p-6",
              readyToClose
                ? "border-emerald-300/20 bg-emerald-300/[0.035]"
                : attentionCount
                  ? "border-amber-300/20 bg-amber-300/[0.035]"
                  : "",
            )}
          >
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                {readyToClose ? (
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={21} />
                ) : attentionCount ? (
                  <AlertOctagon className="mt-0.5 shrink-0 text-amber-300" size={21} />
                ) : (
                  <FileText className="mt-0.5 shrink-0 text-slate-500" size={21} />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {readyToClose
                      ? "Inspection complete—perform and document final verification"
                      : attentionCount
                        ? `${attentionCount} finding${attentionCount === 1 ? "" : "s"} require follow-up`
                        : "Complete every inspection to finish the PM"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Progress stays in this browser. It is not transmitted to Atlas or hospital
                    equipment.
                  </p>
                  <p className="mt-2 text-[10px] text-slate-600">
                    Source: {template.source}. The exact equipment-revision manual and hospital
                    procedure take precedence.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <a
                  href="https://pevcosupport.zendesk.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 text-xs font-semibold text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.05]"
                >
                  Request service <ExternalLink size={15} />
                </a>
                <a
                  href="tel:18002967382"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 text-xs font-bold text-[#04100f] transition hover:bg-teal-300"
                >
                  <Phone size={15} /> Call Pevco
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ChecklistCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: typeof ClipboardCheck;
  tone: "success" | "danger";
  items: string[];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            tone === "success"
              ? "border-emerald-300/10 bg-emerald-300/[0.04] text-emerald-300"
              : "border-red-300/10 bg-red-300/[0.04] text-red-300",
          )}
        >
          <Icon size={17} />
        </span>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-xs leading-5 text-slate-500">
            {tone === "success" ? (
              <Check size={14} className="mt-0.5 shrink-0 text-emerald-300/70" />
            ) : (
              <AlertOctagon size={14} className="mt-0.5 shrink-0 text-red-300/70" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
