import { z } from "zod";

const deviceSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  type: z.string().trim().min(1).max(80),
  zone: z.string().trim().max(80).optional().default(""),
  floor: z.string().trim().max(80).optional().default(""),
  status: z.string().trim().max(40).optional().default(""),
  serial: z.string().trim().max(100).optional().default(""),
});

export const tubeTrackerConfigSchema = z.object({
  _version: z.string().trim().min(1).max(40),
  _tool: z.literal("Tube Tracker"),
  project: z.object({
    name: z.string().trim().min(1).max(160),
    hospital: z.string().trim().max(160).optional().default(""),
    systype: z.string().trim().max(120).optional().default("Pneumatic Tube"),
  }),
  zones: z.array(z.string().trim().min(1).max(80)).max(1_000).optional().default([]),
  floors: z.array(z.string().trim().min(1).max(80)).max(1_000).optional().default([]),
  devices: z.array(deviceSchema).min(1).max(10_000),
});

export type TubeTrackerConfig = z.infer<typeof tubeTrackerConfigSchema>;

export interface NormalizedTubeTrackerImport {
  projectName: string;
  campusName: string;
  systemName: string;
  version: string;
  zones: string[];
  floors: string[];
  devices: Array<{
    assetTag: string;
    equipmentTag: string;
    type: string;
    zone: string;
    floor: string;
    serial: string | null;
    operationalStatus: "operational" | "degraded" | "offline";
    criticality: "medium" | "high";
  }>;
  warnings: string[];
}

export function normalizeTubeTrackerConfig(input: unknown): NormalizedTubeTrackerImport {
  const config = tubeTrackerConfigSchema.parse(input);
  const warnings: string[] = [];
  const declaredZones = unique(config.zones);
  const sourceZones = unique([...declaredZones, ...config.devices.map((device) => device.zone)]);
  const floors = unique([...config.floors, ...config.devices.map((device) => device.floor)]);
  const availableFloors = floors.length ? floors : ["Unassigned"];
  const seenAssetTags = new Map<string, number>();
  const devices = config.devices.map((device) => {
    const baseAssetTag = toAssetTag(device.id);
    const occurrence = (seenAssetTags.get(baseAssetTag) ?? 0) + 1;
    seenAssetTags.set(baseAssetTag, occurrence);
    const assetTag = occurrence === 1 ? baseAssetTag : `${baseAssetTag}-${occurrence}`;
    if (occurrence > 1)
      warnings.push(
        `Duplicate source ID "${device.id}" was retained as asset tag "${assetTag}". Confirm which record is correct.`,
      );
    const floor = availableFloors.includes(device.floor) ? device.floor : availableFloors[0]!;
    if (device.floor && floor !== device.floor)
      warnings.push(
        `Device "${device.id}" references unknown floor "${device.floor}" and was placed in "${floor}".`,
      );
    if (device.zone && !declaredZones.includes(device.zone))
      warnings.push(
        `Device "${device.id}" references undeclared zone "${device.zone}". The zone was created for review.`,
      );
    return {
      assetTag,
      equipmentTag: device.name,
      type: device.type,
      zone: device.zone,
      floor,
      serial: device.serial || null,
      operationalStatus: toOperationalStatus(device.status),
      criticality: device.type.toLowerCase().includes("blower")
        ? ("high" as const)
        : ("medium" as const),
    };
  });

  return {
    projectName: config.project.name,
    campusName: config.project.hospital || config.project.name,
    systemName: config.project.systype || "Pneumatic Tube",
    version: config._version,
    zones: sourceZones,
    floors: availableFloors,
    devices,
    warnings: [...new Set(warnings)],
  };
}

export function importCode(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 36) || "IMPORTED"
  );
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toAssetTag(value: string) {
  return importCode(value);
}

function toOperationalStatus(status: string): "operational" | "degraded" | "offline" {
  const normalized = status.toLowerCase();
  if (normalized === "online" || normalized === "operational") return "operational";
  if (normalized === "offline") return "offline";
  return "degraded";
}
