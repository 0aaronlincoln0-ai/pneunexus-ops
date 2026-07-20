import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { auditEvents, contracts, invoices, organizations } from "../db/schema";
import { HttpError } from "../../netlify/functions/_shared/http";

export const organizationAccessStatuses = [
  "lead",
  "pilot",
  "pending_contract",
  "pending_vendor_approval",
  "pending_purchase_order",
  "pending_activation",
  "active",
  "payment_overdue",
  "restricted",
  "suspended",
  "canceled",
  "expired",
] as const;

export const billingTypes = [
  "annual_contract",
  "multi_year_contract",
  "purchase_order",
  "invoice",
  "paid_pilot",
  "manual_agreement",
  "optional_card_payment",
] as const;

export const invoiceStatuses = [
  "not_issued",
  "issued",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "void",
  "disputed",
] as const;

export const contractStatuses = [
  "draft",
  "sent",
  "under_review",
  "signed",
  "active",
  "expiring",
  "renewed",
  "terminated",
  "expired",
] as const;

type AccessStatus = (typeof organizationAccessStatuses)[number];

interface ActionContext {
  db: Database;
  organizationId: string;
  actorId: string;
  requestId: string;
}

function assertTransition(current: string, next: AccessStatus) {
  if (current === "canceled" && next !== "pending_activation")
    throw new HttpError(409, "Canceled organizations must be re-approved before activation");
  if (current === "suspended" && next === "active")
    throw new HttpError(409, "Restore the organization before activating it");
}

async function changeAccess(
  context: ActionContext,
  input: { status: AccessStatus; action: string; values?: Record<string, unknown> },
) {
  return context.db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: organizations.id, status: organizations.subscriptionStatus })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1);
    if (!organization) throw new HttpError(404, "Organization not found");
    assertTransition(organization.status, input.status);
    const now = new Date();
    const [updated] = await tx
      .update(organizations)
      .set({
        subscriptionStatus: input.status,
        ...(input.status === "active" ? { activatedAt: now, activatedByUserId: context.actorId } : {}),
        ...(input.status === "restricted" ? { restrictedAt: now } : {}),
        ...(input.status === "suspended" ? { suspendedAt: now } : {}),
        ...(input.values ?? {}),
        updatedAt: now,
      })
      .where(eq(organizations.id, context.organizationId))
      .returning();
    await tx.insert(auditEvents).values({
      organizationId: context.organizationId,
      actorId: context.actorId,
      action: input.action,
      resourceType: "organization",
      resourceId: context.organizationId,
      outcome: "success",
      requestId: context.requestId,
      changeSummary: { from: organization.status, to: input.status, ...(input.values ?? {}) },
    });
    return updated;
  });
}

export function activateOrganization(context: ActionContext) {
  return changeAccess(context, { status: "active", action: "billing.organization.activate" });
}

export function restrictOrganization(context: ActionContext) {
  return changeAccess(context, { status: "restricted", action: "billing.organization.restrict" });
}

export function suspendOrganization(context: ActionContext) {
  return changeAccess(context, { status: "suspended", action: "billing.organization.suspend" });
}

export function restoreOrganization(context: ActionContext) {
  return changeAccess(context, { status: "active", action: "billing.organization.restore" });
}

export function extendGracePeriod(context: ActionContext, gracePeriodEndsAt: Date) {
  return changeAccess(context, {
    status: "payment_overdue",
    action: "billing.organization.extend_grace_period",
    values: { gracePeriodEndsAt },
  });
}

export async function renewOrganizationContract(
  context: ActionContext,
  input: {
    contractId: string;
    startDate: string;
    endDate: string;
    renewalDate?: string;
  },
) {
  return context.db.transaction(async (tx) => {
    const [contract] = await tx
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, input.contractId), eq(contracts.organizationId, context.organizationId)))
      .limit(1);
    if (!contract) throw new HttpError(404, "Contract not found");
    const now = new Date();
    await tx.update(contracts).set({ status: "renewed", updatedAt: now }).where(eq(contracts.id, contract.id));
    const [renewed] = await tx
      .insert(contracts)
      .values({
        organizationId: context.organizationId,
        contractNumber: `${contract.contractNumber}-R${new Date(input.startDate).getFullYear()}`,
        contractType: contract.contractType,
        planCode: contract.planCode,
        startDate: input.startDate,
        endDate: input.endDate,
        renewalDate: input.renewalDate,
        annualValue: contract.annualValue,
        implementationFee: contract.implementationFee,
        facilityLimit: contract.facilityLimit,
        userLimit: contract.userLimit,
        aiLimit: contract.aiLimit,
        paymentTerms: contract.paymentTerms,
        status: "active",
        createdByUserId: context.actorId,
      })
      .returning();
    await tx
      .update(organizations)
      .set({
        subscriptionStatus: "active",
        contractNumber: renewed?.contractNumber,
        contractStartDate: input.startDate,
        contractEndDate: input.endDate,
        renewalDate: input.renewalDate,
        activatedAt: now,
        activatedByUserId: context.actorId,
        updatedAt: now,
      })
      .where(eq(organizations.id, context.organizationId));
    await tx.insert(auditEvents).values({
      organizationId: context.organizationId,
      actorId: context.actorId,
      action: "billing.organization.renew_contract",
      resourceType: "contract",
      resourceId: renewed?.id,
      outcome: "success",
      requestId: context.requestId,
      changeSummary: { previousContractId: contract.id, contractNumber: renewed?.contractNumber },
    });
    return renewed;
  });
}

export async function recordInvoicePayment(
  context: ActionContext,
  input: { invoiceId: string; amount: string },
) {
  const paymentAmount = Number(input.amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0)
    throw new HttpError(400, "Payment amount must be greater than zero");
  return context.db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.organizationId, context.organizationId)))
      .limit(1);
    if (!invoice) throw new HttpError(404, "Invoice not found");
    if (invoice.status === "void") throw new HttpError(409, "Void invoices cannot receive payments");
    const amountDue = Number(invoice.amountDue);
    const amountPaid = Number(invoice.amountPaid) + paymentAmount;
    if (amountPaid > amountDue + 0.001) throw new HttpError(409, "Payment exceeds invoice balance");
    const status = amountPaid >= amountDue ? "paid" : "partially_paid";
    const now = new Date();
    const [updated] = await tx
      .update(invoices)
      .set({ amountPaid: amountPaid.toFixed(2), status, paidAt: status === "paid" ? now : null, updatedAt: now })
      .where(eq(invoices.id, invoice.id))
      .returning();
    await tx.insert(auditEvents).values({
      organizationId: context.organizationId,
      actorId: context.actorId,
      action: "billing.invoice.record_payment",
      resourceType: "invoice",
      resourceId: invoice.id,
      outcome: "success",
      requestId: context.requestId,
      changeSummary: { paymentAmount: paymentAmount.toFixed(2), amountPaid: amountPaid.toFixed(2), status },
    });
    return updated;
  });
}

export function canAccessWorkspace(status: string) {
  return ["active", "pilot", "payment_overdue", "restricted"].includes(status);
}

export function requireInternalBillingAdministrator(roleKey: string) {
  if (roleKey !== "platform_super_admin")
    throw new HttpError(403, "Resovii internal administrator access is required");
}

export async function createInvoiceNumber(db: Database) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices);
  return `RSV-${new Date().getFullYear()}-${String((result?.count ?? 0) + 1).padStart(5, "0")}`;
}
