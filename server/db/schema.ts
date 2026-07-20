import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const organizationId = () => uuid("organization_id").notNull();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  displayName: text("display_name"),
  slug: text("slug").notNull().unique(),
  isDemo: boolean("is_demo").notNull().default(false),
  subscriptionStatus: text("subscription_status").notNull().default("pending_activation"),
  planCode: text("plan_code").notNull().default("individual"),
  billingType: text("billing_type").notNull().default("manual_agreement"),
  billingEmail: text("billing_email"),
  billingContactName: text("billing_contact_name"),
  purchaseOrderNumber: text("purchase_order_number"),
  contractNumber: text("contract_number"),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  renewalDate: date("renewal_date"),
  paymentTerms: text("payment_terms"),
  invoiceStatus: text("invoice_status").notNull().default("not_issued"),
  invoiceNumber: text("invoice_number"),
  amountContracted: numeric("amount_contracted", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  facilityLimit: integer("facility_limit"),
  userLimit: integer("user_limit"),
  monthlyAiRequestLimit: integer("monthly_ai_request_limit"),
  gracePeriodEndsAt: timestamp("grace_period_ends_at", { withTimezone: true }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  activatedByUserId: uuid("activated_by_user_id").references(() => users.id),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  restrictedAt: timestamp("restricted_at", { withTimezone: true }),
  internalBillingNotes: text("internal_billing_notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const hospitalNetworks = pgTable(
  "hospital_networks",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("network_org_name_uq").on(t.organizationId, t.name)],
);

export const campuses = pgTable(
  "campuses",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    networkId: uuid("network_id")
      .notNull()
      .references(() => hospitalNetworks.id),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    timezone: text("timezone").notNull().default("America/New_York"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("campus_org_idx").on(t.organizationId),
    uniqueIndex("campus_org_name_uq").on(t.organizationId, t.name),
  ],
);

export const buildings = pgTable(
  "buildings",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("building_org_idx").on(t.organizationId),
    uniqueIndex("building_campus_code_uq").on(t.campusId, t.code),
  ],
);

export const floors = pgTable(
  "floors",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id),
    name: text("name").notNull(),
    level: integer("level").notNull(),
    floorPlanMetadata: jsonb("floor_plan_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("floor_org_idx").on(t.organizationId),
    uniqueIndex("floor_building_level_uq").on(t.buildingId, t.level),
  ],
);

export const rooms = pgTable(
  "rooms",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    floorId: uuid("floor_id")
      .notNull()
      .references(() => floors.id),
    name: text("name").notNull(),
    roomNumber: text("room_number"),
    type: text("type").notNull().default("room"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("room_org_idx").on(t.organizationId)],
);

export const pneumaticSystems = pgTable(
  "pneumatic_systems",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("operational"),
    documentationCompleteness: integer("documentation_completeness").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("system_org_idx").on(t.organizationId),
    uniqueIndex("system_org_code_uq").on(t.organizationId, t.code),
  ],
);

export const zones = pgTable(
  "zones",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    systemId: uuid("system_id")
      .notNull()
      .references(() => pneumaticSystems.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("operational"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("zone_org_idx").on(t.organizationId),
    uniqueIndex("zone_system_code_uq").on(t.systemId, t.code),
  ],
);

export const lines = pgTable(
  "lines",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zones.id),
    name: text("name").notNull(),
    identifier: text("identifier").notNull(),
    status: text("status").notNull().default("operational"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("line_org_idx").on(t.organizationId),
    uniqueIndex("line_zone_identifier_uq").on(t.zoneId, t.identifier),
  ],
);

export const deviceTypes = pgTable("device_types", {
  id: id(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  createdAt: createdAt(),
});

export const manufacturers = pgTable("manufacturers", {
  id: id(),
  name: text("name").notNull().unique(),
  website: text("website"),
  createdAt: createdAt(),
});

export const models = pgTable(
  "models",
  {
    id: id(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id),
    deviceTypeId: uuid("device_type_id")
      .notNull()
      .references(() => deviceTypes.id),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("model_manufacturer_name_uq").on(t.manufacturerId, t.name)],
);

export const devices = pgTable(
  "devices",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id),
    floorId: uuid("floor_id")
      .notNull()
      .references(() => floors.id),
    roomId: uuid("room_id").references(() => rooms.id),
    systemId: uuid("system_id")
      .notNull()
      .references(() => pneumaticSystems.id),
    zoneId: uuid("zone_id").references(() => zones.id),
    deviceTypeId: uuid("device_type_id")
      .notNull()
      .references(() => deviceTypes.id),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id),
    modelId: uuid("model_id").references(() => models.id),
    assetTag: text("asset_tag").notNull(),
    equipmentTag: text("equipment_tag").notNull(),
    serialNumber: text("serial_number"),
    installationDate: date("installation_date"),
    commissioningDate: date("commissioning_date"),
    warrantyExpiration: date("warranty_expiration"),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    operationalStatus: text("operational_status").notNull().default("operational"),
    criticality: text("criticality").notNull().default("medium"),
    hostname: text("hostname"),
    ipAddress: inet("ip_address"),
    macAddress: text("mac_address"),
    vlan: integer("vlan"),
    firmwareVersion: text("firmware_version"),
    softwareVersion: text("software_version"),
    electricalInformation: jsonb("electrical_information")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    maintenanceIntervalDays: integer("maintenance_interval_days"),
    lastInspectionAt: timestamp("last_inspection_at", { withTimezone: true }),
    nextInspectionAt: timestamp("next_inspection_at", { withTimezone: true }),
    customData: jsonb("custom_data").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("device_org_idx").on(t.organizationId),
    index("device_status_idx").on(t.organizationId, t.operationalStatus),
    uniqueIndex("device_facility_asset_tag_uq").on(t.organizationId, t.campusId, t.assetTag),
  ],
);

