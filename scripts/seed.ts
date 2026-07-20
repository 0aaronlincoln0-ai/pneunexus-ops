import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { permissions, rolePermissions, roles } from "../server/db/schema";
import { capabilities } from "../server/security/capabilities";

const url =
  process.env.NETLIFY_DB_URL ??
  process.env.DATABASE_URL ??
  "postgres://pneunexus:pneunexus@localhost:5432/pneunexus";
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

async function seedReferenceData() {
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

  console.log(
    "Seeded only Resovii reference roles and capabilities. No organization, account, facility, or device data was created.",
  );
}

try {
  await seedReferenceData();
} finally {
  await client.end();
}
