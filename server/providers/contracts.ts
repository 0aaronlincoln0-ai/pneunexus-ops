import type { Database } from "../db/client";

export interface AuthenticatedPrincipal {
  userId: string;
  organizationId: string;
  membershipId: string;
  roleKey: string;
  permissions: ReadonlySet<string>;
  facilityIds: ReadonlySet<string>;
  sensitiveInfrastructureAllowed: boolean;
}

export interface AuthenticationProvider {
  authenticate(request: Request): Promise<AuthenticatedPrincipal | null>;
  revokeSession(sessionId: string, reason: string): Promise<void>;
}

export interface DatabaseProvider {
  readonly db: Database;
}
export interface FileStorageProvider {
  createUploadIntent(input: {
    organizationId: string;
    filename: string;
    mimeType: string;
    size: number;
  }): Promise<{ key: string; uploadUrl: string }>;
}
export interface EmailProvider {
  send(message: { to: string; template: string; variables: Record<string, string> }): Promise<void>;
}
export interface AuditLogProvider {
  append(event: {
    organizationId: string;
    actorId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    outcome: string;
    requestId: string;
    changeSummary?: Record<string, unknown>;
  }): Promise<void>;
}
export interface MonitoringProvider {
  captureException(error: unknown, context: { requestId: string; operation: string }): void;
  count(metric: string, value?: number, tags?: Record<string, string>): void;
}
