import type { BootstrapData, SessionUser } from "../types";

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

// A new local workspace deliberately has no facility or device records. Data only appears after
// its administrator imports a hospital configuration.
export const emptyWorkspaceData: BootstrapData = {
  demo: false,
  generatedAt: new Date().toISOString(),
  metrics: {
    facilities: 0,
    systems: 0,
    devices: 0,
    openWorkOrders: 0,
    overdueMaintenance: 0,
    incompleteSystems: 0,
    missingDeviceData: 0,
    healthScore: 0,
    mttrMinutes: 0,
    expiringWarranties: 0,
  },
  facilities: [],
  systems: [],
  zones: [],
  devices: [],
  workOrders: [],
  incidents: [],
};
