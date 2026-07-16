import type { BootstrapData, DeviceRow, SessionUser } from "../types";

export const localAdminUser: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Local Administrator",
  email: "admin",
  role: "organization_admin",
  permissions: [
    "dashboard:read",
    "facility:read",
    "facility:write",
    "device:read",
    "device:write",
    "work_order:read",
    "work_order:write",
    "incident:read",
    "incident:write",
    "audit:read",
  ],
};

const north = "10000000-0000-4000-8000-000000000001";
const south = "10000000-0000-4000-8000-000000000002";
const main = "20000000-0000-4000-8000-000000000001";
const ambulatory = "20000000-0000-4000-8000-000000000002";
const northFloor = "21000000-0000-4000-8000-000000000001";
const southFloor = "21000000-0000-4000-8000-000000000002";
const northSystem = "30000000-0000-4000-8000-000000000001";
const southSystem = "30000000-0000-4000-8000-000000000002";
const northZone = "31000000-0000-4000-8000-000000000001";
const southZone = "31000000-0000-4000-8000-000000000002";

function device(
  index: number,
  assetTag: string,
  equipmentTag: string,
  type: string,
  manufacturer: string,
  status: string,
  criticality: string,
): DeviceRow {
  const isNorth = index < 4;
  return {
    id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    campusId: isNorth ? north : south,
    buildingId: isNorth ? main : ambulatory,
    floorId: isNorth ? northFloor : southFloor,
    systemId: isNorth ? northSystem : southSystem,
    zoneId: isNorth ? northZone : southZone,
    assetTag,
    equipmentTag,
    serialNumber: index === 5 ? null : `GLR26${String(index + 1).padStart(4, "0")}`,
    typeId: `50000000-0000-4000-8000-00000000000${type === "Station" ? 1 : type === "Blower" ? 2 : 3}`,
    type,
    manufacturerId: `60000000-0000-4000-8000-00000000000${(index % 4) + 1}`,
    manufacturer,
    operationalStatus: status,
    lifecycleStatus: "active",
    criticality,
    firmwareVersion: index === 5 ? null : `v4.${index + 1}.2`,
    nextInspectionAt: index === 4 ? "2026-07-01T13:00:00.000Z" : "2026-10-15T13:00:00.000Z",
    warrantyExpiration: index < 2 ? "2026-08-30T00:00:00.000Z" : "2028-06-30T00:00:00.000Z",
    ipAddress: null,
    hostname: null,
  };
}

export const localDemoData: BootstrapData = {
  demo: true,
  generatedAt: new Date().toISOString(),
  metrics: {
    facilities: 2,
    systems: 2,
    devices: 6,
    openWorkOrders: 3,
    overdueMaintenance: 1,
    incompleteSystems: 1,
    missingDeviceData: 1,
    healthScore: 83,
    mttrMinutes: 42,
    expiringWarranties: 2,
  },
  facilities: [
    {
      networkId: "00000000-0000-4000-8000-000000000010",
      networkName: "Great Lakes Regional Health",
      campusId: north,
      campusName: "North Medical Campus",
      city: "Cleveland",
      state: "OH",
      buildingId: main,
      buildingName: "Main Hospital",
      buildingCode: "MH",
      floorId: northFloor,
      floorName: "Clinical Services",
      level: 1,
    },
    {
      networkId: "00000000-0000-4000-8000-000000000010",
      networkName: "Great Lakes Regional Health",
      campusId: south,
      campusName: "South Ambulatory Campus",
      city: "Akron",
      state: "OH",
      buildingId: ambulatory,
      buildingName: "Ambulatory Center",
      buildingCode: "AC",
      floorId: southFloor,
      floorName: "Outpatient Services",
      level: 1,
    },
  ],
  systems: [
    {
      id: northSystem,
      campusId: north,
      name: "North Campus Core",
      code: "NC-PTS-01",
      status: "operational",
      documentationCompleteness: 96,
    },
    {
      id: southSystem,
      campusId: south,
      name: "South Campus Loop",
      code: "SC-PTS-01",
      status: "degraded",
      documentationCompleteness: 78,
    },
  ],
  zones: [
    {
      id: northZone,
      systemId: northSystem,
      name: "Central Processing",
      code: "CP",
      status: "operational",
    },
    {
      id: southZone,
      systemId: southSystem,
      name: "Outpatient Services",
      code: "OS",
      status: "degraded",
    },
  ],
  devices: [
    device(
      0,
      "GLR-MH-STA-001",
      "Core station 01",
      "Station",
      "Swisslog",
      "operational",
      "critical",
    ),
    device(1, "GLR-MH-STA-014", "Lab station 14", "Station", "TransLogic", "operational", "high"),
    device(2, "GLR-MH-BLO-002", "Core blower 02", "Blower", "Spencer", "operational", "critical"),
    device(3, "GLR-MH-DIV-006", "Main diverter 06", "Diverter", "Aerocom", "operational", "high"),
    device(
      4,
      "GLR-AC-STA-003",
      "Outpatient station 03",
      "Station",
      "TransLogic",
      "degraded",
      "medium",
    ),
    device(5, "GLR-AC-BLO-001", "South blower 01", "Blower", "Spencer", "operational", "critical"),
  ],
  workOrders: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      number: "WO-2026-1042",
      campusId: north,
      status: "in_progress",
      priority: "high",
      description: "Inspect intermittent carrier arrival at station 14",
      dueAt: "2026-07-17T16:00:00.000Z",
      createdAt: "2026-07-14T13:30:00.000Z",
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      number: "WO-2026-1038",
      campusId: south,
      status: "assigned",
      priority: "medium",
      description: "Complete quarterly blower inspection",
      dueAt: "2026-07-19T16:00:00.000Z",
      createdAt: "2026-07-13T10:15:00.000Z",
    },
    {
      id: "70000000-0000-4000-8000-000000000003",
      number: "WO-2026-1031",
      campusId: north,
      status: "waiting_for_parts",
      priority: "medium",
      description: "Replace worn diverter position sensor",
      dueAt: "2026-07-22T16:00:00.000Z",
      createdAt: "2026-07-11T09:45:00.000Z",
    },
  ],
  incidents: [
    {
      id: "80000000-0000-4000-8000-000000000001",
      number: "INC-2026-029",
      campusId: south,
      severity: "medium",
      title: "Elevated transit time on south loop",
      status: "monitoring",
      detectedAt: "2026-07-15T11:20:00.000Z",
      acknowledgedAt: "2026-07-15T11:27:00.000Z",
      restoredAt: null,
    },
    {
      id: "80000000-0000-4000-8000-000000000002",
      number: "INC-2026-027",
      campusId: north,
      severity: "low",
      title: "Brief station communications interruption",
      status: "resolved",
      detectedAt: "2026-07-13T08:05:00.000Z",
      acknowledgedAt: "2026-07-13T08:11:00.000Z",
      restoredAt: "2026-07-13T08:47:00.000Z",
    },
  ],
};
