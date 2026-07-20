export interface SessionUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
  workspaceAccess?: boolean;
  subscriptionStatus?: string;
}
export interface FacilityRow {
  networkId: string;
  networkName: string;
  campusId: string;
  campusName: string;
  city: string;
  state: string;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  floorId: string;
  floorName: string;
  level: number;
}
export interface SystemRow {
  id: string;
  campusId: string;
  name: string;
  code: string;
  status: string;
  documentationCompleteness: number;
}
export interface ZoneRow {
  id: string;
  systemId: string;
  name: string;
  code: string;
  status: string;
}
export interface DeviceRow {
  id: string;
  campusId: string;
  buildingId: string;
  floorId: string;
  systemId: string;
  zoneId: string | null;
  assetTag: string;
  equipmentTag: string;
  serialNumber: string | null;
  typeId: string;
  type: string;
  manufacturerId: string;
  manufacturer: string;
  operationalStatus: string;
  lifecycleStatus: string;
  criticality: string;
  firmwareVersion: string | null;
  nextInspectionAt: string | null;
  warrantyExpiration: string | null;
  ipAddress: string | null;
  hostname: string | null;
}
export interface WorkOrderRow {
  id: string;
  number: string;
  campusId: string;
  status: string;
  priority: string;
  description: string;
  dueAt: string | null;
  createdAt: string;
}
export interface IncidentRow {
  id: string;
  number: string;
  campusId: string;
  severity: string;
  title: string;
  status: string;
  detectedAt: string;
  acknowledgedAt: string | null;
  restoredAt: string | null;
}
export interface BootstrapData {
  demo: boolean;
  generatedAt: string;
  metrics: {
    facilities: number;
    systems: number;
    devices: number;
    openWorkOrders: number;
    overdueMaintenance: number;
    incompleteSystems: number;
    missingDeviceData: number;
    healthScore: number;
    mttrMinutes: number;
    expiringWarranties: number;
  };
  facilities: FacilityRow[];
  systems: SystemRow[];
  zones: ZoneRow[];
  devices: DeviceRow[];
  workOrders: WorkOrderRow[];
  incidents: IncidentRow[];
}
