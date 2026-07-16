import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Filter, LockKeyhole, PackagePlus, Search, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../auth";
import { PageError, PageHeading, PageSkeleton } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useBootstrap } from "../hooks/useBootstrap";
import { createDevice } from "../lib/api";
import { titleCase } from "../lib/utils";

export function AssetsPage() {
  const query = useBootstrap();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dialog, setDialog] = useState(false);
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) return <PageError retry={() => void query.refetch()} />;
  const { devices, facilities } = query.data;
  const filtered = devices.filter(
    (d) =>
      (status === "all" || d.operationalStatus === status) &&
      `${d.assetTag} ${d.equipmentTag} ${d.type} ${d.manufacturer} ${d.serialNumber ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const canCreate = user?.permissions.includes("device:write") ?? false;
  return (
    <>
      <PageHeading
        eyebrow="Asset registry"
        title="Equipment inventory"
        description={`${devices.length} vendor-neutral infrastructure records across ${new Set(facilities.map((f) => f.campusId)).size} authorized facilities. Network details are permission-restricted and excluded from ordinary views.`}
        action={
          canCreate ? (
            <Button onClick={() => setDialog(true)}>
              <PackagePlus size={17} />
              Register device
            </Button>
          ) : undefined
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.055] bg-white/[0.012] p-4 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <span className="sr-only">Search equipment</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-slate-200 outline-none transition focus:border-teal-300/30 focus:ring-2 focus:ring-teal-300/10"
              placeholder="Search asset tag, equipment, serial, manufacturer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="relative">
            <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
            <span className="sr-only">Filter by status</span>
            <select
              className="min-h-11 rounded-xl border border-white/[0.07] bg-[#101922] pl-10 pr-10 text-sm text-slate-200 outline-none focus:border-teal-300/30"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="operational">Operational</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
              <option value="retired">Retired</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-white/[0.018] text-[10px] uppercase tracking-[0.16em] text-slate-600">
              <tr>
                {[
                  "Asset",
                  "Equipment",
                  "Type",
                  "Manufacturer",
                  "Location",
                  "Criticality",
                  "Status",
                  "Firmware",
                ].map((h) => (
                  <th key={h} className="px-5 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((d) => {
                const floor = facilities.find((f) => f.floorId === d.floorId);
                return (
                  <tr key={d.id} className="transition-colors hover:bg-white/[0.018]">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-teal-300/85">
                      {d.assetTag}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-200">{d.equipmentTag}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.serialNumber ?? "Serial not recorded"}
                      </p>
                    </td>
                    <td className="px-5 py-4">{d.type}</td>
                    <td className="px-5 py-4">{d.manufacturer}</td>
                    <td className="px-5 py-4">
                      <p>{floor?.buildingName}</p>
                      <p className="mt-1 text-xs text-slate-500">{floor?.floorName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge>{d.criticality}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge>{d.operationalStatus}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {d.firmwareVersion ?? <span className="text-amber-600">Missing</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-semibold">No equipment matches these filters</p>
            <p className="mt-1 text-sm text-slate-500">Adjust the search term or status filter.</p>
          </div>
        )}
        <div className="border-t border-white/[0.055] bg-white/[0.012] px-5 py-3 text-[11px] text-slate-600">
          Showing {filtered.length} of {devices.length} records · Sensitive network fields protected
          by field-level authorization
        </div>
      </Card>
      {dialog && (
        <DeviceDialog
          data={query.data}
          close={() => setDialog(false)}
          onCreated={async () => {
            setDialog(false);
            await query.refetch();
          }}
        />
      )}
    </>
  );
}

const formSchema = z.object({
  campusId: z.string().uuid(),
  buildingId: z.string().uuid(),
  floorId: z.string().uuid(),
  systemId: z.string().uuid(),
  zoneId: z.string().uuid().or(z.literal("")),
  deviceTypeId: z.string().uuid(),
  manufacturerId: z.string().uuid(),
  assetTag: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, and hyphens"),
  equipmentTag: z.string().min(2).max(80),
  operationalStatus: z.enum(["operational", "degraded", "offline", "retired"]),
  criticality: z.enum(["low", "medium", "high", "critical"]),
  serialNumber: z.string().max(100),
  firmwareVersion: z.string().max(100),
});
type FormValues = z.infer<typeof formSchema>;
function DeviceDialog({
  data,
  close,
  onCreated,
}: {
  data: NonNullable<ReturnType<typeof useBootstrap>["data"]>;
  close(): void;
  onCreated(): Promise<void>;
}) {
  const { csrfToken } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const facilities = [...new Map(data.facilities.map((f) => [f.campusId, f])).values()];
  const types = [
    ...new Map(data.devices.map((d) => [d.typeId, { id: d.typeId, name: d.type }])).values(),
  ];
  const makers = [
    ...new Map(
      data.devices.map((d) => [d.manufacturerId, { id: d.manufacturerId, name: d.manufacturer }]),
    ).values(),
  ];
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campusId: facilities[0]?.campusId ?? "",
      buildingId: "",
      floorId: "",
      systemId: "",
      zoneId: "",
      deviceTypeId: types[0]?.id ?? "",
      manufacturerId: makers[0]?.id ?? "",
      assetTag: "",
      equipmentTag: "",
      operationalStatus: "operational",
      criticality: "medium",
      serialNumber: "",
      firmwareVersion: "",
    },
  });
  const campusId = form.watch("campusId");
  const buildings = [
    ...new Map(
      data.facilities.filter((f) => f.campusId === campusId).map((f) => [f.buildingId, f]),
    ).values(),
  ];
  const buildingId = form.watch("buildingId");
  const floors = data.facilities.filter((f) => f.buildingId === buildingId);
  const systems = data.systems.filter((s) => s.campusId === campusId);
  const systemId = form.watch("systemId");
  const zones = data.zones.filter((z) => z.systemId === systemId);
  async function submit(values: FormValues) {
    if (!csrfToken) return;
    setServerError(null);
    try {
      await createDevice(
        {
          ...values,
          zoneId: values.zoneId || null,
          serialNumber: values.serialNumber || null,
          firmwareVersion: values.firmwareVersion || null,
        },
        csrfToken,
      );
      await onCreated();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Unable to create device");
    }
  }
  return (
    <Dialog.Root open onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#05080c]/85 backdrop-blur-sm" />
        <Dialog.Content
          className="surface-panel fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl shadow-2xl focus:outline-none"
          aria-describedby="register-description"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
            <div>
              <Dialog.Title id="register-title" className="text-xl font-bold">
                Register infrastructure device
              </Dialog.Title>
              <Dialog.Description id="register-description" className="mt-1 text-sm text-slate-500">
                Creates a tenant-scoped, auditable equipment record.
              </Dialog.Description>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={close}>
              <X />
            </Button>
          </div>
          <form onSubmit={form.handleSubmit((values) => void submit(values))}>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Select
                label="Campus"
                register={form.register("campusId")}
                error={form.formState.errors.campusId?.message}
                options={facilities.map((f) => [f.campusId, f.campusName])}
              />
              <Select
                label="Building"
                register={form.register("buildingId")}
                error={form.formState.errors.buildingId?.message}
                options={buildings.map((f) => [f.buildingId, f.buildingName])}
              />
              <Select
                label="Floor"
                register={form.register("floorId")}
                error={form.formState.errors.floorId?.message}
                options={floors.map((f) => [f.floorId, f.floorName])}
              />
              <Select
                label="Pneumatic system"
                register={form.register("systemId")}
                error={form.formState.errors.systemId?.message}
                options={systems.map((s) => [s.id, s.name])}
              />
              <Select
                label="Zone (optional)"
                register={form.register("zoneId")}
                error={form.formState.errors.zoneId?.message}
                options={[
                  ["", "Unassigned"] as [string, string],
                  ...zones.map((z) => [z.id, z.name] as [string, string]),
                ]}
              />
              <Select
                label="Device type"
                register={form.register("deviceTypeId")}
                error={form.formState.errors.deviceTypeId?.message}
                options={types.map((t) => [t.id, t.name])}
              />
              <Select
                label="Manufacturer"
                register={form.register("manufacturerId")}
                error={form.formState.errors.manufacturerId?.message}
                options={makers.map((m) => [m.id, m.name])}
              />
              <Input
                label="Asset tag"
                placeholder="GLR-MC-STA-031"
                register={form.register("assetTag")}
                error={form.formState.errors.assetTag?.message}
              />
              <Input
                label="Equipment tag"
                placeholder="Main lab station 31"
                register={form.register("equipmentTag")}
                error={form.formState.errors.equipmentTag?.message}
              />
              <Input
                label="Serial number"
                register={form.register("serialNumber")}
                error={form.formState.errors.serialNumber?.message}
              />
              <Input
                label="Firmware version"
                register={form.register("firmwareVersion")}
                error={form.formState.errors.firmwareVersion?.message}
              />
              <Select
                label="Operational status"
                register={form.register("operationalStatus")}
                options={["operational", "degraded", "offline", "retired"].map((v) => [
                  v,
                  titleCase(v),
                ])}
              />
              <Select
                label="Criticality"
                register={form.register("criticality")}
                options={["low", "medium", "high", "critical"].map((v) => [v, titleCase(v)])}
              />
            </div>
            {serverError && (
              <div
                role="alert"
                className="mx-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                {serverError}
              </div>
            )}
            <div className="mx-6 mb-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <LockKeyhole className="mt-0.5 shrink-0" size={16} />
              <p>
                <strong>No PHI:</strong> equipment records must never contain patient, specimen,
                medication, or medical-record information. Automated screening is limited.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 p-6 dark:border-slate-700">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registering…" : "Register device"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
type RegisterReturn = ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
function Input({
  label,
  register,
  error,
  placeholder,
}: {
  label: string;
  register: RegisterReturn;
  error?: string | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        className="mt-2 min-h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 font-normal text-slate-200 outline-none focus:border-teal-300/30"
        placeholder={placeholder}
        {...register}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
function Select({
  label,
  register,
  error,
  options,
}: {
  label: string;
  register: RegisterReturn;
  error?: string | undefined;
  options: [string, string][];
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        className="mt-2 min-h-11 w-full rounded-xl border border-white/[0.07] bg-[#101922] px-3 font-normal text-slate-200 outline-none focus:border-teal-300/30"
        {...register}
      >
        <option value="">Select…</option>
        {options.map(([value, name]) => (
          <option key={value || "empty"} value={value}>
            {name}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
