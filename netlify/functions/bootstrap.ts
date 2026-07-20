import type { Config, Context } from "@netlify/functions";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "../../server/db/client";
import {
  buildings,
  campuses,
  deviceTypes,
  devices,
  floors,
  hospitalNetworks,
  incidents,
  manufacturers,
  pneumaticSystems,
  workOrders,
  zones,
} from "../../server/db/schema";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { errorResponse, json, requestId } from "./_shared/http";
import { authenticateRequest } from "./_shared/session";

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    if (request.method !== "GET")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });
    const { principal } = await authenticateRequest(request, false, true);
    requireCapability(principal.permissions, capabilities.dashboardRead);
    const db = getDatabase();
    const org = principal.organizationId;
    const allowedCampusIds = principal.facilityIds.has("*")
      ? undefined
      : [...principal.facilityIds];
    const facilityFilter = allowedCampusIds ? inArray(campuses.id, allowedCampusIds) : undefined;
    const deviceFacilityFilter = allowedCampusIds
      ? inArray(devices.campusId, allowedCampusIds)
      : undefined;
    const [facilityRows, systemRows, deviceRows, workOrderRows, incidentRows] = await Promise.all([
      db
        .select({
          networkId: hospitalNetworks.id,
          networkName: hospitalNetworks.name,
          campusId: campuses.id,
          campusName: campuses.name,
          city: campuses.city,
          state: campuses.state,
          buildingId: buildings.id,
          buildingName: buildings.name,
          buildingCode: buildings.code,
          floorId: floors.id,
          floorName: floors.name,
          level: floors.level,
        })
        .from(hospitalNetworks)
        .innerJoin(campuses, eq(campuses.networkId, hospitalNetworks.id))
        .innerJoin(buildings, eq(buildings.campusId, campuses.id))
        .innerJoin(floors, eq(floors.buildingId, buildings.id))
        .where(and(eq(hospitalNetworks.organizationId, org), facilityFilter))
        .orderBy(asc(campuses.name), asc(buildings.name), asc(floors.level)),
      db
        .select({
          id: pneumaticSystems.id,
          campusId: pneumaticSystems.campusId,
          name: pneumaticSystems.name,
          code: pneumaticSystems.code,
          status: pneumaticSystems.status,
          documentationCompleteness: pneumaticSystems.documentationCompleteness,
        })
        .from(pneumaticSystems)
        .where(
          and(
            eq(pneumaticSystems.organizationId, org),
            allowedCampusIds ? inArray(pneumaticSystems.campusId, allowedCampusIds) : undefined,
            isNull(pneumaticSystems.archivedAt),
          ),
        ),
      db
        .select({
          id: devices.id,
          campusId: devices.campusId,
          buildingId: devices.buildingId,
          floorId: devices.floorId,
          systemId: devices.systemId,
          zoneId: devices.zoneId,
          assetTag: devices.assetTag,
          equipmentTag: devices.equipmentTag,
          serialNumber: devices.serialNumber,
          typeId: deviceTypes.id,
          type: deviceTypes.name,
          manufacturerId: manufacturers.id,
          manufacturer: manufacturers.name,
          operationalStatus: devices.operationalStatus,
          lifecycleStatus: devices.lifecycleStatus,
          criticality: devices.criticality,
          firmwareVersion: devices.firmwareVersion,
          nextInspectionAt: devices.nextInspectionAt,
          warrantyExpiration: devices.warrantyExpiration,
          ipAddress: principal.sensitiveInfrastructureAllowed
            ? devices.ipAddress
            : sql<string | null>`null`,
          hostname: principal.sensitiveInfrastructureAllowed
            ? devices.hostname
            : sql<string | null>`null`,
        })
        .from(devices)
        .innerJoin(deviceTypes, eq(devices.deviceTypeId, deviceTypes.id))
        .innerJoin(manufacturers, eq(devices.manufacturerId, manufacturers.id))
        .where(
          and(eq(devices.organizationId, org), deviceFacilityFilter, isNull(devices.archivedAt)),
        )
        .orderBy(asc(devices.assetTag)),
      db
        .select({
          id: workOrders.id,
          number: workOrders.number,
          campusId: workOrders.campusId,
          status: workOrders.status,
          priority: workOrders.priority,
          description: workOrders.problemDescription,
          dueAt: workOrders.dueAt,
          createdAt: workOrders.createdAt,
        })
        .from(workOrders)
        .where(
          and(
            eq(workOrders.organizationId, org),
            allowedCampusIds ? inArray(workOrders.campusId, allowedCampusIds) : undefined,
            isNull(workOrders.archivedAt),
          ),
        )
        .orderBy(sql`${workOrders.createdAt} desc`)
        .limit(12),
      db
        .select({
          id: incidents.id,
          number: incidents.number,
          campusId: incidents.campusId,
          severity: incidents.severity,
          title: incidents.title,
          status: incidents.status,
          detectedAt: incidents.detectedAt,
          acknowledgedAt: incidents.acknowledgedAt,
          restoredAt: incidents.restoredAt,
        })
        .from(incidents)
        .where(
          and(
            eq(incidents.organizationId, org),
            allowedCampusIds ? inArray(incidents.campusId, allowedCampusIds) : undefined,
            isNull(incidents.archivedAt),
          ),
        )
        .orderBy(sql`${incidents.detectedAt} desc`)
        .limit(8),
    ]);
    const zoneRows = await db
      .select({
        id: zones.id,
        systemId: zones.systemId,
        name: zones.name,
        code: zones.code,
        status: zones.status,
      })
      .from(zones)
      .where(eq(zones.organizationId, org));
    const now = new Date();
    const activeWorkOrderStatuses = new Set([
      "new",
      "triaged",
      "assigned",
      "in_progress",
      "waiting_for_parts",
      "waiting_for_vendor",
      "blocked",
    ]);
    const repaired = incidentRows.filter((incident) => incident.restoredAt);
    const mttrMinutes = repaired.length
      ? Math.round(
          repaired.reduce(
            (sum, incident) =>
              sum +
              ((incident.restoredAt?.getTime() ?? 0) - incident.detectedAt.getTime()) / 60_000,
            0,
          ) / repaired.length,
        )
      : 0;
    const metrics = {
      facilities: new Set(facilityRows.map((row) => row.campusId)).size,
      systems: systemRows.length,
      devices: deviceRows.length,
      openWorkOrders: workOrderRows.filter((workOrder) =>
        activeWorkOrderStatuses.has(workOrder.status),
      ).length,
      overdueMaintenance: deviceRows.filter(
        (device) => device.nextInspectionAt && device.nextInspectionAt < now,
      ).length,
      incompleteSystems: systemRows.filter((system) => system.documentationCompleteness < 90)
        .length,
      missingDeviceData: deviceRows.filter(
        (device) => !device.serialNumber || !device.firmwareVersion,
      ).length,
      healthScore: deviceRows.length
        ? Math.round(
            (deviceRows.filter((device) => device.operationalStatus === "operational").length /
              deviceRows.length) *
              100,
          )
        : 0,
      mttrMinutes,
      expiringWarranties: deviceRows.filter(
        (device) =>
          device.warrantyExpiration &&
          new Date(device.warrantyExpiration) < new Date(Date.now() + 90 * 86_400_000) &&
          new Date(device.warrantyExpiration) >= now,
      ).length,
    };
    return json({
      demo: false,
      generatedAt: now.toISOString(),
      metrics,
      facilities: facilityRows,
      systems: systemRows,
      zones: zoneRows,
      devices: deviceRows,
      workOrders: workOrderRows,
      incidents: incidentRows,
    });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/bootstrap" };
