import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "../../../server/db/client";
import {
  facilityAssignments,
  memberships,
  organizations,
  permissions,
  rolePermissions,
  roles,
  sessions,
  users,
} from "../../../server/db/schema";
import type { AuthenticatedPrincipal } from "../../../server/providers/contracts";
import { HttpError } from "./http";

export const SESSION_COOKIE = "pnx_session";

export function secureToken(bytes = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return undefined;
}

export interface SessionContext {
  sessionId: string;
  csrfTokenHash: string;
  principal: AuthenticatedPrincipal;
  displayName: string;
  email: string;
}

export async function authenticateRequest(
  request: Request,
  requireCsrf = false,
): Promise<SessionContext> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) throw new HttpError(401, "Authentication required");
  const tokenHash = await sha256(token);
  const now = new Date();
  const db = getDatabase();
  const [row] = await db
    .select({
      sessionId: sessions.id,
      csrfTokenHash: sessions.csrfTokenHash,
      organizationId: sessions.organizationId,
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      membershipId: memberships.id,
      roleKey: roles.key,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(
      memberships,
      and(
        eq(memberships.userId, users.id),
        eq(memberships.organizationId, sessions.organizationId),
      ),
    )
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .innerJoin(organizations, eq(sessions.organizationId, organizations.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.idleExpiresAt, now),
        gt(sessions.absoluteExpiresAt, now),
        eq(users.status, "active"),
        eq(memberships.status, "active"),
        eq(organizations.isDemo, false),
      ),
    )
    .limit(1);
  if (!row) throw new HttpError(401, "Authentication required");

  if (requireCsrf) {
    const supplied = request.headers.get("x-csrf-token");
    if (!supplied || (await sha256(supplied)) !== row.csrfTokenHash)
      throw new HttpError(403, "Request verification failed");
  }

  const granted = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .where(eq(roles.key, row.roleKey));
  const assignments = await db
    .select({
      campusId: facilityAssignments.campusId,
      sensitive: facilityAssignments.sensitiveInfrastructureAllowed,
    })
    .from(facilityAssignments)
    .where(
      and(
        eq(facilityAssignments.organizationId, row.organizationId),
        eq(facilityAssignments.membershipId, row.membershipId),
      ),
    );
  const unrestricted =
    row.roleKey === "platform_super_admin" ||
    row.roleKey === "organization_admin" ||
    row.roleKey === "network_admin";
  return {
    sessionId: row.sessionId,
    csrfTokenHash: row.csrfTokenHash,
    displayName: row.displayName,
    email: row.email,
    principal: {
      userId: row.userId,
      organizationId: row.organizationId,
      membershipId: row.membershipId,
      roleKey: row.roleKey,
      permissions: new Set(granted.map(({ key }) => key)),
      facilityIds: unrestricted
        ? new Set(["*"])
        : new Set(assignments.map(({ campusId }) => campusId)),
      sensitiveInfrastructureAllowed:
        unrestricted || assignments.some(({ sensitive }) => sensitive),
    },
  };
}

export function assertFacilityAccess(principal: AuthenticatedPrincipal, campusId: string): void {
  if (!principal.facilityIds.has("*") && !principal.facilityIds.has(campusId))
    throw new HttpError(404, "Resource not found");
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
