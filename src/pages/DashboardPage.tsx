import {
  AlertTriangle,
  Boxes,
  Building2,
  CalendarClock,
  CircleGauge,
  Clock3,
  FileWarning,
  Network,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useBootstrap } from "../hooks/useBootstrap";
import { formatDate, titleCase } from "../lib/utils";
import { PageError, PageHeading, PageSkeleton } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

const icons = [
  Building2,
  Network,
  Boxes,
  Wrench,
  CalendarClock,
  FileWarning,
  AlertTriangle,
  Clock3,
];

export function DashboardPage() {
  const query = useBootstrap();
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) return <PageError retry={() => void query.refetch()} />;
  const { metrics, devices, systems, workOrders, incidents } = query.data;
  const cards = [
    ["Facilities", metrics.facilities, "Across the network"],
    [
      "Pneumatic systems",
      metrics.systems,
      `${systems.filter((s) => s.status === "operational").length} operational`,
    ],
    [
      "Registered devices",
      metrics.devices,
      `${devices.filter((d) => d.operationalStatus === "operational").length} operational`,
    ],
    ["Open work orders", metrics.openWorkOrders, "Across assigned facilities"],
    ["Overdue inspections", metrics.overdueMaintenance, "Requires attention"],
    ["Incomplete systems", metrics.incompleteSystems, "Below 90% documented"],
    ["Missing device data", metrics.missingDeviceData, "Serial or firmware"],
    ["Mean time to repair", `${metrics.mttrMinutes}m`, "From restored incidents"],
  ];
  const statusCounts = countBy(devices.map((d) => d.operationalStatus));
  const typeCounts = countBy(devices.map((d) => d.type));
  const manufacturerCounts = countBy(devices.map((d) => d.manufacturer));
  return (
    <>
      <PageHeading
        eyebrow="Executive operations dashboard"
        title="Infrastructure at a glance"
        description="Live metrics calculated from fictional Great Lakes Regional Health demonstration records. No patient or clinical data is present."
        action={
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.045] px-3.5 py-2.5 text-xs font-semibold text-emerald-300/90">
            <span className="status-pulse" />
            All scoped services reporting
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, detail], i) => {
          const Icon = icons[i] ?? CircleGauge;
          return (
            <Card key={String(label)} className="stat-card relative overflow-hidden p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-teal-300/80">
                  <Icon size={17} strokeWidth={1.8} />
                </div>
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-white">{value}</p>
              <p className="mt-1.5 text-[11px] text-slate-600">{detail}</p>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Facility health score</p>
              <p className="mt-1 text-[11px] text-slate-600">
                Share of registered equipment in operational state
              </p>
            </div>
            <span className="text-3xl font-semibold tracking-tight text-emerald-300">
              {metrics.healthScore}%
            </span>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.045]">
            <div
              className={`h-full rounded-full bg-emerald-500 ${percentageClass(metrics.healthScore)}`}
            />
          </div>
          <div className="mt-8 grid gap-7 md:grid-cols-3">
            <Breakdown title="Equipment status" values={statusCounts} total={devices.length} />
            <Breakdown title="Devices by type" values={typeCounts} total={devices.length} />
            <Breakdown title="Manufacturers" values={manufacturerCounts} total={devices.length} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-teal-300">
              <ShieldCheck size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Documentation posture</p>
              <p className="mt-0.5 text-[11px] text-slate-600">System record completeness</p>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {systems.map((system) => (
              <div key={system.id}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-300">{system.name}</span>
                  <span className="text-slate-500">{system.documentationCompleteness}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.045]">
                  <div
                    className={`h-full rounded-full bg-teal-400/80 ${percentageClass(system.documentationCompleteness)}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <p className="text-2xl font-semibold tracking-tight text-white">
                {metrics.expiringWarranties}
              </p>
              <p className="text-xs text-slate-500">Warranties ≤90 days</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <p className="text-2xl font-semibold tracking-tight text-white">
                {metrics.overdueMaintenance}
              </p>
              <p className="text-xs text-slate-500">Inspections overdue</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <SectionHeader
            title="Work order queue"
            detail={`${metrics.openWorkOrders} active requests`}
          />
          <div className="divide-y divide-white/[0.055]">
            {workOrders.slice(0, 6).map((wo) => (
              <div
                key={wo.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.018]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-teal-300/75">
                  <Wrench size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {wo.number} · {wo.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Due {formatDate(wo.dueAt)}</p>
                </div>
                <Badge>{wo.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <SectionHeader title="Recent incidents" detail="Infrastructure-only operational events" />
          <div className="divide-y divide-white/[0.055]">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.018]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/10 bg-amber-300/[0.045] text-amber-300/80">
                  <AlertTriangle size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {incident.number} · {incident.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Detected {formatDate(incident.detectedAt)}
                  </p>
                </div>
                <Badge>{incident.severity}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function countBy(values: string[]) {
  return Object.entries(
    values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
}
function percentageClass(value: number) {
  return `progress-${Math.max(0, Math.min(20, Math.round(value / 5))) * 5}`;
}
function Breakdown({
  title,
  values,
  total,
}: {
  title: string;
  values: [string, number][];
  total: number;
}) {
  return (
    <div>
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {title}
      </p>
      <div className="space-y-3">
        {values.slice(0, 5).map(([label, count]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-500">{titleCase(label)}</span>
              <span className="font-semibold text-slate-300">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.045]">
              <div
                className={`h-full rounded-full bg-teal-400/75 ${percentageClass(total ? (count / total) * 100 : 0)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.055] px-6 py-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <p className="mt-1 text-[11px] text-slate-600">{detail}</p>
      </div>
    </div>
  );
}
