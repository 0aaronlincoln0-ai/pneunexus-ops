import type { Config, Context } from "@netlify/functions";
import { and, eq, inArray } from "drizzle-orm";
import { importCode, normalizeTubeTrackerConfig } from "../../server/imports/tube-tracker";
import { getDatabase } from "../../server/db/client";
import {
  buildings,
  campuses,
  deviceTypes,
  devices,
  floors,
  hospitalNetworks,
  manufacturers,
  pneumaticSystems,
  zones,
} from "../../server/db/schema";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { detectProhibitedContent } from "../../server/security/validation";
import { databaseAuditLogProvider } from "./_shared/audit";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { authenticateRequest } from "./_shared/session";

const importerName = "Imported configuration";
const importNetworkName = "Imported configuration";

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    if (request.method !== "POST")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });
    const { principal } = await authenticateRequest(request, true);
    requireCapability(principal.permissions, capabilities.deviceWrite);
    if (!principal.facilityIds.has("*"))
      throw new HttpError(
        403,
        "Organization administrator access is required to import a configuration.",
      );

    const imported = normalizeTubeTrackerConfig(await request.json());
    const prohibited = [
      imported.projectName,
      imported.campusName,
      ...imported.devices.flatMap((device) => [
        device.assetTag,
        device.equipmentTag,
        device.serial ?? "",
      ]),
    ].flatMap(detectProhibitedContent);
    if (prohibited.length)
      throw new HttpError(
        422,
        "Remove patient or clinical identifiers before importing this configuration.",
      );

    const db = getDatabase();
    const result = await db.transaction(async (tx) => {
      const org = principal.organizationId;
      let [network] = await tx
        .select()
        .from(hospitalNetworks)
        .where(
          and(
            eq(hospitalNetworks.organizationId, org),
            eq(hospitalNetworks.name, importNetworkName),
          ),
        )
        .limit(1);
      if (!network) {
        [network] = await tx
          .insert(hospitalNetworks)
          .values({ organizationId: org, name: importNetworkName })
          .returning();
      }
      if (!network) throw new Error("Import network could not be created");

      let [campus] = await tx
        .select()
        .from(campuses)
        .where(and(eq(campuses.organizationId, org), eq(campuses.name, imported.campusName)))
        .limit(1);
      if (!campus) {
        [campus] = await tx
          .insert(campuses)
          .values({
            organizationId: org,
            networkId: network.id,
            name: imported.campusName,
            city: "Not recorded",
            state: "Not recorded",
          })
          .returning();
      }
      if (!campus) throw new Error("Import campus could not be created");

      const buildingCode = importCode(imported.projectName);
      let [building] = await tx
        .select()
        .from(buildings)
        .where(and(eq(buildings.campusId, campus.id), eq(buildings.code, buildingCode)))
        .limit(1);
      if (!building) {
        [building] = await tx
          .insert(buildings)
          .values({
            organizationId: org,
            campusId: campus.id,
            name: imported.projectName,
            code: buildingCode,
          })
          .returning();
      }
      if (!building) throw new Error("Import building could not be created");

      let [system] = await tx
        .select()
        .from(pneumaticSystems)
        .where(
          and(eq(pneumaticSystems.organizationId, org), eq(pneumaticSystems.code, buildingCode)),
        )
        .limit(1);
      if (!system) {
        [system] = await tx
          .insert(pneumaticSystems)
          .values({
            organizationId: org,
            campusId: campus.id,
            name: imported.systemName,
            code: buildingCode,
            documentationCompleteness: 100,
          })
          .returning();
      }
      if (!system) throw new Error("Import system could not be created");

      const existingFloors = await tx
        .select()
        .from(floors)
        .where(eq(floors.buildingId, building.id));
      const floorByName = new Map(existingFloors.map((floor) => [floor.name, floor]));
      for (const [index, name] of imported.floors.entries()) {
        if (floorByName.has(name)) continue;
        const [floor] = await tx
          .insert(floors)
          .values({ organizationId: org, buildingId: building.id, name, level: index })
          .returning();
        if (!floor) throw new Error("Import floor could not be created");
        floorByName.set(name, floor);
      }

      const existingZones = await tx.select().from(zones).where(eq(zones.systemId, system.id));
      const zoneByName = new Map(existingZones.map((zone) => [zone.name, zone]));
      for (const name of imported.zones) {
        if (zoneByName.has(name)) continue;
        const [zone] = await tx
          .insert(zones)
          .values({ organizationId: org, systemId: system.id, name, code: importCode(name) })
          .returning();
        if (!zone) throw new Error("Import zone could not be created");
        zoneByName.set(name, zone);
      }

      let [manufacturer] = await tx
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.name, importerName))
        .limit(1);
      if (!manufacturer) {
        [manufacturer] = await tx.insert(manufacturers).values({ name: importerName }).returning();
      }
      if (!manufacturer) throw new Error("Import manufacturer could not be created");

      const typeNames = [...new Set(imported.devices.map((device) => device.type))];
      const existingTypes = typeNames.length
        ? await tx.select().from(deviceTypes).where(inArray(deviceTypes.name, typeNames))
        : [];
      const typeByName = new Map(existingTypes.map((type) => [type.name, type]));
      for (const name of typeNames) {
        if (typeByName.has(name)) continue;
        const [type] = await tx
          .insert(deviceTypes)
          .values({ name, category: "pneumatic" })
          .returning();
        if (!type) throw new Error("Import device type could not be created");
        typeByName.set(name, type);
      }

      const sourceAssetTags = imported.devices.map((device) => device.assetTag);
      const existingDevices = sourceAssetTags.length
        ? await tx
            .select({ assetTag: devices.assetTag })
            .from(devices)
            .where(
              and(
                eq(devices.organizationId, org),
                eq(devices.campusId, campus.id),
                inArray(devices.assetTag, sourceAssetTags),
              ),
            )
        : [];
      const existingAssetTags = new Set(existingDevices.map((device) => device.assetTag));
      const newDevices = imported.devices.filter(
        (device) => !existingAssetTags.has(device.assetTag),
      );
      for (const device of newDevices) {
        const floor = floorByName.get(device.floor) ?? floorByName.get(imported.floors[0]!);
        const type = typeByName.get(device.type);
        if (!floor || !type) throw new Error("Imported device dependencies could not be resolved");
        await tx.insert(devices).values({
          organizationId: org,
          campusId: campus.id,
          buildingId: building.id,
          floorId: floor.id,
          systemId: system.id,
          zoneId: device.zone ? (zoneByName.get(device.zone)?.id ?? null) : null,
          deviceTypeId: type.id,
          manufacturerId: manufacturer.id,
          assetTag: device.assetTag,
          equipmentTag: device.equipmentTag,
          serialNumber: device.serial,
          operationalStatus: device.operationalStatus,
          criticality: device.criticality,
          nextInspectionAt: null,
          customData: { importSource: "tube-tracker", importVersion: imported.version },
        });
      }

      return {
        campusId: campus.id,
        systemId: system.id,
        createdDevices: newDevices.length,
        unchangedDevices: existingAssetTags.size,
      };
    });

    await databaseAuditLogProvider.append({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      action: "device.import.tube_tracker",
      resourceType: "pneumatic-system",
      resourceId: result.systemId,
      outcome: "success",
      requestId: id,
      changeSummary: {
        ...result,
        version: imported.version,
        warningCount: imported.warnings.length,
      },
    });
    return json({ ...result, warnings: imported.warnings }, { status: 201 });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/imports/tube-tracker" };
