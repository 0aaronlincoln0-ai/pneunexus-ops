import type { BootstrapData, SessionUser } from "../types";
import type { DiagnosticTurnInput, DiagnosticTurnResponse } from "./diagnostic-ai";
import { localAdminUser, localDemoData } from "./local-demo";
import { searchTroubleshootingGuides, troubleshootingGuides } from "./troubleshooting";

const localAdminEnabled = import.meta.env.DEV && import.meta.env.VITE_LOCAL_ADMIN !== "false";
const localSessionKey = "pneunexus-local-admin";

function hasLocalSession() {
  return localStorage.getItem(localSessionKey) === "authenticated";
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

export async function login(email: string, password: string): Promise<{ csrfToken: string }> {
  if (localAdminEnabled) {
    if (email.trim().toLowerCase() !== "admin" || password !== "admin") {
      throw new ApiError("Username or password is incorrect", 401);
    }
    localStorage.setItem(localSessionKey, "authenticated");
    return { csrfToken: "local-development" };
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

export async function logout(csrfToken: string): Promise<void> {
  if (localAdminEnabled) {
    localStorage.removeItem(localSessionKey);
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

export async function getBootstrap(): Promise<BootstrapData> {
  if (localAdminEnabled) {
    if (!hasLocalSession()) throw new ApiError("Authentication required", 401);
    return localDemoData;
  }
  return parse(await fetch("/api/bootstrap", { credentials: "include", cache: "no-store" }));
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

export async function diagnose(
  input: DiagnosticTurnInput,
  csrfToken: string,
): Promise<DiagnosticTurnResponse> {
  if (localAdminEnabled) {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const guide =
      troubleshootingGuides.find(({ id }) => id === input.guideId) ??
      searchTroubleshootingGuides(input.message, "All")[0] ??
      troubleshootingGuides[0];
    if (!guide) throw new ApiError("No diagnostic guide is available", 404);
    const nextIndex = guide.steps.findIndex(
      (_, index) => !input.completedStepIndexes.includes(index),
    );
    const step = nextIndex >= 0 ? guide.steps[nextIndex] : null;
    const safetyStop = Boolean(step?.requiresShutdown);
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
      mode: "local-guided",
    };
  }

  return parse(
    await fetch("/api/diagnose", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(input),
    }),
  );
}
