import type { Config, Context } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../server/db/client";
import { auditEvents, contracts, invoices, organizationSettings, organizations } from "../../server/db/schema";
import {
  activateOrganization,
  billingTypes,
  contractStatuses,
  createInvoiceNumber,
  extendGracePeriod,
  invoiceStatuses,
  recordInvoicePayment,
  renewOrganizationContract,
  requireInternalBillingAdministrator,
  restrictOrganization,
  restoreOrganization,
  suspendOrganization,
} from "../../server/billing/organization-access";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { authenticateRequest } from "./_shared/session";

const organizationIdSchema = z.string().uuid();
const createOrganizationSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().min(2).max(120),
  planCode: z.string().trim().min(1).max(64),
  billingType: z.enum(billingTypes),
  billingEmail: z.string().trim().email().max(254).optional(),
  billingContactName: z.string().trim().max(120).optional(),
  paymentTerms: z.string().trim().max(80).optional(),
  facilityLimit: z.number().int().positive().optional(),
  userLimit: z.number().int().positive().optional(),
  monthlyAiRequestLimit: z.number().int().positive().optional(),
  internalBillingNotes: z.string().max(10_000).optional(),
});
const contractSchema = z.object({
  organizationId: organizationIdSchema,
  contractNumber: z.string().trim().min(2).max(100),
  contractType: z.string().trim().min(2).max(64),
  planCode: z.string().trim().min(1).max(64),
  startDate: z.string().date(),
  endDate: z.string().date(),
  renewalDate: z.string().date().optional(),
  annualValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  implementationFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  facilityLimit: z.number().int().positive().optional(),
  userLimit: z.number().int().positive().optional(),
  aiLimit: z.number().int().positive().optional(),
  paymentTerms: z.string().trim().max(80).optional(),
  status: z.enum(contractStatuses).default("draft"),
  documentReference: z.string().url().max(2_000).optional(),
  internalNotes: z.string().max(10_000).optional(),
});
const invoiceSchema = z.object({
  organizationId: organizationIdSchema,
  purchaseOrderNumber: z.string().trim().max(100).optional(),
  issueDate: z.string().date(),
  dueDate: z.string().date().optional(),
  amountDue: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().trim().length(3).default("USD"),
  status: z.enum(invoiceStatuses).default("issued"),
  paymentTerms: z.string().trim().max(80).optional(),
  billingEmail: z.string().trim().email().max(254).optional(),
  description: z.string().trim().max(2_000).optional(),
});

function organizationSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "organization"}-${crypto.randomUUID().slice(0, 8)}`;
}

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    const current = await authenticateRequest(request, request.method !== "GET");
    requireInternalBillingAdministrator(current.principal.roleKey);
    const action = context.params.action;
    const db = getDatabase();

    if (action === "organizations" && request.method === "GET") {
      const rows = await db
        .select({
          id: organizations.id,
          legalName: organizations.legalName,
          displayName: organizations.displayName,
          subscriptionStatus: organizations.subscriptionStatus,
          planCode: organizations.planCode,
          billingType: organizations.billingType,
          purchaseOrderNumber: organizations.purchaseOrderNumber,
          contractEndDate: organizations.contractEndDate,
          invoiceStatus: organizations.invoiceStatus,
          updatedAt: organizations.updatedAt,
        })
        .from(organizations)
        .orderBy(desc(organizations.updatedAt));
      return json({ organizations: rows });
    }

    if (action === "organization" && request.method === "POST") {
      const input = createOrganizationSchema.parse(await request.json());
      const [organization] = await db
        .insert(organizations)
        .values({ ...input, name: input.displayName, slug: organizationSlug(input.displayName) })
        .returning();
      if (!organization) throw new Error("Organization creation failed");
      await db.insert(organizationSettings).values({ organizationId: organization.id, subscriptionPlan: input.planCode });
      await db.insert(auditEvents).values({
        organizationId: organization.id,
        actorId: current.principal.userId,
        action: "billing.organization.create",
        resourceType: "organization",
        resourceId: organization.id,
        outcome: "success",
        requestId: id,
        changeSummary: { status: organization.subscriptionStatus, planCode: input.planCode },
      });
      return json({ organization }, { status: 201 });
    }

    if (action === "contract" && request.method === "POST") {
      const input = contractSchema.parse(await request.json());
      const [contract] = await db
        .insert(contracts)
        .values({ ...input, createdByUserId: current.principal.userId })
        .returning();
      if (!contract) throw new Error("Contract creation failed");
      await db
        .update(organizations)
        .set({
          contractNumber: contract.contractNumber,
          contractStartDate: contract.startDate,
          contractEndDate: contract.endDate,
          renewalDate: contract.renewalDate,
          planCode: contract.planCode,
          paymentTerms: contract.paymentTerms,
          amountContracted: contract.annualValue,
          facilityLimit: contract.facilityLimit,
          userLimit: contract.userLimit,
          monthlyAiRequestLimit: contract.aiLimit,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, input.organizationId));
      await db.insert(auditEvents).values({
        organizationId: input.organizationId,
        actorId: current.principal.userId,
        action: "billing.contract.create",
        resourceType: "contract",
        resourceId: contract.id,
        outcome: "success",
        requestId: id,
        changeSummary: { contractNumber: contract.contractNumber, status: contract.status },
      });
      return json({ contract }, { status: 201 });
    }

    if (action === "invoice" && request.method === "POST") {
      const input = invoiceSchema.parse(await request.json());
      const invoiceNumber = await createInvoiceNumber(db);
      const [invoice] = await db
        .insert(invoices)
        .values({ ...input, invoiceNumber, createdByUserId: current.principal.userId })
        .returning();
      if (!invoice) throw new Error("Invoice creation failed");
      await db
        .update(organizations)
        .set({
          invoiceNumber,
          invoiceStatus: invoice.status,
          purchaseOrderNumber: input.purchaseOrderNumber,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, input.organizationId));
      await db.insert(auditEvents).values({
        organizationId: input.organizationId,
        actorId: current.principal.userId,
        action: "billing.invoice.create",
        resourceType: "invoice",
        resourceId: invoice.id,
        outcome: "success",
        requestId: id,
        changeSummary: { invoiceNumber, status: invoice.status },
      });
      return json({ invoice }, { status: 201 });
    }

    if (action === "transition" && request.method === "POST") {
      const input = z
        .object({ organizationId: organizationIdSchema, transition: z.enum(["activate", "restrict", "suspend", "restore"]) })
        .parse(await request.json());
      const actionContext = { db, organizationId: input.organizationId, actorId: current.principal.userId, requestId: id };
      const organization =
        input.transition === "activate"
          ? await activateOrganization(actionContext)
          : input.transition === "restrict"
            ? await restrictOrganization(actionContext)
            : input.transition === "suspend"
              ? await suspendOrganization(actionContext)
              : await restoreOrganization(actionContext);
      return json({ organization });
    }

    if (action === "grace-period" && request.method === "POST") {
      const input = z.object({ organizationId: organizationIdSchema, endsAt: z.string().datetime() }).parse(await request.json());
      return json({ organization: await extendGracePeriod({ db, organizationId: input.organizationId, actorId: current.principal.userId, requestId: id }, new Date(input.endsAt)) });
    }

    if (action === "renew" && request.method === "POST") {
      const input = z.object({ organizationId: organizationIdSchema, contractId: z.string().uuid(), startDate: z.string().date(), endDate: z.string().date(), renewalDate: z.string().date().optional() }).parse(await request.json());
      return json({ contract: await renewOrganizationContract({ db, organizationId: input.organizationId, actorId: current.principal.userId, requestId: id }, input) });
    }

    if (action === "payment" && request.method === "POST") {
      const input = z.object({ organizationId: organizationIdSchema, invoiceId: z.string().uuid(), amount: z.string().regex(/^\d+(\.\d{1,2})?$/) }).parse(await request.json());
      return json({ invoice: await recordInvoicePayment({ db, organizationId: input.organizationId, actorId: current.principal.userId, requestId: id }, input) });
    }

    throw new HttpError(404, "Not found");
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/platform/billing/:action" };