export const ports = pgTable(
  "ports",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id),
    name: text("name").notNull(),
    direction: text("direction").notNull().default("bidirectional"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("port_device_name_uq").on(t.deviceId, t.name),
    index("port_org_idx").on(t.organizationId),
  ],
);

export const connections = pgTable(
  "connections",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    systemId: uuid("system_id")
      .notNull()
      .references(() => pneumaticSystems.id),
    sourcePortId: uuid("source_port_id")
      .notNull()
      .references(() => ports.id),
    destinationPortId: uuid("destination_port_id")
      .notNull()
      .references(() => ports.id),
    lineIdentifier: text("line_identifier").notNull(),
    nominalDiameterInches: numeric("nominal_diameter_inches", { precision: 5, scale: 2 }),
    direction: text("direction").notNull().default("bidirectional"),
    status: text("status").notNull().default("operational"),
    installationDate: date("installation_date"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("connection_source_port_uq").on(t.sourcePortId),
    uniqueIndex("connection_destination_port_uq").on(t.destinationPortId),
    index("connection_org_idx").on(t.organizationId),
  ],
);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  status: text("status").notNull().default("invited"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const roles = pgTable("roles", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: createdAt(),
});

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(),
  description: text("description").notNull(),
  createdAt: createdAt(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("membership_org_user_uq").on(t.organizationId, t.userId),
    index("membership_org_idx").on(t.organizationId),
  ],
);

export const facilityAssignments = pgTable(
  "facility_assignments",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id),
    exportAllowed: boolean("export_allowed").notNull().default(false),
    sensitiveInfrastructureAllowed: boolean("sensitive_infrastructure_allowed")
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("facility_assignment_uq").on(t.membershipId, t.campusId),
    index("facility_assignment_org_idx").on(t.organizationId),
  ],
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id),
    systemId: uuid("system_id").references(() => pneumaticSystems.id),
    deviceId: uuid("device_id").references(() => devices.id),
    number: text("number").notNull(),
    priority: text("priority").notNull(),
    status: text("status").notNull(),
    requesterId: uuid("requester_id").references(() => users.id),
    assignedTechnicianId: uuid("assigned_technician_id").references(() => users.id),
    supervisorId: uuid("supervisor_id").references(() => users.id),
    problemDescription: text("problem_description").notNull(),
    diagnosticFindings: text("diagnostic_findings"),
    correctiveAction: text("corrective_action"),
    requiredParts: text("required_parts"),
    laborMinutes: integer("labor_minutes"),
    downtimeMinutes: integer("downtime_minutes"),
    safetyPrecautions: text("safety_precautions"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("work_order_org_number_uq").on(t.organizationId, t.number),
    index("work_order_org_status_idx").on(t.organizationId, t.status),
  ],
);

export const workOrderEvents = pgTable("work_order_events", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  workOrderId: uuid("work_order_id")
    .notNull()
    .references(() => workOrders.id),
  actorId: uuid("actor_id").references(() => users.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  summary: text("summary").notNull(),
  createdAt: createdAt(),
});

