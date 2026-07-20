import type { BootstrapData, SessionUser } from "../types";
import type { DiagnosticTurnInput, DiagnosticTurnResponse } from "./diagnostic-ai";
import { emptyWorkspaceData, localAdminUser } from "./local-demo";
import { loadLocalWorkspace } from "./local-workspace";
import { findServiceKnowledge } from "./service-history";
import { rankTroubleshootingGuides, troubleshootingGuides } from "./troubleshooting";

const localAdminEnabled = import.meta.env.DEV && import.meta.env.VITE_LOCAL_ADMIN !== "false";
const localSessionKey = "resovii-local-admin";
const legacyLocalSessionKey = "pneunexus-local-admin";

export type SubscriptionPlan = "individual" | "team" | "lifetime";

export interface RegisterAccountInput {
  organizationName: string;
  displayName: string;
  email: string;
  password: string;
  plan: SubscriptionPlan;
}

export interface BillingSummary {
  organization: {
    displayName: string | null;
    planCode: string;
    subscriptionStatus: string;
    purchaseOrderNumber: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
    renewalDate: string | null;
    paymentTerms: string | null;
    billingEmail: string | null;
    billingContactName: string | null;
  } | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    purchaseOrderNumber: string | null;
    issueDate: string;
    dueDate: string | null;
    amountDue: string;
    amountPaid: string;
    currency: string;
    status: string;
    paymentTerms: string | null;
    description: string | null;
    paidAt: string | null;
  }>;
  contracts: Array<{
    id: string;
    contractNumber: string;
    contractType: string;
    startDate: string;
    endDate: string;
    renewalDate: string | null;
    status: string;
    agreementAvailable: string | null;
  }>;
}

function hasLocalSession() {
  return (
    localStorage.getItem(localSessionKey) === "authenticated" ||
    localStorage.getItem(legacyLocalSessionKey) === "authenticated"
  );
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok)
    throw new ApiError(body.error ?? "The request could not be completed", response.status);
  return body;
}

export async function getSession(): Promise<{ user: SessionUser; csrfToken: string } | null> {
  if (localAdminEnabled) {
    return hasLocalSession() ? { user: localAdminUser, csrfToken: "local-development" } : null;
  }
  const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
  if (response.status === 401) return null;
  return parse(response);
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: SessionUser; csrfToken: string }> {
  if (localAdminEnabled) {
    if (email.trim().toLowerCase() !== "admin" || password !== "admin") {
      throw new ApiError("Username or password is incorrect", 401);
    }
    localStorage.setItem(localSessionKey, "authenticated");
    return { user: localAdminUser, csrfToken: "local-development" };
  }
  return parse(
    await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function registerAccount(
  input: RegisterAccountInput,
): Promise<{ user: SessionUser; csrfToken: string }> {
  if (localAdminEnabled) {
    localStorage.setItem(localSessionKey, "authenticated");
    return { user: localAdminUser, csrfToken: "local-development" };
  }
  return parse(
    await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function logout(csrfToken: string): Promise<void> {
  if (localAdminEnabled) {
    localStorage.removeItem(localSessionKey);
    localStorage.removeItem(legacyLocalSessionKey);
    return;
  }
  await parse(
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
    }),
  );
}

export async function getBillingSummary(): Promise<BillingSummary> {
  return parse(
    await fetch("/api/billing", { credentials: "include", cache: "no-store" }),
  );
}

export async function getPlatformOrganizations(csrfToken: string): Promise<{
  organizations: Array<{
    id: string;
    legalName: string | null;
    displayName: string | null;
    subscriptionStatus: string;
    planCode: string;
    billingType: string;
    purchaseOrderNumber: string | null;
    contractEndDate: string | null;
    invoiceStatus: string;
    updatedAt: string;
  }>;
}> {
  return parse(
    await fetch("/api/platform/billing/organizations", {
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
      cache: "no-store",
    }),
  );
}

export async function transitionOrganization(
  organizationId: string,
  transition: "activate" | "restrict" | "suspend" | "restore",
  csrfToken: string,
): Promise<void> {
  await parse(
    await fetch("/api/platform/billing/transition", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ organizationId, transition }),
    }),
  );
}

export async function getBootstrap(): Promise<BootstrapData> {
  if (localAdminEnabled) {
    return loadLocalWorkspace() ?? emptyWorkspaceData;
  }
  const response = await fetch("/api/bootstrap", { credentials: "include", cache: "no-store" });
  if (response.status === 401) return emptyWorkspaceData;
  return parse(response);
}

export async function createDevice(
  input: Record<string, unknown>,
  csrfToken: string,
): Promise<void> {
  if (localAdminEnabled) return;
  await parse(
    await fetch("/api/devices", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(input),
    }),
  );
}

export async function importTubeTrackerConfig(
  config: unknown,
  csrfToken: string,
): Promise<{ createdDevices: number; unchangedDevices: number; warnings: string[] }> {
  if (localAdminEnabled) return { createdDevices: 0, unchangedDevices: 0, warnings: [] };
  return parse(
    await fetch("/api/imports/tube-tracker", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(config),
    }),
  );
}

export async function diagnose(
  input: DiagnosticTurnInput,
  csrfToken: string,
): Promise<DiagnosticTurnResponse> {
  if (localAdminEnabled) {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const diagnosticQuery = [input.deviceContext, input.message].filter(Boolean).join(" ");
    const guide =
      rankTroubleshootingGuides(diagnosticQuery, input.guideId)[0] ?? troubleshootingGuides[0];
    if (!guide) throw new ApiError("No diagnostic guide is available", 404);
    const nextIndex = guide.steps.findIndex(
      (_, index) => !input.completedStepIndexes.includes(index),
    );
    const step = nextIndex >= 0 ? guide.steps[nextIndex] : null;
    const safetyStop = Boolean(step?.requiresShutdown);
    const serviceKnowledge = findServiceKnowledge(diagnosticQuery);
    const followUpQuestion = step
      ? `What do you observe after completing this check?`
      : "Did the system pass every return-to-service verification?";
    return {
      summary: input.imageDataUrl
        ? `Photo received. Local preview matched your report to “${guide.title}”; cloud image interpretation begins after Netlify AI Gateway is active.`
        : `Your report most closely matches “${guide.title}.”`,
      speech: step
        ? `${safetyStop ? "Stop and confirm lockout and authorization first. " : ""}${step.instruction} ${followUpQuestion}`
        : `The guided checks are complete. ${followUpQuestion}`,
      recommendedGuideId: guide.id,
      confidence: input.imageDataUrl ? "low" : "medium",
      safetyStop,
      safetyMessage: safetyStop
        ? "This check requires shutdown and site-approved lockout/tagout."
        : null,
      nextStep: step
        ? {
            title: step.title,
            instruction: step.instruction,
            expected: step.expected,
            sourceGuideId: guide.id,
          }
        : null,
      followUpQuestion,
      evidenceToCollect: step ? [step.expected] : guide.verification.slice(0, 2),
      escalate: !step,
      escalationReason: !step
        ? "Escalate if return-to-service verification is unsuccessful."
        : null,
      serviceKnowledge,
      mode: "local-guided",
    };
  }

  const response = await parse<DiagnosticTurnResponse>(
    await fetch("/api/diagnose", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(input),
    }),
  );
  return { ...response, serviceKnowledge: response.serviceKnowledge ?? [] };
}
