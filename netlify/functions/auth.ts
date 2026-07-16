import type { Config, Context } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../server/db/client";
import {
  memberships,
  organizationSettings,
  roles,
  securityEvents,
  sessions,
  users,
} from "../../server/db/schema";
import { databaseAuditLogProvider } from "./_shared/audit";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { clearRateLimit, enforceRateLimit } from "./_shared/rate-limit";
import {
  authenticateRequest,
  clearSessionCookie,
  secureToken,
  sessionCookie,
  sha256,
} from "./_shared/session";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(5).max(128),
});

async function login(request: Request, context: Context): Promise<Response> {
  const id = requestId(context);
  const { email, password } = loginSchema.parse(await request.json());
  const normalizedEmail =
    email.toLowerCase() === "admin" ? "organization.admin@greatlakes.demo" : email.toLowerCase();
  const rateLimitKey = `login:${context.ip ?? "unknown"}`;
  enforceRateLimit(rateLimitKey);
  const db = getDatabase();
  const [account] = await db
    .select({ user: users, membership: memberships, roleKey: roles.key })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(
      and(
        eq(users.email, normalizedEmail),
        eq(users.status, "active"),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);
  const valid = account
    ? await bcrypt.compare(password, account.user.passwordHash)
    : await bcrypt.compare(
        password,
        "$2b$12$0C6k7iTktNFjR3oH0lTzEuXk/6SC5u3eIVVg4wIYPxdUUNJdvnE6m",
      );
  if (!account || !valid || (account.user.lockedUntil && account.user.lockedUntil > new Date())) {
    if (account) {
      const failures = account.user.failedLoginCount + 1;
      await db
        .update(users)
        .set({
          failedLoginCount: failures,
          lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
        })
        .where(eq(users.id, account.user.id));
    }
    await db.insert(securityEvents).values({
      organizationId: account?.membership.organizationId,
      actorId: account?.user.id,
      type: "authentication.login",
      severity: "medium",
      outcome: "failure",
      requestId: id,
      userAgent: request.headers.get("user-agent"),
      details: { reason: "invalid_credentials" },
    });
    throw new HttpError(401, "Email or password is incorrect");
  }
  clearRateLimit(rateLimitKey);
  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, account.user.id));
  const [settings] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, account.membership.organizationId))
    .limit(1);
  const idleMinutes = settings?.idleTimeoutMinutes ?? 30;
  const absoluteHours = settings?.absoluteSessionHours ?? 12;
  const token = secureToken();
  const csrfToken = secureToken();
  const [created] = await db
    .insert(sessions)
    .values({
      organizationId: account.membership.organizationId,
      userId: account.user.id,
      tokenHash: await sha256(token),
      csrfTokenHash: await sha256(csrfToken),
      idleExpiresAt: new Date(Date.now() + idleMinutes * 60_000),
      absoluteExpiresAt: new Date(Date.now() + absoluteHours * 3_600_000),
      userAgent: request.headers.get("user-agent"),
    })
    .returning({ id: sessions.id });
  await databaseAuditLogProvider.append({
    organizationId: account.membership.organizationId,
    actorId: account.user.id,
    action: "authentication.login",
    resourceType: "session",
    resourceId: created?.id,
    outcome: "success",
    requestId: id,
  });
  return json(
    { authenticated: true, csrfToken },
    { headers: { "Set-Cookie": sessionCookie(token, absoluteHours * 3600) } },
  );
}

async function session(request: Request): Promise<Response> {
  const current = await authenticateRequest(request);
  const csrfToken = secureToken();
  await getDatabase()
    .update(sessions)
    .set({
      csrfTokenHash: await sha256(csrfToken),
      lastSeenAt: new Date(),
      idleExpiresAt: new Date(Date.now() + 30 * 60_000),
    })
    .where(eq(sessions.id, current.sessionId));
  return json({
    user: {
      id: current.principal.userId,
      displayName: current.displayName,
      email: current.email,
      role: current.principal.roleKey,
      permissions: [...current.principal.permissions],
    },
    csrfToken,
  });
}

async function logout(request: Request, context: Context): Promise<Response> {
  const current = await authenticateRequest(request, true);
  await getDatabase()
    .update(sessions)
    .set({ revokedAt: new Date(), revocationReason: "logout" })
    .where(and(eq(sessions.id, current.sessionId), isNull(sessions.revokedAt)));
  await databaseAuditLogProvider.append({
    organizationId: current.principal.organizationId,
    actorId: current.principal.userId,
    action: "authentication.logout",
    resourceType: "session",
    resourceId: current.sessionId,
    outcome: "success",
    requestId: requestId(context),
  });
  return json({ authenticated: false }, { headers: { "Set-Cookie": clearSessionCookie() } });
}

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    const action = context.params.action;
    if (action === "login" && request.method === "POST") return await login(request, context);
    if (action === "session" && request.method === "GET") return await session(request);
    if (action === "logout" && request.method === "POST") return await logout(request, context);
    return json({ error: "Not found", requestId: id }, { status: 404 });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/auth/:action" };
