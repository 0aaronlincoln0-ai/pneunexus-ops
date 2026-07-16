import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import {
  auditEvents,
  buildings,
  campuses,
  deviceTypes,
  devices,
  facilityAssignments,
  floors,
  hospitalNetworks,
  incidents,
  inspections,
  lines,
  maintenanceSchedules,
  maintenanceTemplates,
  maintenanceTemplateVersions,
  manufacturers,
  memberships,
  organizationSettings,
  organizations,
  permissions,
  pneumaticSystems,
  rolePermissions,
  roles,
  rooms,
  users,
  workOrders,
  zones,
} from "../server/db/schema";
import { capabilities } from "../server/security/capabilities";

const url = process.env.DATABASE_URL ?? "postgres://pneunexus:pneunexus@localhost:5432/pneunexus";
const client = postgres(url, { max: 1 });
const db = drizzle(client);

const roleDefinitions = [
  [
    "platform_super_admin",
    "Platform Super Administrator",
    "Platform configuration and approved support workflows",
  ],
  [
    "organization_admin",
    "Organization Administrator",
    "Organization, users, security, and facilities",
  ],
  ["network_admin", "Hospital Network Administrator", "Hospital network administration"],
  ["facility_admin", "Facility Administrator", "Assigned facility administration"],
  ["maintenance_supervisor", "Maintenance Supervisor", "Maintenance assignment and approval"],
  ["technician", "Technician", "Assigned maintenance execution"],
  ["auditor", "Auditor", "Read-only records and audit access"],
  ["read_only", "Read-Only User", "Explicitly assigned facility view"],
] as const;

const allCapabilities = Object.values(capabilities);
const permissionMap: Record<string, string[]> = {
  platform_super_admin: allCapabilities,
  organization_admin: allCapabilities.filter((value) => value !== capabilities.platformManage),
  network_admin: [
    capabilities.dashboardRead,
    capabilities.facilityRead,
    capabilities.facilityWrite,
    capabilities.deviceRead,
    capabilities.deviceWrite,
    capabilities.deviceSensitiveRead,
    capabilities.workOrderRead,
    capabilities.workOrderWrite,
    capabilities.workOrderAssign,
    capabilities.auditRead,
    capabilities.userManage,
    capabilities.exportCreate,
  ],
  facility_admin: [
    capabilities.dashboardRead,
    capabilities.facilityRead,
    capabilities.facilityWrite,
    capabilities.deviceRead,
    capabilities.deviceWrite,
    capabilities.deviceSensitiveRead,
    capabilities.workOrderRead,
    capabilities.workOrderWrite,
    capabilities.workOrderAssign,
    capabilities.exportCreate,
  ],
  maintenance_supervisor: [
    capabilities.dashboardRead,
    capabilities.facilityRead,
    capabilities.deviceRead,
    capabilities.deviceWrite,
    capabilities.workOrderRead,
    capabilities.workOrderWrite,
    capabilities.workOrderAssign,
    capabilities.exportCreate,
  ],
  technician: [
    capabilities.dashboardRead,
    capabilities.facilityRead,
    capabilities.deviceRead,
    capabilities.deviceWrite,
    capabilities.workOrderRead,
    capabilities.workOrderWrite,
  ],
  auditor: [
    capabilities.dashboardRead,
    capabilities.facilityRead,
    capabilities.deviceRead,
    capabilities.workOrderRead,
    capabilities.auditRead,
    capabilities.exportCreate,
  ],
  read_only: [
    capabilities.dashboardRead,
    capabilities.facilityRead,
    capabilities.deviceRead,
    capabilities.workOrderRead,
  ],
};

