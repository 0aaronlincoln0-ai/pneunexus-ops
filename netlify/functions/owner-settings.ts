import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { z } from "zod";
import {
  getOwnerAiSettingsStatus,
  saveOwnerAiSettings,
  setOwnerAiEnabled,
} from "../../server/owner-ai-settings";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { authenticateRequest } from "./_shared/session";

const directOpenAiBaseURL = "https://api.openai.com/v1";

const saveSchema = z.object({
  apiKey: z.string().trim().min(20).max(400),
  enabled: z.boolean().default(true),
  model: z.string().trim().min(2).max(80).default("gpt-5.6-sol"),
});

const enabledSchema = z.object({
  enabled: z.boolean(),
});

function isOwner(role: string | undefined) {
  return ["organization_admin", "platform_super_admin"].includes(role ?? "");
}

function ownerKeyErrorMessage(error: unknown) {
  const candidate = error as { status?: number; message?: string };
  if (candidate.status === 401) return "OpenAI says this API key is invalid. Copy a fresh key from OpenAI API Keys and paste the full value.";
  if (candidate.status === 403) return "OpenAI says this key or project does not have access to the selected model.";
  if (candidate.status === 404) return "OpenAI says the selected model is not available for this API key. Try another model name.";
  if (candidate.status === 429) return "OpenAI says this key is blocked by billing, quota, or rate limits. Check billing on the OpenAI project.";
  return candidate.message || "OpenAI rejected this API key. Check the key and try again.";
}

async function verifyOpenAiKey(apiKey: string, model: string) {
  const client = new OpenAI({
    apiKey,
    baseURL: directOpenAiBaseURL,
    timeout: 12_000,
    maxRetries: 0,
  });
  try {
    await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Reply with OK." }],
      max_completion_tokens: 12,
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "owner_ai_key.verify_failed",
        status: (error as { status?: number }).status ?? "unknown",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    throw new HttpError(422, ownerKeyErrorMessage(error));
  }
}

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    const { principal, displayName } = await authenticateRequest(
      request,
      request.method !== "GET",
      true,
    );
    requireCapability(principal.permissions, capabilities.dashboardRead);
    if (!isOwner(principal.roleKey)) throw new HttpError(403, "Owner settings access required.");

    if (request.method === "GET") {
      return json({ ai: await getOwnerAiSettingsStatus(principal.organizationId) });
    }

    if (request.method === "POST") {
      const input = saveSchema.parse(await request.json());
      if (!input.apiKey.startsWith("sk-"))
        throw new HttpError(422, "OpenAI API key must start with sk-.");
      await verifyOpenAiKey(input.apiKey, input.model);
      const ai = await saveOwnerAiSettings({
        organizationId: principal.organizationId,
        apiKey: input.apiKey,
        enabled: input.enabled,
        model: input.model,
        updatedBy: displayName,
      });
      return json({ ai });
    }

    if (request.method === "PATCH") {
      const input = enabledSchema.parse(await request.json());
      const ai = await setOwnerAiEnabled({
        organizationId: principal.organizationId,
        enabled: input.enabled,
        updatedBy: displayName,
      });
      return json({ ai });
    }

    return json({ error: "Method not allowed", requestId: id }, { status: 405 });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = {
  path: "/api/owner-settings",
};
