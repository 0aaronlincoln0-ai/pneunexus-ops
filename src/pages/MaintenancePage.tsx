import {
  AlertOctagon,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Fan,
  FileText,
  GitBranch,
  LockKeyhole,
  Mail,
  PackageOpen,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth";
import { PageHeading } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useBootstrap } from "../hooks/useBootstrap";
import {
  getMaintenanceTemplate,
  maintenanceTemplates,
  type MaintenanceDeviceFamily,
} from "../lib/maintenance";
import { createPmReport } from "../lib/pm-report";
import type { DeviceRow } from "../types";
import { cn } from "../lib/utils";

const iconByFamily = {
  station: PackageOpen,
  diverter: GitBranch,
  blower: Fan,
};

type Finding = "pass" | "attention" | "not-applicable";
type PmStatus = "not-started" | "in-progress" | "ready-review" | "closed";

interface SavedPmState {
  deviceId: string;
  equipmentId: string;
  location: string;
  workOrder: string;
  assignedTo: string;
  dueDate: string;
  shift: string;
  status: PmStatus;
  safetyConfirmed: boolean;
  completed: number[];
  findings: Record<number, Finding>;
  notes: Record<number, string>;
}

function storageKey(templateId: string) {
  return `resovii-pm-${templateId}`;
}

function legacyStorageKey(templateId: string) {
  return `pneunexus-pm-${templateId}`;
}

function loadState(templateId: string): SavedPmState {
  const empty: SavedPmState = {
    deviceId: "",
    equipmentId: "",
    location: "",
    workOrder: "",
    assignedTo: "",
    dueDate: "",
    shift: "",
    status: "not-started",
    safetyConfirmed: false,
    completed: [],
    findings: {},
    notes: {},
  };
  try {
    const stored =
      localStorage.getItem(storageKey(templateId)) ??
      localStorage.getItem(legacyStorageKey(templateId));
    return stored ? { ...empty, ...(JSON.parse(stored) as Partial<SavedPmState>) } : empty;
  } catch {
    return empty;
  }
}