async function seed() {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "great-lakes-regional-health"))
    .limit(1);
  if (existing) {
    console.log("Fictional demonstration organization already exists; seed skipped.");
    return;
  }

  for (const [key, name, description] of roleDefinitions)
    await db.insert(roles).values({ key, name, description }).onConflictDoNothing();
  for (const key of allCapabilities)
    await db
      .insert(permissions)
      .values({ key, description: `Allows ${key.replaceAll(":", " ")}` })
      .onConflictDoNothing();
  const roleRows = await db.select().from(roles);
  const permissionRows = await db.select().from(permissions);
  for (const role of roleRows) {
    for (const key of permissionMap[role.key] ?? []) {
      const permission = permissionRows.find((item) => item.key === key);
      if (permission)
        await db
          .insert(rolePermissions)
          .values({ roleId: role.id, permissionId: permission.id })
          .onConflictDoNothing();
    }
  }

  const [organization] = await db
    .insert(organizations)
    .values({
      name: "Great Lakes Regional Health",
      slug: "great-lakes-regional-health",
      isDemo: true,
    })
    .returning();
  if (!organization) throw new Error("Organization seed failed");
  await db.insert(organizationSettings).values({
    organizationId: organization.id,
    timezone: "America/Detroit",
    idleTimeoutMinutes: 30,
    absoluteSessionHours: 12,
    phiDetectionMode: "warn",
  });
  const [network] = await db
    .insert(hospitalNetworks)
    .values({ organizationId: organization.id, name: "Great Lakes Regional Health Network" })
    .returning();
  if (!network) throw new Error("Network seed failed");
  const campusRows = await db
    .insert(campuses)
    .values([
      {
        organizationId: organization.id,
        networkId: network.id,
        name: "Harbor Medical Campus",
        city: "Port Mason",
        state: "MI",
        timezone: "America/Detroit",
      },
      {
        organizationId: organization.id,
        networkId: network.id,
        name: "North Shore Specialty Campus",
        city: "Lakebridge",
        state: "MI",
        timezone: "America/Detroit",
      },
    ])
    .returning();
  const harbor = campusRows[0];
  const north = campusRows[1];
  if (!harbor || !north) throw new Error("Campus seed failed");
  const buildingRows = await db
    .insert(buildings)
    .values([
      {
        organizationId: organization.id,
        campusId: harbor.id,
        name: "Harbor Main Pavilion",
        code: "HMP",
        address: "100 Fictional Harbor Way",
      },
      {
        organizationId: organization.id,
        campusId: harbor.id,
        name: "Harbor Diagnostic Center",
        code: "HDC",
        address: "120 Fictional Harbor Way",
      },
      {
        organizationId: organization.id,
        campusId: north.id,
        name: "North Shore Clinical Tower",
        code: "NSC",
        address: "500 Fictional Lakeside Drive",
      },
    ])
    .returning();
  const [main, diagnostic, tower] = buildingRows;
  if (!main || !diagnostic || !tower) throw new Error("Building seed failed");
  const floorRows = await db
    .insert(floors)
    .values([
      { organizationId: organization.id, buildingId: main.id, name: "Lower Level", level: -1 },
      { organizationId: organization.id, buildingId: main.id, name: "Level 1", level: 1 },
      { organizationId: organization.id, buildingId: main.id, name: "Level 2", level: 2 },
      { organizationId: organization.id, buildingId: diagnostic.id, name: "Level 1", level: 1 },
      { organizationId: organization.id, buildingId: diagnostic.id, name: "Level 2", level: 2 },
      { organizationId: organization.id, buildingId: tower.id, name: "Level 1", level: 1 },
      { organizationId: organization.id, buildingId: tower.id, name: "Level 3", level: 3 },
      { organizationId: organization.id, buildingId: tower.id, name: "Level 5", level: 5 },
    ])
    .returning();
  await db.insert(rooms).values(
    floorRows.map((floor, index) => ({
      organizationId: organization.id,
      floorId: floor.id,
      name: index % 3 === 0 ? "Equipment Room" : "Station Alcove",
      roomNumber: `E-${index + 101}`,
      type: index % 3 === 0 ? "equipment_closet" : "room",
    })),
  );

  const systemRows = await db
    .insert(pneumaticSystems)
    .values([
      {
        organizationId: organization.id,
        campusId: harbor.id,
        name: "Harbor Core Transport",
        code: "HCT-01",
        status: "operational",
        documentationCompleteness: 92,
      },
      {
        organizationId: organization.id,
        campusId: north.id,
        name: "North Shore Transport",
        code: "NST-01",
        status: "degraded",
        documentationCompleteness: 78,
      },
    ])
    .returning();
  const [harborSystem, northSystem] = systemRows;
  if (!harborSystem || !northSystem) throw new Error("System seed failed");
  const zoneRows = await db
    .insert(zones)
    .values([
      {
        organizationId: organization.id,
        systemId: harborSystem.id,
        name: "Harbor Clinical",
        code: "HC",
        status: "operational",
      },
      {
        organizationId: organization.id,
        systemId: harborSystem.id,
        name: "Harbor Diagnostic",
        code: "HD",
        status: "operational",
      },
      {
        organizationId: organization.id,
        systemId: northSystem.id,
        name: "North Patient Tower",
        code: "NP",
        status: "degraded",
      },
      {
        organizationId: organization.id,
        systemId: northSystem.id,
        name: "North Support",
        code: "NS",
        status: "operational",
      },
    ])
    .returning();
  await db.insert(lines).values(
    zoneRows.flatMap((zone, index) =>
      [1, 2].map((number) => ({
        organizationId: organization.id,
        zoneId: zone.id,
        name: `${zone.code} Route ${number}`,
        identifier: `${zone.code}-L${number}`,
        status: index === 2 && number === 2 ? "degraded" : "operational",
      })),
    ),
  );

  const typeNames = [
    "Send/receive station",
    "Diverter",
    "Transfer unit",
    "Zone control unit",
    "Blower",
    "Control panel",
    "Gateway",
  ];
  const typeRows = await db
    .insert(deviceTypes)
    .values(
      typeNames.map((name) => ({
        name,
        category: name.includes("station") ? "station" : "infrastructure",
      })),
    )
    .returning();
  const makerRows = await db
    .insert(manufacturers)
    .values([
      { name: "Swisslog" },
      { name: "Pevco" },
      { name: "Northstar Integration Works" },
      { name: "Legacy / Unknown" },
    ])
    .returning();
  const statuses = [
    "operational",
    "operational",
    "operational",
    "operational",
    "degraded",
    "offline",
  ];
  const deviceRows = [];
  for (let index = 0; index < 32; index++) {
    const useHarbor = index < 20;
    const campus = useHarbor ? harbor : north;
    const system = useHarbor ? harborSystem : northSystem;
    const eligibleFloors = floorRows.filter((floor) =>
      useHarbor
        ? floor.buildingId === main.id || floor.buildingId === diagnostic.id
        : floor.buildingId === tower.id,
    );
    const floor = eligibleFloors[index % eligibleFloors.length];
    if (!floor) continue;
    const building = buildingRows.find((item) => item.id === floor.buildingId);
    const type = typeRows[index % typeRows.length];
    const maker = makerRows[index % makerRows.length];
    const zone = zoneRows.filter((item) => item.systemId === system.id)[index % 2];
    if (!building || !type || !maker || !zone) continue;
    const [device] = await db
      .insert(devices)
      .values({
        organizationId: organization.id,
        campusId: campus.id,
        buildingId: building.id,
        floorId: floor.id,
        systemId: system.id,
        zoneId: zone.id,
        deviceTypeId: type.id,
        manufacturerId: maker.id,
        assetTag: `GLR-${useHarbor ? "HB" : "NS"}-${String(index + 1).padStart(3, "0")}`,
        equipmentTag: `${type.name} ${String(index + 1).padStart(2, "0")}`,
        serialNumber:
          index % 7 === 0 ? null : `DEMO-${2020 + (index % 5)}-${String(10400 + index)}`,
        installationDate: `${2018 + (index % 6)}-${String((index % 9) + 1).padStart(2, "0")}-15`,
        commissioningDate: `${2018 + (index % 6)}-${String((index % 9) + 1).padStart(2, "0")}-28`,
        warrantyExpiration:
          index % 4 === 0
            ? new Date(Date.now() + (45 + index) * 86_400_000).toISOString().slice(0, 10)
            : "2028-12-31",
        operationalStatus: statuses[index % statuses.length] ?? "operational",
        criticality: index % 8 === 0 ? "critical" : index % 3 === 0 ? "high" : "medium",
        hostname: `pnx-demo-${useHarbor ? "hb" : "ns"}-${String(index + 1).padStart(2, "0")}`,
        ipAddress: `10.42.${useHarbor ? 10 : 20}.${index + 20}`,
        macAddress: `02:42:AC:11:${String(index).padStart(2, "0")}:01`,
        vlan: useHarbor ? 210 : 220,
        firmwareVersion: index % 6 === 0 ? null : `v${2 + (index % 3)}.${index % 10}.${index % 4}`,
        maintenanceIntervalDays: 180,
        lastInspectionAt: new Date(Date.now() - (40 + index * 4) * 86_400_000),
        nextInspectionAt: new Date(Date.now() + (index % 5 === 0 ? -15 : 60 + index) * 86_400_000),
      })
      .returning();
    if (device) deviceRows.push(device);
  }

  const passwordHash = await bcrypt.hash("DemoAccess!2026", 12);
  const seededUsers = [];
  for (const [roleKey, roleName] of roleDefinitions) {
    const [user] = await db
      .insert(users)
      .values({
        email: `${roleKey.replaceAll("_", ".")}@greatlakes.demo`,
        displayName: roleName,
        passwordHash,
        emailVerifiedAt: new Date(),
        status: "active",
      })
      .returning();
    const role = roleRows.find((item) => item.key === roleKey);
    if (!user || !role) continue;
    const [membership] = await db
      .insert(memberships)
      .values({
        organizationId: organization.id,
        userId: user.id,
        roleId: role.id,
        status: "active",
      })
      .returning();
    if (membership) {
      seededUsers.push({ user, membership, roleKey });
      if (!["platform_super_admin", "organization_admin", "network_admin"].includes(roleKey)) {
        await db.insert(facilityAssignments).values({
          organizationId: organization.id,
          membershipId: membership.id,
          campusId: roleKey === "read_only" ? north.id : harbor.id,
          exportAllowed: roleKey === "auditor",
          sensitiveInfrastructureAllowed: roleKey === "facility_admin",
        });
      }
    }
  }
  const supervisor = seededUsers.find((item) => item.roleKey === "maintenance_supervisor")?.user;
  const technician = seededUsers.find((item) => item.roleKey === "technician")?.user;
  const admin = seededUsers.find((item) => item.roleKey === "organization_admin")?.user;
  const orderStatuses = [
    "new",
    "triaged",
    "assigned",
    "in_progress",
    "waiting_for_parts",
    "blocked",
    "completed",
    "verified",
  ];
  for (let index = 0; index < 10; index++) {
    const device = deviceRows[index * 2];
    if (!device) continue;
    await db.insert(workOrders).values({
      organizationId: organization.id,
      campusId: device.campusId,
      systemId: device.systemId,
      deviceId: device.id,
      number: `WO-2026-${String(index + 1).padStart(4, "0")}`,
      priority: index % 4 === 0 ? "high" : "medium",
      status: orderStatuses[index % orderStatuses.length] ?? "new",
      requesterId: admin?.id,
      assignedTechnicianId: technician?.id,
      supervisorId: supervisor?.id,
      problemDescription:
        [
          "Intermittent carrier arrival sensor alert",
          "Scheduled belt and seal inspection",
          "Station door alignment requires adjustment",
          "Route verification after facilities work",
        ][index % 4] ?? "Infrastructure inspection",
      dueAt: new Date(Date.now() + (index - 3) * 86_400_000),
    });
  }
  const templateRows = await db
    .insert(maintenanceTemplates)
    .values([
      {
        organizationId: organization.id,
        name: "Semiannual station inspection",
        deviceTypeId: typeRows[0]?.id,
      },
      {
        organizationId: organization.id,
        name: "Quarterly blower inspection",
        deviceTypeId: typeRows[4]?.id,
      },
    ])
    .returning();
  for (const template of templateRows)
    await db.insert(maintenanceTemplateVersions).values({
      organizationId: organization.id,
      templateId: template.id,
      version: 1,
      procedure: {
        fictionalDemo: true,
        checklist: [
          { label: "Verify guards and access panels", required: true },
          { label: "Record operational condition", required: true },
        ],
        signOffRequired: true,
      },
    });
  for (let index = 0; index < 6; index++) {
    const device = deviceRows[index];
    const template = templateRows[index % templateRows.length];
    if (device && template)
      await db.insert(maintenanceSchedules).values({
        organizationId: organization.id,
        templateId: template.id,
        deviceId: device.id,
        scheduleType: "calendar_interval",
        scheduleConfig: { days: index % 2 ? 90 : 180 },
        nextDueAt: device.nextInspectionAt,
      });
  }
  for (let index = 0; index < 8; index++) {
    const device = deviceRows[index];
    if (device)
      await db.insert(inspections).values({
        organizationId: organization.id,
        deviceId: device.id,
        inspectorId: technician?.id,
        outcome: index % 5 === 0 ? "attention_required" : "pass",
        inspectedAt: new Date(Date.now() - (200 - index * 10) * 86_400_000),
        nextDueAt: new Date(Date.now() + (index % 3 === 0 ? -30 : 90) * 86_400_000),
        notes: "Fictional demonstration infrastructure inspection; no PHI.",
      });
  }
  await db.insert(incidents).values([
    {
      organizationId: organization.id,
      campusId: harbor.id,
      systemId: harborSystem.id,
      deviceId: deviceRows[4]?.id,
      number: "INC-2026-001",
      severity: "medium",
      title: "Diagnostic zone intermittent routing",
      status: "restored",
      detectedAt: new Date(Date.now() - 14 * 86_400_000),
      acknowledgedAt: new Date(Date.now() - 14 * 86_400_000 + 12 * 60_000),
      restoredAt: new Date(Date.now() - 14 * 86_400_000 + 94 * 60_000),
      operationalImpact:
        "Selected infrastructure route unavailable; facility contingency procedure used.",
    },
    {
      organizationId: organization.id,
      campusId: north.id,
      systemId: northSystem.id,
      deviceId: deviceRows[25]?.id,
      number: "INC-2026-002",
      severity: "high",
      title: "North zone blower unavailable",
      status: "monitoring",
      detectedAt: new Date(Date.now() - 3 * 86_400_000),
      acknowledgedAt: new Date(Date.now() - 3 * 86_400_000 + 8 * 60_000),
      restoredAt: new Date(Date.now() - 3 * 86_400_000 + 180 * 60_000),
      operationalImpact: "North infrastructure zone paused pending facilities response.",
    },
    {
      organizationId: organization.id,
      campusId: harbor.id,
      systemId: harborSystem.id,
      number: "INC-2026-003",
      severity: "low",
      title: "Control-panel communication warning",
      status: "open",
      detectedAt: new Date(Date.now() - 6 * 3_600_000),
      acknowledgedAt: new Date(Date.now() - 5.5 * 3_600_000),
      operationalImpact: "Documentation-only alert; no control action initiated.",
    },
  ]);
  for (let index = 0; index < 12; index++)
    await db.insert(auditEvents).values({
      organizationId: organization.id,
      actorId: admin?.id,
      action:
        ["seed.organization", "device.create", "work_order.create", "security.policy.review"][
          index % 4
        ] ?? "seed.event",
      resourceType: index % 2 ? "device" : "organization",
      resourceId: index % 2 ? deviceRows[index]?.id : organization.id,
      outcome: "success",
      requestId: `seed-${String(index + 1).padStart(3, "0")}`,
      changeSummary: { fictionalDemoData: true, sequence: index + 1 },
      occurredAt: new Date(Date.now() - index * 86_400_000),
    });
  console.log(
    `Seeded fictional Great Lakes Regional Health demo: ${campusRows.length} campuses, ${buildingRows.length} buildings, ${systemRows.length} systems, ${zoneRows.length} zones, ${deviceRows.length} devices, ${seededUsers.length} role users.`,
  );
  console.log("Demo login: organization.admin@greatlakes.demo / DemoAccess!2026");
}

try {
  await seed();
} finally {
  await client.end();
}
