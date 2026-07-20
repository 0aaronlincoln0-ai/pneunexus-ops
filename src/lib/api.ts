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
      skills: [
        {
          id: "fault-code-expert",
          title: "Fault code expert",
          status: "active",
          detail: `Matched this case to ${guide.title}.`,
        },
        {
          id: "equipment-photo-inspector",
          title: "Equipment photo inspector",
          status: input.imageDataUrl ? "active" : "ready",
          detail: input.imageDataUrl
            ? "Photo was attached for review."
            : "Ready for an equipment photo.",
        },
        {
          id: "service-history-memory",
          title: "Service history memory",
          status: serviceKnowledge.length > 0 ? "active" : "ready",
          detail:
            serviceKnowledge.length > 0
              ? `Found ${serviceKnowledge.length} related field resolution record${serviceKnowledge.length === 1 ? "" : "s"}.`
              : "No matching field-history record was found.",
        },
        {
          id: "parts-tools-helper",
          title: "Parts and tools helper",
          status: step ? "active" : "ready",
          detail: step
            ? `Use approved tools: ${guide.tools.slice(0, 3).join(", ")}.`
            : "Ready after a reviewed next step is selected.",
        },
        {
          id: "return-to-service-verifier",
          title: "Return-to-service verifier",
          status: step ? "ready" : "active",
          detail: step
            ? "Standing by until the current check is complete."
            : `Verify before closing: ${guide.verification.slice(0, 2).join(" ")}`,
        },
        {
          id: "technician-report-writer",
          title: "Technician report writer",
          status: !step ? "active" : "ready",
          detail: "Building a clean case summary from each observation and check.",
        },
        {
          id: "safety-gate",
          title: "Safety gate",
          status: safetyStop ? "blocked" : "active",
          detail: safetyStop
            ? "Stop condition is active. Confirm site authorization and lockout/tagout."
            : "No protocol stop condition is active for this check.",
        },
      ],
      apiTrace: {
        route: "/api/diagnose",
        provider: "none",
        model: "local-preview",
        requestId: null,
        usedAi: false,
        imageReviewed: Boolean(input.imageDataUrl),
      },
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
  return { ...response, serviceKnowledge: response.serviceKnowledge ?? [], skills: response.skills ?? [] };
}

export interface RealtimeSessionCredential {
  value: string;
  expiresAt: number | null;
  model: string;
}

export async function createRealtimeSession(
  csrfToken: string,
): Promise<RealtimeSessionCredential> {
  return parse<RealtimeSessionCredential>(
    await fetch("/api/realtime-session", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
    }),
  );
}
