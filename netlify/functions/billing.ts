import type { Config, Context } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "../../server/db/client";
import { contracts, invoices, organizations } from "../../server/db/schema";
import { errorResponse, json, requestId } from "./_shared/http";
import { authenticateRequest } from "./_shared/session";

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    if (request.method !== "GET")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });
    const { principal } = await authenticateRequest(request);
    const db = getDatabase();
    const [organization, invoiceRows, contractRows] = await Promise.all([
      db
        .select({
          displayName: organizations.displayName,
          planCode: organizations.planCode,
          subscriptionStatus: organizations.subscriptionStatus,
          purchaseOrderNumber: organizations.purchaseOrderNumber,
          contractStartDate: organizations.contractStartDate,
          contractEndDate: organizations.contractEndDate,
          renewalDate: organizations.renewalDate,
          paymentTerms: organizations.paymentTerms,
          billingEmail: organizations.billingEmail,
          billingContactName: organizations.billingContactName,
        })
        .from(organizations)
        .where(eq(organizations.id, principal.organizationId))
        .limit(1),
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          purchaseOrderNumber: invoices.purchaseOrderNumber,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          amountDue: invoices.amountDue,
          amountPaid: invoices.amountPaid,
          currency: invoices.currency,
          status: invoices.status,
          paymentTerms: invoices.paymentTerms,
          description: invoices.description,
          paidAt: invoices.paidAt,
        })
        .from(invoices)
        .where(eq(invoices.organizationId, principal.organizationId))
        .orderBy(asc(invoices.dueDate)),
      db
        .select({
          id: contracts.id,
          contractNumber: contracts.contractNumber,
          contractType: contracts.contractType,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
          renewalDate: contracts.renewalDate,
          status: contracts.status,
          agreementAvailable: contracts.documentReference,
        })
        .from(contracts)
        .where(eq(contracts.organizationId, principal.organizationId))
        .orderBy(asc(contracts.endDate)),
    ]);
    return json({ organization: organization[0] ?? null, invoices: invoiceRows, contracts: contractRows });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/billing" };
