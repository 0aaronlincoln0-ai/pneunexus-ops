import { Building2, ChevronRight, Layers3, MapPin, Network, Waypoints } from "lucide-react";
import { PageError, PageHeading, PageSkeleton } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { useBootstrap } from "../hooks/useBootstrap";

export function FacilitiesPage() {
  const query = useBootstrap();
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) return <PageError retry={() => void query.refetch()} />;
  const { facilities, systems, zones, devices } = query.data;
  const campuses = [...new Map(facilities.map((row) => [row.campusId, row])).values()];
  return (
    <>
      <PageHeading
        eyebrow="Manually maintained site reference"
        title="Saved locations and tube-system notes"
        description="Organize campuses, buildings, floors, systems, and zones entered by the technician or administrator. Nothing on this page is read from the hospital network or tube equipment."
      />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.055] bg-white/[0.018] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            Saved location hierarchy
          </div>
          <div className="divide-y divide-white/[0.055]">
            {campuses.map((campus) => {
              const campusBuildings = [
                ...new Map(
                  facilities
                    .filter((f) => f.campusId === campus.campusId)
                    .map((f) => [f.buildingId, f]),
                ).values(),
              ];
              const campusSystems = systems.filter((s) => s.campusId === campus.campusId);
              return (
                <section key={campus.campusId} className="p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl border border-teal-300/10 bg-teal-300/[0.045] text-teal-300/80">
                        <MapPin />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{campus.campusName}</h3>
                        <p className="text-sm text-slate-500">
                          {campus.city}, {campus.state} · {campus.networkName}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {campusSystems.map((s) => (
                        <Badge key={s.id}>{s.status}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="ml-5 mt-5 border-l border-white/[0.07] pl-7">
                    {campusBuildings.map((building) => {
                      const buildingFloors = facilities.filter(
                        (f) => f.buildingId === building.buildingId,
                      );
                      return (
                        <div key={building.buildingId} className="mb-5 last:mb-0">
                          <div className="flex items-center gap-2 font-semibold">
                            <Building2 size={17} className="text-slate-400" />
                            {building.buildingName}
                            <span className="text-xs font-normal text-slate-500">
                              {building.buildingCode}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {buildingFloors.map((floor) => (
                              <div
                                key={floor.floorId}
                                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 text-sm text-slate-300 transition-colors hover:border-teal-300/20 hover:bg-teal-300/[0.025]"
                              >
                                <Layers3 size={15} className="text-teal-300/75" />
                                <span>{floor.floorName}</span>
                                <ChevronRight size={14} className="ml-auto text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {campuses.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-slate-200">No site locations saved yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Add locations and system notes as they become available.
                </p>
              </div>
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Record summary
            </p>
            <div className="mt-5 space-y-4">
              <Summary icon={MapPin} label="Campuses" value={campuses.length} />
              <Summary
                icon={Building2}
                label="Buildings"
                value={new Set(facilities.map((f) => f.buildingId)).size}
              />
              <Summary icon={Layers3} label="Floors" value={facilities.length} />
              <Summary icon={Network} label="Systems" value={systems.length} />
              <Summary icon={Waypoints} label="Zones" value={zones.length} />
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-200">
              Manually recorded system layout
            </h3>
            <div className="mt-5 space-y-4">
              {systems.map((system) => (
                <div
                  key={system.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{system.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{system.code}</p>
                    </div>
                    <Badge>{system.status}</Badge>
                  </div>
                  <div className="mt-4 flex gap-5 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-900 dark:text-white">
                        {zones.filter((z) => z.systemId === system.id).length}
                      </strong>{" "}
                      zones
                    </span>
                    <span>
                      <strong className="text-slate-900 dark:text-white">
                        {devices.filter((d) => d.systemId === system.id).length}
                      </strong>{" "}
                      devices
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-teal-300/75">
        <Icon size={17} />
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <strong className="ml-auto text-xl font-semibold tracking-tight text-white">{value}</strong>
    </div>
  );
}
