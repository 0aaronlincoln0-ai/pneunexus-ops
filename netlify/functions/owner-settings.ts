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

const saveSchema = z.object({
  apiKey: z.string().trim().min(20).max(400),
  enabled: z.boolean().default(true),
  model: z.string().trim().min(2).max(80).default("gpt-5-mini"),
});

const enabledSchema = z.object({
  enabled: z.boolean(),
});

function isOwner(role: string | undefined) {
  return ["organization_admin", "platform_super_admin"].includes(role ?? "");
}

async function verifyOpenAiKey(apiKey: string) {
  const client = new OpenAI({ apiKey, timeout: 12_000, maxRetries: 0 });
  try {
    await client.models.list();
  } catch {
    throw new HttpError(422, "OpenAI rejected this API key. Check the key and try again.");
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
      await verifyOpenAiKey(input.apiKey);
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
