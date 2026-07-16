import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  Check,
  ClipboardList,
  Fan,
  GitBranch,
  PackageOpen,
  PackageSearch,
  ShieldCheck,
  Stethoscope,
  WifiOff,
} from "lucide-react";
import { PageError, PageHeading, PageSkeleton } from "../components/QueryState";
import { Card } from "../components/ui/card";
import { useBootstrap } from "../hooks/useBootstrap";
import { pevcoKnowledgeProfile } from "../lib/pevco-knowledge";

export function DashboardPage() {
  const query = useBootstrap();
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) return <PageError retry={() => void query.refetch()} />;

  const { devices, facilities } = query.data;

  return (
    <>
      <PageHeading
        eyebrow="Standalone pneumatic tube field guide"
        title="Troubleshoot, maintain, and document"
        description="A separate technician web app for guided diagnosis and planned maintenance. It does not connect to Atlas, hospital servers, controls, sensors, or pneumatic tube equipment."
        action={
          <Link
            to="/troubleshoot"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-400 px-4 text-sm font-bold text-[#04100f] transition hover:bg-teal-300"
          >
            Start troubleshooting <ArrowRight size={17} />
          </Link>
        }
      />

      <Card className="mb-6 overflow-hidden border-emerald-300/15 bg-emerald-300/[0.025]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300">
            <WifiOff size={22} />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-white">No live system connection</p>
            <p className="mt-1.5 max-w-4xl text-sm leading-6 text-slate-500">
              Technicians enter the observed fault, equipment details, PM results, and notes
              themselves. AI can help interpret those entries, photos, and voice reports, but it
              cannot see or control the hospital's tube system.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-slate-500">
            Manual input only
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Field guide tools">
        <ToolCard
          to="/troubleshoot"
          icon={Stethoscope}
          eyebrow="Diagnose"
          title="Guided troubleshooting"
          detail="Describe the symptom by voice or text, add an equipment photo, and follow one safe check at a time."
        />
        <ToolCard
          to="/maintenance"
          icon={CalendarCheck2}
          eyebrow="Prevent"
          title="Planned maintenance"
          detail="Run station, diverter, and blower PM checklists with instructions, findings, verification, and escalation."
        />
        <ToolCard
          to="/assets"
          icon={PackageSearch}
          eyebrow="Reference"
          title="Equipment records"
          detail={`Browse ${devices.length} example records or manually maintain equipment tags, locations, revisions, and service details.`}
        />
        <ToolCard
          to="/facilities"
          icon={ClipboardList}
          eyebrow="Organize"
          title="Site notes"
          detail={`Keep manually entered location and system reference notes across ${facilities.length} example floor records.`}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden">
          <SectionHeader
            eyebrow="Technician workflow"
            title="One repeatable process"
            detail="Use the guide as a field reference—not as a monitoring or control screen."
          />
          <div className="grid gap-0 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <WorkflowColumn
              icon={Stethoscope}
              title="Troubleshooting flow"
              steps={[
                "Enter the exact symptom, message, device, and what moved or failed to move.",
                "Preserve locally visible fault, transaction, sensor, or position evidence.",
                "Confirm the safety boundary before opening equipment.",
                "Complete one reviewed diagnostic check at a time.",
                "Verify with an approved empty-carrier test or escalate to service.",
              ]}
            />
            <WorkflowColumn
              icon={CalendarCheck2}
              title="Planned maintenance flow"
              steps={[
                "Choose Station, Diverter, or Blower and identify the equipment.",
                "Review required tools, outage coordination, and lockout conditions.",
                "Inspect, clean, adjust, and document each approved PM item.",
                "Record passes, findings, parts needed, and unresolved conditions.",
                "Complete return-to-service checks and set the next PM date.",
              ]}
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <SectionHeader
            eyebrow="Pevco equipment model"
            title="The three primary device families"
            detail="The guide is organized around the equipment the technician physically maintains."
          />
          <div className="space-y-3 p-5 sm:p-6">
            <DeviceFamily
              icon={PackageOpen}
              title="Station"
              detail="Endpoint carrier handling, dispatch and slide mechanisms, sensors, receive area, and carrier inventory."
            />
            <DeviceFamily
              icon={GitBranch}
              title="Diverter"
              detail="Indexed path alignment, carrier sensing, seals, chain, brake, drive, and port condition."
            />
            <DeviceFamily
              icon={Fan}
              title="Blower"
              detail="Air shifter, idle/vacuum/pressure alignment, airflow sensing, seals, brake, drive, and electrical package."
            />
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <BookOpenCheck className="mt-0.5 shrink-0 text-teal-300" size={20} />
            <div>
              <p className="text-sm font-semibold text-slate-100">Procedure authority</p>
              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">
                The app organizes booklet-derived and manufacturer-published guidance into a
                technician workflow. The exact site manual, equipment revision, hospital safety
                policy, infection-prevention procedure, and qualified personnel always take
                precedence.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
            <ShieldCheck size={14} /> Reference and documentation only
          </span>
        </div>
      </Card>
    </>
  );
}

function ToolCard({
  to,
  icon: Icon,
  eyebrow,
  title,
  detail,
}: {
  to: "/" | "/troubleshoot" | "/maintenance" | "/assets" | "/facilities";
  icon: typeof Stethoscope;
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-teal-300/20 hover:bg-teal-300/[0.035]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-teal-300/12 bg-teal-300/[0.05] text-teal-300">
          <Icon size={20} />
        </span>
        <ArrowRight
          size={17}
          className="text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-teal-300"
        />
      </div>
      <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.16em] text-teal-300/65">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </Link>
  );
}

function SectionHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-300/70">{eyebrow}</p>
      <h2 className="mt-2 text-base font-semibold text-slate-100">{title}</h2>
      <p className="mt-1 text-[11px] leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function WorkflowColumn({
  icon: Icon,
  title,
  steps,
}: {
  icon: typeof Stethoscope;
  title: string;
  steps: string[];
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-300/[0.06] text-teal-300">
          <Icon size={17} />
        </span>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-xs leading-5 text-slate-500">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[10px] font-bold text-teal-300">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DeviceFamily({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof PackageOpen;
  title: string;
  detail: string;
}) {
  const profile = pevcoKnowledgeProfile.deviceFamilies.find(({ name }) => name === title);
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-300/[0.06] text-teal-300">
          <Icon size={19} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
          {profile && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.evidence.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[9px] text-slate-600"
                >
                  <Check size={10} className="text-teal-300/60" /> {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
