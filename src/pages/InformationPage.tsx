import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  FileSearch,
  PackageSearch,
  Search,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeading } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { maintenanceTemplates } from "../lib/maintenance";
import { pevcoKnowledgeProfile } from "../lib/pevco-knowledge";
import {
  diagnosticCategories,
  searchTroubleshootingGuides,
  type RiskLevel,
  type TroubleshootingGuide,
} from "../lib/troubleshooting";
import { cn } from "../lib/utils";

const actionCards = [
  {
    to: "/troubleshoot",
    icon: Stethoscope,
    eyebrow: "Live diagnosis",
    title: "Pocket Technician",
    detail: "Start a focused diagnostic conversation and resume a recent field case.",
  },
  {
    to: "/maintenance",
    icon: ClipboardList,
    eyebrow: "Plan and document",
    title: "PM workspace",
    detail: "Run inspections, record findings, and prepare a detailed supervisor report.",
  },
  {
    to: "/assets",
    icon: PackageSearch,
    eyebrow: "Identify equipment",
    title: "Equipment records",
    detail: "Review imported devices, equipment tags, revisions, and recorded condition.",
  },
  {
    to: "/facilities",
    icon: Building2,
    eyebrow: "Locate the route",
    title: "Site notes",
    detail: "Review the saved site, building, floor, system, and zone information.",
  },
] as const;

const riskStyle: Record<RiskLevel, string> = {
  routine: "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-300",
  caution: "border-amber-300/15 bg-amber-300/[0.05] text-amber-300",
  restricted: "border-red-300/15 bg-red-300/[0.05] text-red-300",
};

export function InformationPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const protocols = useMemo(() => searchTroubleshootingGuides(query, category), [query, category]);
  const selected = protocols.find((guide) => guide.id === selectedId) ?? null;

  return (
    <>
      <PageHeading
        eyebrow="Information center"
        title="Find the right reference before you start work"
        description="Search reviewed procedures, inspect the current equipment record, and open the workspace that fits the job. Nothing is preselected for you."
      />

      <section
        className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Information center actions"
      >
        {actionCards.map(({ to, icon: Icon, eyebrow, title, detail }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-lg border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-teal-300/20 hover:bg-teal-300/[0.035]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                <Icon size={19} />
              </span>
              <ArrowRight
                size={18}
                className="mt-1 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-teal-300"
              />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300/70">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-base font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
          </Link>
        ))}
      </section>

      <section id="protocol-library" className="scroll-mt-28">
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
            <p className="eyebrow">Protocol library</p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Reviewed troubleshooting procedures
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Search by observed symptom, device, fault text, or procedure category. Select a
                  result only when it matches your situation.
                </p>
              </div>
              <Link
                to="/troubleshoot"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-teal-200 hover:text-teal-100"
              >
                Start live diagnosis <ChevronRight size={15} />
              </Link>
            </div>
          </div>

          <div className="border-b border-white/[0.06] bg-white/[0.012] p-4 sm:px-6">
            <label className="relative block">
              <Search className="absolute left-3.5 top-3.5 text-slate-600" size={17} />
              <span className="sr-only">Search troubleshooting procedures</span>
              <input
                className="min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#101821] pl-10 pr-4 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
                placeholder="Search symptoms, device, or fault text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Procedure categories">
              {diagnosticCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold transition",
                    category === item
                      ? "border-teal-300/20 bg-teal-300/[0.08] text-teal-200"
                      : "border-white/[0.07] bg-white/[0.015] text-slate-500 hover:text-slate-300",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-start lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
            <div className="border-b border-white/[0.06] p-3 lg:max-h-[44rem] lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <p className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                {protocols.length} procedures
              </p>
              <div className="space-y-1">
                {protocols.map((guide) => (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => setSelectedId(guide.id)}
                    className={cn(
                      "w-full rounded-lg border p-3.5 text-left transition",
                      selectedId === guide.id
                        ? "border-teal-300/20 bg-teal-300/[0.055]"
                        : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.025]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-teal-300">
                        <FileSearch size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-5 text-slate-200">
                          {guide.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          {guide.category} | {guide.steps.length} checks
                        </span>
                      </span>
                      <ChevronRight size={16} className="mt-1 shrink-0 text-slate-600" />
                    </div>
                  </button>
                ))}
              </div>
              {protocols.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <FileSearch className="mx-auto text-slate-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-400">No matching procedure</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Try a visible fault, device name, or symptom.
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              {selected ? <ProtocolDetail guide={selected} /> : <ProtocolPlaceholder />}
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
            <p className="eyebrow">Planned maintenance</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Available PM procedures</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {maintenanceTemplates.map((template) => (
              <div key={template.id} className="p-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <Wrench size={17} className="mt-0.5 shrink-0 text-teal-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{template.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{template.purpose}</p>
                    <p className="mt-2 text-[10px] text-slate-600">
                      {template.steps.length} inspection tasks | {template.interval}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
            <p className="eyebrow">Field method</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Capture reliable evidence</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            <ReferenceList
              icon={BookOpenCheck}
              title="Before diagnosis"
              items={pevcoKnowledgeProfile.atlasEvidence}
            />
            <ReferenceList
              icon={ShieldCheck}
              title="Working method"
              items={pevcoKnowledgeProfile.diagnosticMethod}
            />
          </div>
        </Card>
      </section>
    </>
  );
}

function ProtocolPlaceholder() {
  return (
    <div className="grid min-h-72 place-items-center text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
          <BookOpenCheck size={21} />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-white">Choose a procedure to review</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The library stays neutral until you select a result that fits the field observation.
        </p>
      </div>
    </div>
  );
}

function ProtocolDetail({ guide }: { guide: TroubleshootingGuide }) {
  return (
    <div className="animate-in fade-in-0 duration-200">
      <div className="flex flex-wrap gap-2">
        <Badge>{guide.category}</Badge>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
            riskStyle[guide.risk],
          )}
        >
          {guide.risk} access
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-white">{guide.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{guide.summary}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ProtocolList title="Observed signals" items={guide.symptoms} />
        <ProtocolList title="Safety boundary" items={guide.safety} />
      </div>
      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300/70">
          Procedure checks
        </p>
        <ol className="mt-4 space-y-3">
          {guide.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-300/[0.08] text-xs font-bold text-teal-300">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{step.instruction}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ProtocolList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.018] p-4">
      <p className="text-xs font-semibold text-slate-200">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 4).map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-5 text-slate-500">
            <Check size={14} className="mt-0.5 shrink-0 text-teal-300" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReferenceList({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof BookOpenCheck;
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-300/[0.06] text-teal-300">
          <Icon size={17} />
        </span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-xs leading-5 text-slate-500">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300/70" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
