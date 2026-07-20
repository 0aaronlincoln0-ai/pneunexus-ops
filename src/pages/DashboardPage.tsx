import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  Gauge,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "../auth";
import { PageError, PageHeading, PageSkeleton } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { useBootstrap } from "../hooks/useBootstrap";

function isAdministrator(role: string | undefined) {
  return ["organization_admin", "network_admin", "platform_super_admin"].includes(role ?? "");
}

export function DashboardPage() {
  const query = useBootstrap();
  const { user } = useAuth();
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) return <PageError retry={() => void query.refetch()} />;

  const { metrics, workOrders, incidents } = query.data;
  const hasImportedEquipment = query.data.devices.length > 0;
  const activeWork = workOrders.filter((workOrder) => workOrder.status !== "completed");
  const activeIncidents = incidents.filter((incident) => incident.status !== "resolved");

  return (
    <>
      <PageHeading
        eyebrow="Resovii command center"
        title="Pocket Technician is the front door"
        description="Start with the live troubleshooting conversation. Use PM checklists next when the job is planned, repeatable, or ready for closeout."
      />

      {!hasImportedEquipment && (
        <Link
          to="/assets"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.055] p-5 transition hover:border-amber-300/35 hover:bg-amber-300/[0.085]"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200">
              <PackageSearch size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Import equipment to unlock richer guidance</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Pocket Technician works without a selected device, but equipment records make answers more specific.
              </p>
            </div>
          </div>
          <ArrowRight className="shrink-0 text-amber-200" size={18} />
        </Link>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Link
          to="/troubleshoot"
          className="group overflow-hidden rounded-xl border border-teal-300/25 bg-teal-300/[0.06] p-6 transition hover:border-teal-300/45 hover:bg-teal-300/[0.09] sm:p-7"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-300 text-[#04100f]">
                  <Stethoscope size={24} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200">
                    Main attraction
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Pocket Technician</h2>
                </div>
              </div>
              <p className="mt-6 text-base leading-7 text-slate-300">
                Talk through the issue, attach equipment photos, and get one safe next check at a
                time from the live diagnostic assistant.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge>AI chat</Badge>
                <Badge>Photo review</Badge>
                <Badge>Service memory</Badge>
                <Badge>Safe next check</Badge>
              </div>
            </div>
            <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-bold text-[#04100f] transition group-hover:bg-teal-200">
              Start troubleshooting <ArrowRight size={17} />
            </span>
          </div>
        </Link>

        <Link
          to="/maintenance"
          className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-teal-300/25 hover:bg-white/[0.04] sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
              <CalendarCheck2 size={23} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Second priority
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">PM checklists</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            Run station, diverter, and blower PMs with safety confirmation, findings, notes, and a
            supervisor-ready report.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-teal-300">
            Open PM workspace <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <SmallAction
          to="/assets"
          icon={PackageSearch}
          title="Equipment records"
          detail={`${metrics.devices} saved equipment records`}
        />
        <SmallAction
          to="/information"
          icon={BookOpen}
          title="Information"
          detail="Procedures, safety boundaries, and escalation references"
        />
        <SmallAction
          to="/facilities"
          icon={MapPin}
          title="Site notes"
          detail={`${metrics.facilities} facilities and ${metrics.systems} tube systems`}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="eyebrow">Live work</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Items needing attention</h2>
            </div>
            <div className="flex gap-2">
              <Badge>{`${activeWork.length} work orders`}</Badge>
              <Badge>{`${activeIncidents.length} active incidents`}</Badge>
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {activeWork.slice(0, 3).map((workOrder) => (
              <div key={workOrder.id} className="flex items-start gap-4 p-5 sm:px-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.05] text-amber-300">
                  <CalendarCheck2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{workOrder.description}</p>
                    <Badge>{workOrder.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {workOrder.number} - Due{" "}
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                      new Date(workOrder.dueAt ?? workOrder.createdAt),
                    )}
                  </p>
                </div>
              </div>
            ))}
            {activeIncidents.map((incident) => (
              <div key={incident.id} className="flex items-start gap-4 p-5 sm:px-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-300/15 bg-red-300/[0.05] text-red-300">
                  <ShieldCheck size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{incident.title}</p>
                    <Badge>{incident.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {incident.number} - {incident.severity} severity
                  </p>
                </div>
              </div>
            ))}
            {activeWork.length === 0 && activeIncidents.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-200">No open work items yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Start with Pocket Technician for live problems, or PM checklists for planned work.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                <Gauge size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Workspace readiness</p>
                <p className="mt-1 text-xs text-slate-600">Operational context</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <p>
                <strong className="text-slate-100">{metrics.devices}</strong> equipment records
              </p>
              <p>
                <strong className="text-slate-100">{metrics.openWorkOrders}</strong> open work orders
              </p>
              <p>
                <strong className="text-slate-100">{metrics.overdueMaintenance}</strong> overdue PMs
              </p>
            </div>
          </Card>

          {isAdministrator(user?.role) && (
            <Link
              to="/admin"
              className="block rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-5 transition hover:border-indigo-300/25 hover:bg-indigo-300/[0.075]"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.07] text-indigo-200">
                  <ClipboardList size={19} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Service memory</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Save resolved cases and equipment photos for Pocket Technician to reference.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-200">
                    Open administrator workspace <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function SmallAction({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string;
  icon: typeof PackageSearch;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-teal-300/20 hover:bg-teal-300/[0.035]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300">
        <Icon size={18} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-teal-300">
        Open <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
