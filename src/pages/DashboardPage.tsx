import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
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

const coreActions = [
  {
    to: "/troubleshoot",
    icon: Stethoscope,
    step: "1",
    title: "Resolve a problem",
    detail: "Talk through the symptom, attach equipment evidence, and get one safe next check.",
    emphasis: true,
  },
  {
    to: "/maintenance",
    icon: CalendarCheck2,
    step: "2",
    title: "Complete a PM",
    detail: "Run the correct checklist, document findings, and prepare the supervisor report.",
    emphasis: true,
  },
  {
    to: "/assets",
    icon: PackageSearch,
    step: "3",
    title: "Find equipment",
    detail: "Look up tags, recorded condition, revision details, and service context.",
    emphasis: false,
  },
  {
    to: "/information",
    icon: BookOpen,
    step: "4",
    title: "Get field information",
    detail: "Start with site context, safety boundaries, procedures, and escalation guidance.",
    emphasis: false,
  },
] as const;

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
        eyebrow="Technician workboard"
        title={hasImportedEquipment ? "What do you need to do?" : "Start with your equipment"}
        description={
          hasImportedEquipment
            ? "Choose the task in front of you. The app will keep the procedure, evidence, and closeout information together as you work."
            : "This workspace is blank. Import the hospital device configuration to create the equipment, locations, and PM context used throughout Resovii."
        }
      />

      {!hasImportedEquipment && (
        <Link
          to="/assets"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-teal-300/20 bg-teal-300/[0.055] p-5 transition hover:border-teal-300/35 hover:bg-teal-300/[0.085]"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal-300/15 bg-[#071916] text-teal-300">
              <PackageSearch size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Import hospital device configuration</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Load a supported configuration to populate your equipment records and PM selector.
              </p>
            </div>
          </div>
          <ArrowRight className="shrink-0 text-teal-300" size={18} />
        </Link>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Choose a task">
        {coreActions.map(({ to, icon: Icon, step, title, detail, emphasis }) => (
          <Link
            key={to}
            to={to}
            className={
              emphasis
                ? "group rounded-xl border border-teal-300/20 bg-teal-300/[0.055] p-5 transition hover:border-teal-300/35 hover:bg-teal-300/[0.085]"
                : "group rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-teal-300/20 hover:bg-teal-300/[0.035]"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-teal-300/15 bg-[#071916] text-teal-300">
                <Icon size={20} />
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] bg-black/10 text-[10px] font-bold text-slate-500">
                {step}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-teal-300">
              Open workspace{" "}
              <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="eyebrow">Today&apos;s work</p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                Open items needing attention
              </h2>
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
                    {workOrder.number} · Due{" "}
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
                    {incident.number} · {incident.severity} severity
                  </p>
                </div>
              </div>
            ))}
            {activeWork.length === 0 && activeIncidents.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-200">No open work items yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Start a PM, guided troubleshooting session, or service call when work is ready to
                  be recorded.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                <MapPin size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Work context</p>
                <p className="mt-1 text-xs text-slate-600">Reference information</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <p>
                <strong className="text-slate-100">{metrics.devices}</strong> equipment records
              </p>
              <p>
                <strong className="text-slate-100">{metrics.facilities}</strong> saved facilities
              </p>
              <p>
                <strong className="text-slate-100">{metrics.systems}</strong> tube systems in the
                reference
              </p>
            </div>
            <Link
              to="/facilities"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-teal-300"
            >
              Open site notes <ArrowRight size={14} />
            </Link>
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
                  <p className="text-sm font-semibold text-white">Administrator service history</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Capture past resolutions, recurring problems, and equipment photos for the team.
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
