import type { Config, Context } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../server/db/client";
import {
  memberships,
  organizations,
  organizationSettings,
  permissions,
  rolePermissions,
  roles,
  securityEvents,
  sessions,
  users,
} from "../../server/db/schema";
import { ensureReferenceData } from "../../server/security/reference-data";
import { canAccessWorkspace } from "../../server/billing/organization-access";
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
const registerSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  plan: z.enum(["individual", "team", "lifetime"]),
});

async function createSessionResponse(input: {
  organizationId: string;
  userId: string;
  displayName: string;
  email: string;
  roleId: string;
  roleKey: string;
  request: Request;
}) {
  const db = getDatabase();
  const [settings] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, input.organizationId))
    .limit(1);
  const [organization] = await db
    .select({ subscriptionStatus: organizations.subscriptionStatus })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1);
  const idleMinutes = settings?.idleTimeoutMinutes ?? 30;
  const absoluteHours = settings?.absoluteSessionHours ?? 12;
  const token = secureToken();
  const csrfToken = secureToken();
  const [created] = await db
    .insert(sessions)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      tokenHash: await sha256(token),
      csrfTokenHash: await sha256(csrfToken),
      idleExpiresAt: new Date(Date.now() + idleMinutes * 60_000),
      absoluteExpiresAt: new Date(Date.now() + absoluteHours * 3_600_000),
      userAgent: input.request.headers.get("user-agent"),
    })
    .returning({ id: sessions.id });
  const granted = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, input.roleId));
  return {
    response: json(
      {
        authenticated: true,
        csrfToken,
        user: {
          id: input.userId,
          displayName: input.displayName,
          email: input.email,
          role: input.roleKey,
          permissions: granted.map(({ key }) => key),
          workspaceAccess:
            input.roleKey === "platform_super_admin" ||
            canAccessWorkspace(organization?.subscriptionStatus ?? "pending_activation"),
          subscriptionStatus: organization?.subscriptionStatus ?? "pending_activation",
        },
      },
      { headers: { "Set-Cookie": sessionCookie(token, absoluteHours * 3600) } },
    ),
    sessionId: created?.id,
  };
}

function organizationSlug(name: string) {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "organization";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function isConfiguredPlatformAdministrator(email: string) {
  const configured =
    typeof Netlify === "undefined"
      ? process.env.RESOVII_PLATFORM_ADMIN_EMAILS
      : Netlify.env.get("RESOVII_PLATFORM_ADMIN_EMAILS");
  return new Set(
    (configured ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ).has(email);
}

async function login(request: Request, context: Context): Promise<Response> {
  const id = requestId(context);
  const { email, password } = loginSchema.parse(await request.json());
  const normalizedEmail = email.toLowerCase();
  const rateLimitKey = `login:${context.ip ?? "unknown"}`;
  enforceRateLimit(rateLimitKey);
  const db = getDatabase();
  const [account] = await db
    .select({ user: users, membership: memberships, roleKey: roles.key })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(users.email, normalizedEmail),
        eq(users.status, "active"),
        eq(memberships.status, "active"),
        eq(organizations.isDemo, false),
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
  const session = await createSessionResponse({
    organizationId: account.membership.organizationId,
    userId: account.user.id,
    displayName: account.user.displayName,
    email: account.user.email,
    roleId: account.membership.roleId,
    roleKey: account.roleKey,
    request,
  });
  await databaseAuditLogProvider.append({
    organizationId: account.membership.organizationId,
    actorId: account.user.id,
    action: "authentication.login",
    resourceType: "session",
    resourceId: session.sessionId,
    outcome: "success",
    requestId: id,
  });
  return session.response;
}

async function register(request: Request, context: Context): Promise<Response> {
  const id = requestId(context);
  const input = registerSchema.parse(await request.json());
  const normalizedEmail = input.email.toLowerCase();
  const rateLimitKey = `registration:${context.ip ?? "unknown"}`;
  enforceRateLimit(rateLimitKey, 4, 60 * 60_000);
  const db = getDatabase();
  await ensureReferenceData(db);
  const platformAdministrator = isConfiguredPlatformAdministrator(normalizedEmail);
  const account = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existing) throw new HttpError(409, "An account already uses this email. Sign in instead.");

    const roleKey = platformAdministrator ? "platform_super_admin" : "organization_admin";
    const [adminRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, roleKey))
      .limit(1);
    if (!adminRole)
      throw new HttpError(503, "Account setup is not ready. Please try again shortly.");

    const [organization] = await tx
      .insert(organizations)
      .values({
        name: input.organizationName,
        displayName: input.organizationName,
        legalName: input.organizationName,
        slug: organizationSlug(input.organizationName),
        subscriptionStatus: platformAdministrator ? "active" : "pending_activation",
        planCode: input.plan,
        billingType: "manual_agreement",
        ...(platformAdministrator ? { activatedAt: new Date() } : {}),
      })
      .returning({ id: organizations.id });
    if (!organization) throw new Error("Organization creation failed");

    await tx.insert(organizationSettings).values({
      organizationId: organization.id,
      subscriptionPlan: input.plan,
    });
    const [user] = await tx
      .insert(users)
      .values({
        email: normalizedEmail,
        displayName: input.displayName,
        passwordHash: await bcrypt.hash(input.password, 12),
        emailVerifiedAt: new Date(),
        status: "active",
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Account creation failed");
    const [membership] = await tx
      .insert(memberships)
      .values({
        organizationId: organization.id,
        userId: user.id,
        roleId: adminRole.id,
        status: "active",
      })
      .returning({ id: memberships.id });
    if (!membership) throw new Error("Membership creation failed");
    if (platformAdministrator)
      await tx
        .update(organizations)
        .set({ activatedByUserId: user.id, updatedAt: new Date() })
        .where(eq(organizations.id, organization.id));
    return {
      organizationId: organization.id,
      userId: user.id,
      roleId: adminRole.id,
      roleKey,
    };
  });
  clearRateLimit(rateLimitKey);
  await databaseAuditLogProvider.append({
    organizationId: account.organizationId,
    actorId: account.userId,
    action: "organization.register",
    resourceType: "organization",
    resourceId: account.organizationId,
    outcome: "success",
    requestId: id,
    changeSummary: { plan: input.plan, platformAdministrator },
  });
  const session = await createSessionResponse({
    organizationId: account.organizationId,
    userId: account.userId,
    displayName: input.displayName,
    email: normalizedEmail,
    roleId: account.roleId,
    roleKey: account.roleKey,
    request,
  });
  return session.response;
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
      workspaceAccess:
        current.principal.roleKey === "platform_super_admin" ||
        canAccessWorkspace(current.subscriptionStatus),
      subscriptionStatus: current.subscriptionStatus,
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
    if (action === "register" && request.method === "POST") return await register(request, context);
    if (action === "session" && request.method === "GET") return await session(request);
    if (action === "logout" && request.method === "POST") return await logout(request, context);
    return json({ error: "Not found", requestId: id }, { status: 404 });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/auth/:action" };
