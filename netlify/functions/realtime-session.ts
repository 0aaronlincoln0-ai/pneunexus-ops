import type { Config, Context } from "@netlify/functions";
import {
  realtimeDiagnosticInstructions,
  realtimeDiagnosticTool,
} from "../../server/ai/diagnostic";
import { getOwnerOpenAiRuntimeSettings } from "../../server/owner-ai-settings";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { databaseAuditLogProvider } from "./_shared/audit";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { enforceRateLimit } from "./_shared/rate-limit";
import { authenticateRequest, sha256 } from "./_shared/session";

function env(name: string): string | undefined {
  return process.env[name] ?? (typeof Netlify === "undefined" ? undefined : Netlify.env.get(name));
}

const defaultRealtimeModel = "gpt-realtime-2.1";
const directOpenAiBaseURL = "https://api.openai.com/v1";

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    if (request.method !== "POST")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });

    const { principal } = await authenticateRequest(request, true, true);
    requireCapability(principal.permissions, capabilities.dashboardRead);
    enforceRateLimit(
      `ai-realtime:${principal.organizationId}:${principal.userId}`,
      12,
      15 * 60_000,
    );

    const ownerAi = await getOwnerOpenAiRuntimeSettings(principal.organizationId);
    const apiKey = ownerAi.apiKey ?? env("OPENAI_API_KEY");
    if (!apiKey)
      throw new HttpError(
        503,
        "Live AI voice is not configured for this Resovii workspace yet.",
      );

    const model = env("AI_REALTIME_MODEL") ?? defaultRealtimeModel;
    const safetyIdentifier = await sha256(principal.userId);
    const response = await fetch(`${directOpenAiBaseURL}/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifier,
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          reasoning: { effort: "low" },
          audio: {
            input: {
              turn_detection: {
                type: "semantic_vad",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: "marin" },
          },
          instructions: realtimeDiagnosticInstructions,
          tools: [realtimeDiagnosticTool],
        },
      }),
    });
    const data = (await response.json()) as { value?: string; expires_at?: number; error?: { message?: string } };
    if (!response.ok || !data.value) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "diagnostic.realtime.session_failed",
          requestId: id,
          status: response.status,
        }),
      );
      throw new HttpError(502, data.error?.message || "Could not start a live AI voice session.");
    }

    await databaseAuditLogProvider.append({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      action: "diagnostic.realtime.session",
      resourceType: "voice-session",
      resourceId: id,
      outcome: "success",
      requestId: id,
      changeSummary: { model },
    });

    return json({ value: data.value, expiresAt: data.expires_at ?? null, model });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/realtime-session" };
