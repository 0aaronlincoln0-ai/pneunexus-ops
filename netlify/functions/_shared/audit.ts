import { getDatabase } from "../../../server/db/client";
import { auditEvents } from "../../../server/db/schema";
import type { AuditLogProvider } from "../../../server/providers/contracts";

export const databaseAuditLogProvider: AuditLogProvider = {
  async append(event) {
    await getDatabase()
      .insert(auditEvents)
      .values({
        organizationId: event.organizationId,
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        outcome: event.outcome,
        requestId: event.requestId,
        changeSummary: event.changeSummary ?? {},
      });
  },
};