export function MaintenancePage() {
  const { user } = useAuth();
  const bootstrap = useBootstrap();
  const [selectedId, setSelectedId] = useState<MaintenanceDeviceFamily>("station");
  const template = useMemo(() => getMaintenanceTemplate(selectedId), [selectedId]);
  const [state, setState] = useState<SavedPmState>(() => loadState(selectedId));
  const [reportOpen, setReportOpen] = useState(false);
  const [supervisorEmail, setSupervisorEmail] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey(selectedId), JSON.stringify(state));
  }, [selectedId, state]);

  const completed = new Set(state.completed);
  const progress = Math.round((completed.size / template.steps.length) * 100);
  const attentionCount = Object.values(state.findings).filter(
    (finding) => finding === "attention",
  ).length;
  const readyToClose = completed.size === template.steps.length && attentionCount === 0;
  const currentStatus = pmDisplayStatus(state.status, completed.size, template.steps.length, attentionCount);
  const openItems = template.steps.length - completed.size;
  const pmBoard = useMemo(
    () =>
      maintenanceTemplates.map((item) => {
        const saved = item.id === selectedId ? state : loadState(item.id);
        const done = saved.completed.length;
        const findings = Object.values(saved.findings).filter(
          (finding) => finding === "attention",
        ).length;
        return {
          template: item,
          saved,
          progress: Math.round((done / item.steps.length) * 100),
          openItems: item.steps.length - done,
          attentionCount: findings,
          status: pmDisplayStatus(saved.status, done, item.steps.length, findings),
        };
      }),
    [selectedId, state],
  );
  const report = useMemo(
    () =>
      createPmReport({
        template,
        equipmentId: state.equipmentId,
        location: state.location,
        technician: state.assignedTo || user?.displayName || "",
        workOrder: state.workOrder,
        safetyConfirmed: state.safetyConfirmed,
        completed: state.completed,
        findings: state.findings,
        notes: state.notes,
      }),
    [state, template, user?.displayName],
  );
  const compatibleDevices = (bootstrap.data?.devices ?? []).filter(
    (device) => deviceFamily(device) === selectedId,
  );
  const selectedDevice = compatibleDevices.find((device) => device.id === state.deviceId) ?? null;

  function update(patch: Partial<SavedPmState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function chooseFamily(family: MaintenanceDeviceFamily) {
    setSelectedId(family);
    setState(loadState(family));
  }

  function chooseDevice(deviceId: string) {
    const device = (bootstrap.data?.devices ?? []).find((candidate) => candidate.id === deviceId);
    if (!device) {
      update({ deviceId: "" });
      return;
    }
    const family = deviceFamily(device);
    if (!family) return;
    if (family !== selectedId) chooseFamily(family);
    setState((current) => ({
      ...current,
      deviceId: device.id,
      equipmentId: device.assetTag,
      location: deviceLocation(device, bootstrap.data?.facilities ?? []),
      status: current.status === "not-started" ? "in-progress" : current.status,
    }));
  }

  function setFinding(index: number, finding: Finding) {
    const nextCompleted = completed.has(index) ? state.completed : [...state.completed, index];
    const nextFindings = { ...state.findings, [index]: finding };
    const nextAttentionCount = Object.values(nextFindings).filter(
      (value) => value === "attention",
    ).length;
    const nextStatus =
      nextCompleted.length === template.steps.length && nextAttentionCount === 0
        ? "ready-review"
        : "in-progress";
    update({
      findings: nextFindings,
      completed: nextCompleted,
      status: nextStatus,
    });
  }

  function toggleComplete(index: number) {
    if (!state.safetyConfirmed) return;
    const next = new Set(completed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    update({ completed: [...next], status: next.size ? "in-progress" : "not-started" });
  }

  function resetPm() {
    localStorage.removeItem(storageKey(selectedId));
    setState(loadState(selectedId));
  }

  return (
    <>
      <PageHeading
        eyebrow="Team PM workspace"
        title="PM checklist board"
        description="Track station, diverter, and blower PMs from assignment through closeout. Pick the active PM, confirm safe work conditions, complete the checklist, and send the closeout report."
      />

      <section className="mb-6 grid gap-3 md:grid-cols-4" aria-label="PM team summary">
        <PmMetric icon={ClipboardCheck} label="Active PM" value={template.shortName} />
        <PmMetric icon={CircleDot} label="Status" value={currentStatus.label} tone={currentStatus.tone} />
        <PmMetric icon={CheckCircle2} label="Progress" value={`${progress}%`} />
        <PmMetric
          icon={AlertOctagon}
          label="Open findings"
          value={attentionCount ? String(attentionCount) : String(openItems)}
          tone={attentionCount ? "warning" : "neutral"}
        />
      </section>

      <section className="mb-6 grid gap-3 lg:grid-cols-3" aria-label="Team PM board">
        {pmBoard.map(({ template: item, saved, progress: itemProgress, openItems: itemOpenItems, attentionCount: itemAttentionCount, status }) => {
          const Icon = iconByFamily[item.id];
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseFamily(item.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                active
                  ? "border-teal-300/25 bg-teal-300/[0.065] ring-1 ring-inset ring-teal-300/10"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.035]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
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
                  <div>
                    <p className="text-sm font-semibold text-white">{item.shortName} PM</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {saved.equipmentId || "No equipment selected"}
                    </p>
                  </div>
                </div>
                <StatusPill status={status} />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-teal-400" style={{ width: `${itemProgress}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="font-semibold text-slate-300">{itemProgress}%</p>
                  <p className="mt-0.5 text-slate-600">Done</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-300">{itemOpenItems}</p>
                  <p className="mt-0.5 text-slate-600">Open</p>
                </div>
                <div>
                  <p className={cn("font-semibold", itemAttentionCount ? "text-amber-200" : "text-slate-300")}>
                    {itemAttentionCount}
                  </p>
                  <p className="mt-0.5 text-slate-600">Findings</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{item.purpose}</p>
            </button>
          );
        })}
      </section>

      <Card className="mb-6 border-teal-300/10 bg-teal-300/[0.025] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
              <BookOpenCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Team checklist rules</p>
              <p className="mt-2 max-w-4xl text-xs leading-6 text-slate-500">
                Team members enter equipment identification, inspection results, and completion
                marks. This PM checklist does not connect to Atlas or the tube system, read live
                device states, or issue equipment commands.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setReportOpen(true)}>
            <Mail size={16} /> Build closeout report
          </Button>
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-28">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300/70">
                Active PM assignment
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{template.title}</h2>
                <StatusPill status={currentStatus} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{template.interval}</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <UserRound size={14} className="text-teal-300" /> Assigned team member
                  </span>
                  <input
                    value={state.assignedTo}
                    onChange={(event) => update({ assignedTo: event.target.value })}
                    placeholder={user?.displayName ?? "Technician name"}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
                  />
                </label>
                <label className="block">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <CalendarClock size={14} className="text-teal-300" /> Due date
                  </span>
                  <input
                    type="date"
                    value={state.dueDate}
                    onChange={(event) => update({ dueDate: event.target.value })}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-base text-slate-100 outline-none focus:border-teal-300/30"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Users size={14} className="text-teal-300" /> Shift / crew
                  </span>
                  <input
                    value={state.shift}
                    onChange={(event) => update({ shift: event.target.value })}
                    placeholder="Day shift, night shift, weekend crew"
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-300">PM status</span>
                  <select
                    value={state.status}
                    onChange={(event) => update({ status: event.target.value as PmStatus })}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-[#101821] px-3 text-base text-slate-100 outline-none focus:border-teal-300/30"
                  >
                    <option value="not-started">Not started</option>
                    <option value="in-progress">In progress</option>
                    <option value="ready-review">Ready for review</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-300">Saved device</span>
                <select
                  value={state.deviceId}
                  onChange={(event) => chooseDevice(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-[#101821] px-3 text-base text-slate-100 outline-none focus:border-teal-300/30"
                >
                  <option value="">Enter equipment manually</option>
                  {compatibleDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.assetTag} - {device.equipmentTag}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-[11px] leading-5 text-slate-600">
                  {compatibleDevices.length
                    ? `${compatibleDevices.length} imported ${template.shortName.toLowerCase()} record${compatibleDevices.length === 1 ? "" : "s"} available.`
                    : "Import a device configuration or enter the equipment manually."}
                </span>
              </label>
              {selectedDevice && (
                <div className="rounded-xl border border-teal-300/15 bg-teal-300/[0.04] p-3.5 text-xs leading-5 text-slate-400">
                  <p className="font-semibold text-teal-200">{selectedDevice.equipmentTag}</p>
                  <p className="mt-1">
                    {selectedDevice.type} | {selectedDevice.operationalStatus} |{" "}
                    {selectedDevice.manufacturer}
                  </p>
                </div>
              )}
              <section
                className="rounded-xl border border-teal-300/15 bg-teal-300/[0.035] p-4"
                aria-label="Tools and references"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                  <Wrench size={16} className="text-teal-300" /> Tools and references
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  Have these ready before the inspection begins.
                </p>
                <ul className="mt-3 space-y-2.5">
                  {template.tools.map((tool) => (
                    <li key={tool} className="flex gap-2.5 text-xs leading-5 text-slate-300">
                      <Check size={14} className="mt-0.5 shrink-0 text-teal-300" />
                      {tool}
                    </li>
                  ))}
                </ul>
              </section>
              <label className="block">
                <span className="text-xs font-semibold text-slate-300">Equipment ID or tag</span>
                <input
                  value={state.equipmentId}
                  onChange={(event) => update({ deviceId: "", equipmentId: event.target.value })}
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
              <label className="block">
                <span className="text-xs font-semibold text-slate-300">Work order / reference</span>
                <input
                  value={state.workOrder}
                  onChange={(event) => update({ workOrder: event.target.value })}
                  placeholder="Example: WO-2041"
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
              <Button variant="secondary" className="w-full" onClick={() => setReportOpen(true)}>
                <Mail size={16} /> Build PM report
              </Button>
              <Button variant="ghost" className="w-full" onClick={resetPm}>
                <RotateCcw size={16} /> Reset this PM
              </Button>
            </div>
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
                    Progress stays in this browser. It is not transmitted to external equipment.
                  </p>
                  <p className="mt-2 text-[10px] text-slate-600">
                    Source: {template.source}. The exact equipment-revision manual and site
                    procedure take precedence.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {readyToClose && state.status !== "closed" && (
                  <Button
                    variant="primary"
                    onClick={() => update({ status: "closed" })}
                  >
                    <CheckCircle2 size={15} /> Close PM
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setReportOpen(true)}>
                  <Mail size={15} /> PM report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      {reportOpen && (
        <PmReportDialog
          report={report}
          supervisorEmail={supervisorEmail}
          onSupervisorEmailChange={setSupervisorEmail}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}

function deviceFamily(device: DeviceRow): MaintenanceDeviceFamily | null {
  const type = device.type.toLowerCase();
  if (type.includes("station")) return "station";
  if (type.includes("blower")) return "blower";
  if (type.includes("diverter")) return "diverter";
  return null;
}

function deviceLocation(
  device: DeviceRow,
  facilities: { floorId: string; buildingName: string; floorName: string }[],
) {
  const floor = facilities.find((facility) => facility.floorId === device.floorId);
  return floor ? `${floor.buildingName} - ${floor.floorName}` : "Location not recorded";
}

interface DisplayStatus {
  label: string;
  tone: "neutral" | "active" | "warning" | "success";
}

function pmDisplayStatus(
  status: PmStatus,
  completedCount: number,
  stepCount: number,
  attentionCount: number,
): DisplayStatus {
  if (status === "closed") return { label: "Closed", tone: "success" };
  if (attentionCount > 0) return { label: "Needs follow-up", tone: "warning" };
  if (status === "ready-review" || completedCount === stepCount)
    return { label: "Ready for review", tone: "success" };
  if (completedCount > 0 || status === "in-progress")
    return { label: "In progress", tone: "active" };
  return { label: "Not started", tone: "neutral" };
}

function StatusPill({ status }: { status: DisplayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em]",
        status.tone === "success" && "bg-emerald-300/[0.1] text-emerald-100",
        status.tone === "warning" && "bg-amber-300/[0.1] text-amber-100",
        status.tone === "active" && "bg-teal-300/[0.1] text-teal-100",
        status.tone === "neutral" && "bg-white/[0.06] text-slate-400",
      )}
    >
      <CircleDot size={10} /> {status.label}
    </span>
  );
}

function PmMetric({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: string;
  tone?: DisplayStatus["tone"];
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl border",
            tone === "success"
              ? "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-300"
              : tone === "warning"
                ? "border-amber-300/15 bg-amber-300/[0.05] text-amber-300"
                : tone === "active"
                  ? "border-teal-300/15 bg-teal-300/[0.05] text-teal-300"
                  : "border-white/[0.08] bg-white/[0.025] text-slate-400",
          )}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function PmReportDialog({
  report,
  supervisorEmail,
  onSupervisorEmailChange,
  onClose,
}: {
  report: ReturnType<typeof createPmReport>;
  supervisorEmail: string;
  onSupervisorEmailChange: (value: string) => void;
  onClose: () => void;
}) {
  const canEmail = supervisorEmail.trim().length > 3;
  const mailto = `mailto:${encodeURIComponent(supervisorEmail.trim())}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(report.body)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pm-report-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <Card className="max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div>
            <p className="eyebrow">Supervisor closeout</p>
            <h2 id="pm-report-title" className="mt-2 text-lg font-semibold text-white">
              Detailed PM report ready for review
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              The email draft includes every inspection result, technician note, and open finding.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
            aria-label="Close PM report"
          >
            <span className="text-xl leading-none">x</span>
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReportMetric label="Completion" value={`${report.completionPercent}%`} />
            <ReportMetric label="Open findings" value={String(report.attentionCount)} />
            <ReportMetric label="Delivery" value="Email draft" />
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-200">Supervisor email</span>
            <input
              type="email"
              value={supervisorEmail}
              onChange={(event) => onSupervisorEmailChange(event.target.value)}
              placeholder="supervisor@example.com"
              className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
            />
          </label>
          <div>
            <p className="text-xs font-semibold text-slate-200">Email subject</p>
            <p className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-sm text-slate-400">
              {report.subject}
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-200">Detailed report preview</span>
            <textarea
              readOnly
              rows={14}
              value={report.body}
              className="mt-2 w-full resize-none rounded-xl border border-white/[0.07] bg-[#070c12] px-3 py-3 font-mono text-xs leading-5 text-slate-400 outline-none"
            />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] p-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="ghost" onClick={onClose}>
            Keep editing
          </Button>
          <a
            href={canEmail ? mailto : undefined}
            aria-disabled={!canEmail}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition",
              canEmail
                ? "bg-teal-400 text-[#04100f] hover:bg-teal-300"
                : "cursor-not-allowed bg-white/[0.05] text-slate-700",
            )}
          >
            <Mail size={15} /> Open email draft
          </a>
        </div>
      </Card>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
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
