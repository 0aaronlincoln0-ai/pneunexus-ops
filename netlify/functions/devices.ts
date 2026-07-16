import type { Config, Context } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../server/db/client";
import {
  buildings,
  campuses,
  devices,
  floors,
  manufacturers,
  organizationSettings,
  pneumaticSystems,
  zones,
} from "../../server/db/schema";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { createDeviceSchema, detectProhibitedContent } from "../../server/security/validation";
import { databaseAuditLogProvider } from "./_shared/audit";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { assertFacilityAccess, authenticateRequest } from "./_shared/session";

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    if (request.method !== "POST")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });
    const { principal } = await authenticateRequest(request, true);
    requireCapability(principal.permissions, capabilities.deviceWrite);
    const input = createDeviceSchema.parse(await request.json());
    assertFacilityAccess(principal, input.campusId);
    const db = getDatabase();
    const detectionWarnings = [
      input.assetTag,
      input.equipmentTag,
      input.serialNumber ?? "",
      input.firmwareVersion ?? "",
    ].flatMap(detectProhibitedContent);
    const [settings] = await db
      .select({ mode: organizationSettings.phiDetectionMode })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, principal.organizationId))
      .limit(1);
    if (detectionWarnings.length && settings?.mode === "block")
      throw new HttpError(
        422,
        "Content resembles prohibited information and was blocked. Remove it or contact an administrator.",
      );
    const [scope] = await db
      .select({ campusId: campuses.id })
      .from(campuses)
      .innerJoin(
        buildings,
        and(
          eq(buildings.id, input.buildingId),
          eq(buildings.campusId, campuses.id),
          eq(buildings.organizationId, principal.organizationId),
        ),
      )
      .innerJoin(
        floors,
        and(
          eq(floors.id, input.floorId),
          eq(floors.buildingId, buildings.id),
          eq(floors.organizationId, principal.organizationId),
        ),
      )
      .innerJoin(
        pneumaticSystems,
        and(
          eq(pneumaticSystems.id, input.systemId),
          eq(pneumaticSystems.campusId, campuses.id),
          eq(pneumaticSystems.organizationId, principal.organizationId),
        ),
      )
      .innerJoin(manufacturers, eq(manufacturers.id, input.manufacturerId))
      .where(
        and(eq(campuses.id, input.campusId), eq(campuses.organizationId, principal.organizationId)),
      )
      .limit(1);
    if (!scope) throw new HttpError(404, "Facility references are invalid");
    if (input.zoneId) {
      const [zone] = await db
        .select({ id: zones.id })
        .from(zones)
        .where(
          and(
            eq(zones.id, input.zoneId),
            eq(zones.systemId, input.systemId),
            eq(zones.organizationId, principal.organizationId),
          ),
        )
        .limit(1);
      if (!zone) throw new HttpError(404, "Zone is invalid");
    }
    const [device] = await db
      .insert(devices)
      .values({
        organizationId: principal.organizationId,
        campusId: input.campusId,
        buildingId: input.buildingId,
        floorId: input.floorId,
        systemId: input.systemId,
        zoneId: input.zoneId,
        deviceTypeId: input.deviceTypeId,
        manufacturerId: input.manufacturerId,
        assetTag: input.assetTag.toUpperCase(),
        equipmentTag: input.equipmentTag,
        operationalStatus: input.operationalStatus,
        criticality: input.criticality,
        serialNumber: input.serialNumber,
        firmwareVersion: input.firmwareVersion,
      })
      .returning({ id: devices.id, assetTag: devices.assetTag });
    if (!device) throw new Error("Device creation did not return a record");
    await databaseAuditLogProvider.append({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      action: "device.create",
      resourceType: "device",
      resourceId: device.id,
      outcome: "success",
      requestId: id,
      changeSummary: {
        assetTag: device.assetTag,
        prohibitedContentWarningCount: detectionWarnings.length,
      },
    });
    return json(
      {
        device,
        warnings: detectionWarnings.length
          ? [
              "Content may resemble prohibited information. Review the record; automated detection is limited.",
            ]
          : [],
      },
      { status: 201 },
    );
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505")
      return json(
        { error: "An asset with this tag already exists at the facility", requestId: id },
        { status: 409 },
      );
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/devices" };
