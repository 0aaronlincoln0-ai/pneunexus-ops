export const capabilities = {
  dashboardRead: "dashboard:read",
  facilityRead: "facility:read",
  facilityWrite: "facility:write",
  deviceRead: "device:read",
  deviceWrite: "device:write",
  deviceSensitiveRead: "device:sensitive:read",
  workOrderRead: "work-order:read",
  workOrderWrite: "work-order:write",
  workOrderAssign: "work-order:assign",
  auditRead: "audit:read",
  userManage: "user:manage",
  securityManage: "security:manage",
  exportCreate: "export:create",
  platformManage: "platform:manage",
} as const;

export type Capability = (typeof capabilities)[keyof typeof capabilities];

export function hasCapability(granted: ReadonlySet<string>, capability: Capability): boolean {
  return granted.has(capability);
}

export function requireCapability(granted: ReadonlySet<string>, capability: Capability): void {
  if (!hasCapability(granted, capability)) throw new AuthorizationError();
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor() {
    super("Access denied");
  }
}