export const maintenanceTemplates = pgTable("maintenance_templates", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  name: text("name").notNull(),
  deviceTypeId: uuid("device_type_id").references(() => deviceTypes.id),
  activeVersion: integer("active_version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
export const maintenanceTemplateVersions = pgTable("maintenance_template_versions", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  templateId: uuid("template_id")
    .notNull()
    .references(() => maintenanceTemplates.id),
  version: integer("version").notNull(),
  procedure: jsonb("procedure").notNull(),
  createdAt: createdAt(),
});
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  templateId: uuid("template_id")
    .notNull()
    .references(() => maintenanceTemplates.id),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => devices.id),
  scheduleType: text("schedule_type").notNull(),
  scheduleConfig: jsonb("schedule_config").notNull(),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const maintenanceInstances = pgTable("maintenance_instances", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  scheduleId: uuid("schedule_id").references(() => maintenanceSchedules.id),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => devices.id),
  status: text("status").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  responses: jsonb("responses").notNull().default({}),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const inspections = pgTable("inspections", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => devices.id),
  inspectorId: uuid("inspector_id").references(() => users.id),
  outcome: text("outcome").notNull(),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull(),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const incidents = pgTable("incidents", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  campusId: uuid("campus_id")
    .notNull()
    .references(() => campuses.id),
  systemId: uuid("system_id").references(() => pneumaticSystems.id),
  deviceId: uuid("device_id").references(() => devices.id),
  number: text("number").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  restoredAt: timestamp("restored_at", { withTimezone: true }),
  operationalImpact: text("operational_impact").notNull(),
  probableCause: text("probable_cause"),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  preventiveAction: text("preventive_action"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
export const incidentEvents = pgTable("incident_events", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  incidentId: uuid("incident_id")
    .notNull()
    .references(() => incidents.id),
  actorId: uuid("actor_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const documents = pgTable("documents", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  manufacturerId: uuid("manufacturer_id").references(() => manufacturers.id),
  modelId: uuid("model_id").references(() => models.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  approvalStatus: text("approval_status").notNull().default("draft"),
  effectiveDate: date("effective_date"),
  reviewDate: date("review_date"),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const documentVersions = pgTable("document_versions", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id),
  version: text("version").notNull(),
  storageKey: text("storage_key").notNull(),
  checksum: text("checksum").notNull(),
  superseded: boolean("superseded").notNull().default(false),
  createdAt: createdAt(),
});
export const attachments = pgTable("attachments", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  originalName: text("original_name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksum: text("checksum").notNull(),
  scanStatus: text("scan_status").notNull().default("pending"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: createdAt(),
});
export const qrIdentifiers = pgTable("qr_identifiers", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => devices.id),
  opaqueTokenHash: text("opaque_token_hash").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export const exports = pgTable("exports", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  reportType: text("report_type").notNull(),
  status: text("status").notNull(),
  fieldSet: jsonb("field_set").notNull(),
  storageKey: text("storage_key"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
});
export const notifications = pgTable("notifications", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  csrfTokenHash: text("csrf_token_hash").notNull(),
  roleVersion: integer("role_version").notNull().default(1),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true }).notNull(),
  absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  ipAddress: inet("ip_address"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revocationReason: text("revocation_reason"),
  createdAt: createdAt(),
});
export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id").references(() => users.id),
    facilityId: uuid("facility_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    outcome: text("outcome").notNull(),
    requestId: text("request_id").notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    changeSummary: jsonb("change_summary").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_org_time_idx").on(t.organizationId, t.occurredAt)],
);
export const securityEvents = pgTable("security_events", {
  id: id(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  actorId: uuid("actor_id").references(() => users.id),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  outcome: text("outcome").notNull(),
  requestId: text("request_id").notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
});
export const organizationSettings = pgTable("organization_settings", {
  id: id(),
  organizationId: organizationId()
    .references(() => organizations.id)
    .unique(),
  timezone: text("timezone").notNull().default("America/New_York"),
  idleTimeoutMinutes: integer("idle_timeout_minutes").notNull().default(30),
  absoluteSessionHours: integer("absolute_session_hours").notNull().default(12),
  phiDetectionMode: text("phi_detection_mode").notNull().default("warn"),
  subscriptionPlan: text("subscription_plan").notNull().default("individual"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contracts = pgTable(
  "contracts",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    contractNumber: text("contract_number").notNull(),
    contractType: text("contract_type").notNull(),
    planCode: text("plan_code").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    renewalDate: date("renewal_date"),
    annualValue: numeric("annual_value", { precision: 12, scale: 2 }),
    implementationFee: numeric("implementation_fee", { precision: 12, scale: 2 }),
    facilityLimit: integer("facility_limit"),
    userLimit: integer("user_limit"),
    aiLimit: integer("ai_limit"),
    paymentTerms: text("payment_terms"),
    status: text("status").notNull().default("draft"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    documentReference: text("document_reference"),
    internalNotes: text("internal_notes"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("contract_number_uq").on(t.contractNumber),
    index("contract_org_idx").on(t.organizationId),
    index("contract_org_status_idx").on(t.organizationId, t.status),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id),
    invoiceNumber: text("invoice_number").notNull(),
    purchaseOrderNumber: text("purchase_order_number"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("not_issued"),
    paymentTerms: text("payment_terms"),
    billingEmail: text("billing_email"),
    description: text("description"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("invoice_number_uq").on(t.invoiceNumber),
    index("invoice_org_idx").on(t.organizationId),
    index("invoice_org_status_idx").on(t.organizationId, t.status),
  ],
);
export const retentionPolicies = pgTable("retention_policies", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  resourceType: text("resource_type").notNull(),
  retentionDays: integer("retention_days").notNull(),
  disposition: text("disposition").notNull().default("archive"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  resourceType: text("resource_type").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  dataType: text("data_type").notNull(),
  validation: jsonb("validation").notNull().default({}),
  sensitive: boolean("sensitive").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const customFieldValues = pgTable("custom_field_values", {
  id: id(),
  organizationId: organizationId().references(() => organizations.id),
  definitionId: uuid("definition_id")
    .notNull()
    .references(() => customFieldDefinitions.id),
  resourceId: uuid("resource_id").notNull(),
  value: jsonb("value").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
