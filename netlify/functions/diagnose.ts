import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { z } from "zod";
import {
  diagnosticProtocolContext,
  diagnosticResponseJsonSchema,
  diagnosticSystemPrompt,
} from "../../server/ai/diagnostic";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { detectProhibitedContent } from "../../server/security/validation";
import type { DiagnosticTurnResponse } from "../../src/lib/diagnostic-ai";
import { databaseAuditLogProvider } from "./_shared/audit";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { enforceRateLimit } from "./_shared/rate-limit";
import { authenticateRequest } from "./_shared/session";

const inputSchema = z.object({
  message: z.string().trim().min(2).max(1_200),
  guideId: z.string().trim().max(80).optional(),
  completedStepIndexes: z.array(z.number().int().min(0).max(30)).max(30).default([]),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(1_200),
      }),
    )
    .max(8)
    .default([]),
  imageDataUrl: z
    .string()
    .max(1_800_000)
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});

const outputSchema = z.object({
  summary: z.string(),
  speech: z.string(),
  recommendedGuideId: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  safetyStop: z.boolean(),
  safetyMessage: z.string().nullable(),
  nextStep: z
    .object({
      title: z.string(),
      instruction: z.string(),
      expected: z.string(),
      sourceGuideId: z.string(),
    })
    .nullable(),
  followUpQuestion: z.string(),
  evidenceToCollect: z.array(z.string()).max(4),
  escalate: z.boolean(),
  escalationReason: z.string().nullable(),
});

function env(name: string): string | undefined {
  return typeof Netlify === "undefined" ? process.env[name] : Netlify.env.get(name);
}

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    if (request.method !== "POST")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });

    const { principal } = await authenticateRequest(request, true);
    requireCapability(principal.permissions, capabilities.dashboardRead);
    enforceRateLimit(
      `ai-diagnose:${principal.organizationId}:${principal.userId}`,
      24,
      15 * 60_000,
    );

    const input = inputSchema.parse(await request.json());
    const warnings = [
      ...detectProhibitedContent(input.message),
      ...input.conversation.flatMap(({ text }) => detectProhibitedContent(text)),
    ];
    if (warnings.length)
      throw new HttpError(422, "Remove patient or clinical identifiers before using Voice Assist.");

    const apiKey = env("OPENAI_API_KEY");
    const baseURL = env("OPENAI_BASE_URL");
    if (!apiKey || !baseURL)
      throw new HttpError(503, "Voice Assist is not configured for this deployment yet.");

    const protocolContext = diagnosticProtocolContext(
      input.message,
      input.guideId,
      input.completedStepIndexes,
    );
    const priorConversation = input.conversation
      .map(({ role, text }) => `${role === "user" ? "Technician" : "Assistant"}: ${text}`)
      .join("\n");
    const content: OpenAI.Responses.ResponseInputContent[] = [
      {
        type: "input_text",
        text: `APPROVED PROTOCOL EXCERPTS:\n${protocolContext}\n\nRECENT CONVERSATION:\n${priorConversation || "None"}\n\nCURRENT TECHNICIAN REPORT:\n${input.message}`,
      },
    ];
    if (input.imageDataUrl)
      content.push({ type: "input_image", image_url: input.imageDataUrl, detail: "low" });

    const client = new OpenAI({ apiKey, baseURL, timeout: 20_000, maxRetries: 1 });
    const response = await client.responses.create({
      model: env("AI_DIAGNOSTIC_MODEL") ?? "gpt-5-mini",
      instructions: diagnosticSystemPrompt,
      input: [{ role: "user", content }],
      max_output_tokens: 900,
      text: {
        format: {
          type: "json_schema",
          name: "diagnostic_turn",
          strict: true,
          schema: diagnosticResponseJsonSchema,
        },
      },
    });
    if (!response.output_text) throw new Error("AI response did not contain output text");
    const result = outputSchema.parse(JSON.parse(response.output_text));

    await databaseAuditLogProvider.append({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      action: "diagnostic.ai.turn",
      resourceType: "troubleshooting-guide",
      resourceId: result.recommendedGuideId,
      outcome: "success",
      requestId: id,
      changeSummary: {
        model: env("AI_DIAGNOSTIC_MODEL") ?? "gpt-5-mini",
        imageProvided: Boolean(input.imageDataUrl),
        safetyStop: result.safetyStop,
        escalate: result.escalate,
      },
    });

    return json({ ...result, mode: "ai-gateway" } satisfies DiagnosticTurnResponse);
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/diagnose" };
