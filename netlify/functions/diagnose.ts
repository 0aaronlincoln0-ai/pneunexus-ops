import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { z } from "zod";
import {
  diagnosticProtocolContext,
  diagnosticResponseJsonSchema,
  diagnosticSystemPrompt,
  rankDiagnosticGuides,
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
  deviceContext: z.string().trim().max(240).optional(),
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
      sourceGuideId: z.string(),
      stepIndex: z.number().int().min(0).max(30),
    })
    .nullable(),
  followUpQuestion: z.string(),
  evidenceToCollect: z.array(z.string()).max(4),
  escalate: z.boolean(),
  escalationReason: z.string().nullable(),
});

function env(name: string): string | undefined {
  return process.env[name] ?? (typeof Netlify === "undefined" ? undefined : Netlify.env.get(name));
}

const defaultDiagnosticModel = "gpt-4o-mini";

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
    if (!apiKey && !baseURL)
      throw new HttpError(503, "Voice Assist is not configured for this deployment yet.");

    const diagnosticQuery = [input.deviceContext, input.message].filter(Boolean).join(" ");
    const protocolContext = diagnosticProtocolContext(
      diagnosticQuery,
      input.guideId,
      input.completedStepIndexes,
    );
    const priorConversation = input.conversation
      .map(({ role, text }) => `${role === "user" ? "Technician" : "Assistant"}: ${text}`)
      .join("\n");
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "text",
        text: `APPROVED PROTOCOL EXCERPTS:\n${protocolContext}\n\nSAVED EQUIPMENT CONTEXT:\n${input.deviceContext || "None selected"}\n\nRECENT CONVERSATION:\n${priorConversation || "None"}\n\nCURRENT TECHNICIAN REPORT:\n${input.message}`,
      },
    ];
    if (input.imageDataUrl)
      content.push({
        type: "image_url",
        image_url: { url: input.imageDataUrl, detail: "low" },
      });

    const model = env("AI_DIAGNOSTIC_MODEL") ?? defaultDiagnosticModel;
    const client = new OpenAI({
      apiKey: apiKey ?? "netlify-ai-gateway",
      ...(baseURL ? { baseURL } : {}),
      timeout: 25_000,
      maxRetries: 1,
    });
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${diagnosticSystemPrompt}\n\nReturn only a valid JSON object that matches this required schema:\n${JSON.stringify(diagnosticResponseJsonSchema)}`,
        },
        { role: "user", content },
      ],
      max_tokens: 1_600,
      response_format: { type: "json_object" },
    });
    const outputText = response.choices[0]?.message.content;
    if (!outputText) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "diagnostic.response.empty",
          requestId: id,
          model,
          choiceCount: response.choices.length,
          finishReason: response.choices[0]?.finish_reason ?? "unknown",
          refusal: Boolean(response.choices[0]?.message.refusal),
        }),
      );
      throw new Error("AI response did not contain output text");
    }
    let result: z.infer<typeof outputSchema>;
    try {
      result = outputSchema.parse(JSON.parse(outputText));
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "diagnostic.response.invalid",
          requestId: id,
          model,
          finishReason: response.choices[0]?.finish_reason ?? "unknown",
          outputLength: outputText.length,
          errorType: error instanceof Error ? error.name : "unknown",
        }),
      );
      throw error;
    }

    const approvedGuides = rankDiagnosticGuides(diagnosticQuery, input.guideId);
    const modelRecommendedGuide =
      approvedGuides.find(({ id: guideId }) => guideId === result.recommendedGuideId) ??
      approvedGuides[0];
    if (!modelRecommendedGuide) throw new Error("No approved diagnostic protocol was selected");

    const selectedStepGuide = result.nextStep
      ? approvedGuides.find(({ id: guideId }) => guideId === result.nextStep?.sourceGuideId)
      : undefined;
    const requestedStepIndex = result.nextStep?.stepIndex;
    const requestedStepAlreadyCompleted =
      selectedStepGuide?.id === input.guideId &&
      requestedStepIndex !== undefined &&
      input.completedStepIndexes.includes(requestedStepIndex);
    const approvedStepIndex =
      requestedStepAlreadyCompleted && selectedStepGuide
        ? selectedStepGuide.steps.findIndex(
            (_, index) => !input.completedStepIndexes.includes(index),
          )
        : requestedStepIndex;
    const selectedStep =
      selectedStepGuide && approvedStepIndex !== undefined && approvedStepIndex >= 0
        ? selectedStepGuide.steps[approvedStepIndex]
        : undefined;
    const invalidStepSelection = Boolean(result.nextStep && (!selectedStepGuide || !selectedStep));
    const recommendedGuide = selectedStepGuide ?? modelRecommendedGuide;
    const nextStep =
      selectedStep && selectedStepGuide
        ? {
            title: selectedStep.title,
            instruction: selectedStep.instruction,
            expected: selectedStep.expected,
            sourceGuideId: selectedStepGuide.id,
          }
        : null;
    const safetyStop = Boolean(selectedStep?.requiresShutdown) || result.safetyStop;
    const safetyMessage = selectedStep?.requiresShutdown
      ? "This check requires shutdown and site-approved lockout/tagout before work begins."
      : result.safetyMessage;
    const followUpQuestion = invalidStepSelection
      ? "Stop here and escalate because no reviewed protocol step matched the requested action."
      : nextStep
        ? "What did you observe after completing that check?"
        : result.followUpQuestion;
    const speech = invalidStepSelection
      ? followUpQuestion
      : nextStep
        ? `${safetyStop ? "Stop and confirm the stated safety conditions first. " : ""}${nextStep.instruction} You should see: ${nextStep.expected} ${followUpQuestion}`
        : result.speech;
    const groundedResult: DiagnosticTurnResponse = {
      ...result,
      summary: invalidStepSelection ? recommendedGuide.summary : result.summary,
      speech,
      recommendedGuideId: recommendedGuide.id,
      safetyStop,
      safetyMessage,
      nextStep,
      followUpQuestion,
      evidenceToCollect: nextStep ? recommendedGuide.tools.slice(0, 4) : result.evidenceToCollect,
      escalate: invalidStepSelection || result.escalate,
      escalationReason: invalidStepSelection
        ? "The AI selection did not map to a reviewed protocol step."
        : result.escalationReason,
      serviceKnowledge: [],
      mode: "ai-gateway",
    };

    await databaseAuditLogProvider.append({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      action: "diagnostic.ai.turn",
      resourceType: "troubleshooting-guide",
      resourceId: groundedResult.recommendedGuideId,
      outcome: "success",
      requestId: id,
      changeSummary: {
        model,
        imageProvided: Boolean(input.imageDataUrl),
        safetyStop: groundedResult.safetyStop,
        escalate: groundedResult.escalate,
      },
    });

    return json(groundedResult);
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/diagnose" };
