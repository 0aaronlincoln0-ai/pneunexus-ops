import type { Config, Context } from "@netlify/functions";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";
import { getDatabase } from "../../server/db/client";
import { campuses, devices, workOrders } from "../../server/db/schema";
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
  deviceId: z.string().uuid().optional(),
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

const defaultDiagnosticModel = "gpt-5.4";

type ServiceKnowledge = DiagnosticTurnResponse["serviceKnowledge"];

async function loadServiceResearch(
  input: z.infer<typeof inputSchema>,
  organizationId: string,
  facilityIds: ReadonlySet<string>,
): Promise<ServiceKnowledge> {
  try {
    const allowedCampusIds = facilityIds.has("*") ? undefined : [...facilityIds];
    if (allowedCampusIds?.length === 0) return [];
    const rows = await getDatabase()
      .select({
        id: workOrders.id,
        number: workOrders.number,
        problem: workOrders.problemDescription,
        findings: workOrders.diagnosticFindings,
        resolution: workOrders.correctiveAction,
        status: workOrders.status,
        deviceAssetTag: devices.assetTag,
        deviceEquipmentTag: devices.equipmentTag,
        campusName: campuses.name,
        updatedAt: workOrders.updatedAt,
      })
      .from(workOrders)
      .leftJoin(devices, eq(workOrders.deviceId, devices.id))
      .innerJoin(campuses, eq(workOrders.campusId, campuses.id))
      .where(
        and(
          eq(workOrders.organizationId, organizationId),
          inArray(workOrders.status, ["completed", "verified", "closed"]),
          isNotNull(workOrders.correctiveAction),
          isNull(workOrders.archivedAt),
          input.deviceId ? eq(workOrders.deviceId, input.deviceId) : undefined,
          allowedCampusIds ? inArray(workOrders.campusId, allowedCampusIds) : undefined,
        ),
      )
      .orderBy(desc(workOrders.updatedAt))
      .limit(24);

    const terms = [input.deviceContext, input.message]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2);

    return rows
      .map((row) => {
        const searchable = [
          row.problem,
          row.findings,
          row.resolution,
          row.deviceAssetTag,
          row.deviceEquipmentTag,
          row.campusName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const score = terms.reduce(
          (total, term) => total + (searchable.includes(term) ? 1 : 0),
          input.deviceId ? 2 : 0,
        );
        return { row, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
      .map(({ row }) => ({
        id: row.id,
        title: `${row.number}: ${row.problem}`,
        equipment:
          [row.deviceAssetTag, row.deviceEquipmentTag].filter(Boolean).join(" - ") ||
          "System record",
        location: row.campusName,
        resolution: row.resolution ?? "Resolution was not recorded.",
        status: "resolved" as const,
      }));
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "diagnostic.service_research.unavailable",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return [];
  }
}

function localGuidedResponse(
  input: z.infer<typeof inputSchema>,
  serviceKnowledge: ServiceKnowledge = [],
): DiagnosticTurnResponse {
  const diagnosticQuery = [input.deviceContext, input.message].filter(Boolean).join(" ");
  const guide = rankDiagnosticGuides(diagnosticQuery, input.guideId)[0];
  if (!guide) throw new HttpError(404, "No reviewed diagnostic procedure matches this report");
  const nextStepIndex = guide.steps.findIndex(
    (_, index) => guide.id !== input.guideId || !input.completedStepIndexes.includes(index),
  );
  const step = nextStepIndex >= 0 ? guide.steps[nextStepIndex] : undefined;
  const safetyStop = Boolean(step?.requiresShutdown);
  const followUpQuestion = step
    ? "What did you observe after completing that check?"
    : "Did the equipment pass the approved return-to-service verification?";
  return {
    summary: `Live AI is unavailable, so Pocket Technician selected the reviewed procedure: ${guide.title}.`,
    speech: step
      ? `${safetyStop ? "Stop and complete site-approved lockout and authorization first. " : ""}${step.instruction} You should see: ${step.expected} ${followUpQuestion}`
      : followUpQuestion,
    recommendedGuideId: guide.id,
    confidence: "medium",
    safetyStop,
    safetyMessage: safetyStop
      ? "This check requires shutdown and site-approved lockout/tagout before work begins."
      : null,
    nextStep: step
      ? {
          title: step.title,
          instruction: step.instruction,
          expected: step.expected,
          sourceGuideId: guide.id,
          stepIndex: nextStepIndex,
        }
      : null,
    followUpQuestion,
    evidenceToCollect: step ? guide.tools.slice(0, 4) : guide.verification.slice(0, 3),
    escalate: !step,
    escalationReason: !step ? "Reviewed procedure steps are complete." : null,
    serviceKnowledge,
    mode: "local-guided",
  };
}

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  let parsedInput: z.infer<typeof inputSchema> | undefined;
  let serviceKnowledge: ServiceKnowledge = [];
  try {
    if (request.method !== "POST")
      return json({ error: "Method not allowed", requestId: id }, { status: 405 });

    const { principal } = await authenticateRequest(request, true, true);
    requireCapability(principal.permissions, capabilities.dashboardRead);
    enforceRateLimit(
      `ai-diagnose:${principal.organizationId}:${principal.userId}`,
      24,
      15 * 60_000,
    );

    const input = inputSchema.parse(await request.json());
    parsedInput = input;
    const warnings = [
      ...detectProhibitedContent(input.message),
      ...input.conversation.flatMap(({ text }) => detectProhibitedContent(text)),
    ];
    if (warnings.length)
      throw new HttpError(422, "Remove patient or clinical identifiers before using Voice Assist.");

    serviceKnowledge = await loadServiceResearch(
      input,
      principal.organizationId,
      principal.facilityIds,
    );
    const serviceResearchContext = serviceKnowledge.length
      ? serviceKnowledge
          .map(
            (record, index) =>
              `${index + 1}. ${record.title}\nEquipment: ${record.equipment}\nLocation: ${record.location}\nRecorded resolution: ${record.resolution}`,
          )
          .join("\n\n")
      : "No relevant resolved service records were found.";

    const apiKey = env("OPENAI_API_KEY");
    const baseURL = env("OPENAI_BASE_URL");
    if (!apiKey && !baseURL) return json(localGuidedResponse(input, serviceKnowledge));

    const diagnosticQuery = [input.deviceContext, input.message].filter(Boolean).join(" ");
    const protocolContext = diagnosticProtocolContext(
      diagnosticQuery,
      input.guideId,
      input.completedStepIndexes,
    );
    const priorConversation = input.conversation
      .map(({ role, text }) => `${role === "user" ? "Technician" : "Assistant"}: ${text}`)
      .join("\n");
    const content: OpenAI.Responses.ResponseInputContent[] = [
      {
        type: "input_text",
        text: `APPROVED PROTOCOL EXCERPTS:\n${protocolContext}\n\nRELATED RESOLVED SERVICE RECORDS (supporting evidence only):\n${serviceResearchContext}\n\nSAVED EQUIPMENT CONTEXT:\n${input.deviceContext || "None selected"}\n\nRECENT CONVERSATION:\n${priorConversation || "None"}\n\nCURRENT TECHNICIAN REPORT:\n${input.message}`,
      },
    ];
    if (input.imageDataUrl)
      content.push({
        type: "input_image",
        image_url: input.imageDataUrl,
        detail: "low",
      });

    const model = env("AI_DIAGNOSTIC_MODEL") ?? defaultDiagnosticModel;
    const client = new OpenAI({
      apiKey: apiKey ?? "netlify-ai-gateway",
      ...(baseURL ? { baseURL } : {}),
      timeout: 25_000,
      maxRetries: 1,
    });
    let response: Awaited<ReturnType<typeof client.responses.create>>;
    try {
      response = await client.responses.create({
        model,
        instructions: diagnosticSystemPrompt,
        input: [{ role: "user", content }],
        reasoning: { effort: "medium" },
        max_output_tokens: 1_600,
        text: {
          format: {
            type: "json_schema",
            name: "diagnostic_turn",
            schema: diagnosticResponseJsonSchema,
            strict: true,
          },
        },
      });
    } catch (error) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "diagnostic.ai.unavailable",
          requestId: id,
          errorType: error instanceof Error ? error.name : "unknown",
        }),
      );
      return json(localGuidedResponse(input, serviceKnowledge));
    }
    const outputText = response.output_text;
    if (!outputText) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "diagnostic.response.empty",
          requestId: id,
          model,
          status: response.status,
          incompleteReason: response.incomplete_details?.reason ?? "unknown",
        }),
      );
      return json(localGuidedResponse(input, serviceKnowledge));
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
          status: response.status,
          outputLength: outputText.length,
          errorType: error instanceof Error ? error.name : "unknown",
        }),
      );
      return json(localGuidedResponse(input, serviceKnowledge));
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
      selectedStep && selectedStepGuide && approvedStepIndex !== undefined
        ? {
            title: selectedStep.title,
            instruction: selectedStep.instruction,
            expected: selectedStep.expected,
            sourceGuideId: selectedStepGuide.id,
            stepIndex: approvedStepIndex,
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
      serviceKnowledge,
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
    if (parsedInput && !(error instanceof HttpError)) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "diagnostic.fallback",
          requestId: id,
          errorType: error instanceof Error ? error.name : "unknown",
          errorMessage: error instanceof Error ? error.message : "unknown",
        }),
      );
      return json(localGuidedResponse(parsedInput, serviceKnowledge));
    }
    return errorResponse(error, id);
  }
};

export const config: Config = { path: "/api/diagnose" };
