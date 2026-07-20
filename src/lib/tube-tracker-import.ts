import { z } from "zod";
import type { BootstrapData, DeviceRow, FacilityRow, SystemRow, ZoneRow } from "../types";

const deviceSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  zone: z.string().optional().default(""),
  floor: z.string().optional().default(""),
  status: z.string().optional().default(""),
  serial: z.string().optional().default(""),
});

const tubeTrackerConfigSchema = z.object({
  _version: z.string().trim().min(1),
  _tool: z.literal("Tube Tracker"),
  project: z.object({
    name: z.string().trim().min(1),
    hospital: z.string().trim().optional().default(""),
    systype: z.string().trim().optional().default("Pneumatic Tube"),
  }),
  zones: z.array(z.string()).optional().default([]),
  floors: z.array(z.string()).optional().default([]),
  devices: z.array(deviceSchema).min(1),
});

export interface TubeTrackerImportPreview {
  data: BootstrapData;
  source: { projectName: string; systemType: string; version: string };
  warnings: string[];
}

export function parseTubeTrackerConfig(input: unknown): TubeTrackerImportPreview {
  const config = tubeTrackerConfigSchema.parse(input);
  const warnings: string[] = [];
  const projectLabel = config.project.hospital || config.project.name;
  const rootId = `tube-tracker-${toSlug(config.project.name)}`;
  const campusId = `${rootId}-campus`;
  const buildingId = `${rootId}-building`;
  const systemId = `${rootId}-system`;
  const declaredZones = uniqueNonEmpty(config.zones);
  const sourceZones = uniqueNonEmpty([
    ...declaredZones,
    ...config.devices.map((device) => device.zone),
  ]);
  const sourceFloors = uniqueNonEmpty([
    ...config.floors,
    ...config.devices.map((device) => device.floor),
  ]);
  const floors = sourceFloors.length ? sourceFloors : ["Unassigned"];
  const facilities = floors.map((floor, index) =>
    facilityRow({
      campusId,
      buildingId,
      floorId: `${rootId}-floor-${toSlug(floor)}`,
      projectLabel,
      projectName: config.project.name,
      floor,
      level: index,
    }),
  );
  const floorIdByName = new Map(facilities.map((floor) => [floor.floorName, floor.floorId]));
  const zones = sourceZones.map((zone) =>
    zoneRow(`${rootId}-zone-${toSlug(zone)}`, systemId, zone),
  );
  const zoneIdByName = new Map(zones.map((zone) => [zone.name, zone.id]));
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
    const floorName = floorIdByName?.has(device.floor) ? device.floor : floors[0]!;
    if (device.floor && !floorIdByName.has(device.floor))
      warnings.push(
        `Device "${device.id}" references unknown floor "${device.floor}" and was placed in "${floorName}".`,
      );
    if (device.zone && !declaredZones.includes(device.zone))
      warnings.push(
        `Device "${device.id}" references undeclared zone "${device.zone}". The zone was created for review.`,
      );
    return deviceRow({
      id: `${rootId}-device-${toSlug(assetTag)}`,
      campusId,
      buildingId,
      floorId: floorIdByName.get(floorName) ?? facilities[0]!.floorId,
      systemId,
      zoneId: zoneIdByName.get(device.zone) ?? null,
      assetTag,
      device,
    });
  });

  const systems: SystemRow[] = [
    {
      id: systemId,
      campusId,
      name: config.project.systype || "Pneumatic Tube",
      code: toAssetTag(config.project.name),
      status: "operational",
      documentationCompleteness: 100,
    },
  ];

  return {
    data: {
      demo: true,
      generatedAt: new Date().toISOString(),
      metrics: {
        facilities: new Set(facilities.map((facility) => facility.campusId)).size,
        systems: systems.length,
        devices: devices.length,
        openWorkOrders: 0,
        overdueMaintenance: 0,
        incompleteSystems: 0,
        missingDeviceData: devices.filter((device) => !device.serialNumber).length,
        healthScore: 0,
        mttrMinutes: 0,
        expiringWarranties: 0,
      },
      facilities,
      systems,
      zones,
      devices,
      workOrders: [],
      incidents: [],
    },
    source: {
      projectName: config.project.name,
      systemType: config.project.systype || "Pneumatic Tube",
      version: config._version,
    },
    warnings: [...new Set(warnings)],
  };
}

function facilityRow(input: {
  campusId: string;
  buildingId: string;
  floorId: string;
  projectLabel: string;
  projectName: string;
  floor: string;
  level: number;
}): FacilityRow {
  return {
    networkId: `${input.campusId}-network`,
    networkName: "Imported configuration",
    campusId: input.campusId,
    campusName: input.projectLabel,
    city: "Not recorded",
    state: "Not recorded",
    buildingId: input.buildingId,
    buildingName: input.projectName,
    buildingCode: toAssetTag(input.projectName),
    floorId: input.floorId,
    floorName: input.floor,
    level: input.level,
  };
}

function zoneRow(id: string, systemId: string, name: string): ZoneRow {
  return { id, systemId, name, code: toAssetTag(name), status: "operational" };
}

function deviceRow(input: {
  id: string;
  campusId: string;
  buildingId: string;
  floorId: string;
  systemId: string;
  zoneId: string | null;
  assetTag: string;
  device: z.infer<typeof deviceSchema>;
}): DeviceRow {
  return {
    id: input.id,
    campusId: input.campusId,
    buildingId: input.buildingId,
    floorId: input.floorId,
    systemId: input.systemId,
    zoneId: input.zoneId,
    assetTag: input.assetTag,
    equipmentTag: input.device.name,
    serialNumber: input.device.serial || null,
    typeId: `tube-tracker-type-${toSlug(input.device.type)}`,
    type: input.device.type,
    manufacturerId: "tube-tracker-import",
    manufacturer: "Imported configuration",
    operationalStatus: toOperationalStatus(input.device.status),
    lifecycleStatus: "active",
    criticality: input.device.type.toLowerCase().includes("blower") ? "high" : "medium",
    firmwareVersion: null,
    nextInspectionAt: null,
    warrantyExpiration: null,
    ipAddress: null,
    hostname: null,
  };
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toOperationalStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "online" || normalized === "operational"
    ? "operational"
    : normalized === "offline"
      ? "offline"
      : "degraded";
}

function toAssetTag(value: string) {
  return toSlug(value).toUpperCase().slice(0, 36) || "IMPORTED-DEVICE";
}

function toSlug(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "record"
  );
}
