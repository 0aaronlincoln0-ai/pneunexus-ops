import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { diagnosticProtocolContext, rankDiagnosticGuides } from "../../server/ai/diagnostic";
import { detectProhibitedContent } from "../../server/security/validation";
import type { DiagnosticTurnResponse } from "../../src/lib/diagnostic-ai";

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, mcp-session-id, mcp-protocol-version, authorization",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Cache-Control": "private, no-store, max-age=0",
} as const;

const diagnosticToolName = "pocket_technician_diagnostic";

const diagnosticInputSchema = z.object({
  report: z.string().trim().min(2).max(1_200),
  deviceContext: z.string().trim().max(240).optional(),
  selectedGuideId: z.string().trim().max(80).optional(),
  completedStepIndexes: z.array(z.number().int().min(0).max(30)).max(30).default([]),
});

const diagnosticJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["report"],
  properties: {
    report: {
      type: "string",
      minLength: 2,
      maxLength: 1200,
      description:
        "The technician's current equipment-only observation, fault text, or result from the prior check.",
    },
    deviceContext: {
      type: "string",
      maxLength: 240,
      description: "Optional equipment or location context, excluding patient or clinical data.",
    },
    selectedGuideId: {
      type: "string",
      maxLength: 80,
      description: "Optional guide id from a prior Pocket Technician response.",
    },
    completedStepIndexes: {
      type: "array",
      maxItems: 30,
      items: { type: "integer", minimum: 0, maximum: 30 },
      description: "Zero-based indexes of reviewed steps already completed in the selected guide.",
    },
  },
} as const;

const diagnosticOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "speech",
    "recommendedGuideId",
    "confidence",
    "safetyStop",
    "safetyMessage",
    "nextStep",
    "followUpQuestion",
    "evidenceToCollect",
    "escalate",
    "escalationReason",
    "mode",
  ],
  properties: {
    summary: { type: "string" },
    speech: { type: "string" },
    recommendedGuideId: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    safetyStop: { type: "boolean" },
    safetyMessage: { type: ["string", "null"] },
    nextStep: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["title", "instruction", "expected", "sourceGuideId"],
          properties: {
            title: { type: "string" },
            instruction: { type: "string" },
            expected: { type: "string" },
            sourceGuideId: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
    followUpQuestion: { type: "string" },
    evidenceToCollect: { type: "array", items: { type: "string" }, maxItems: 4 },
    escalate: { type: "boolean" },
    escalationReason: { type: ["string", "null"] },
    mode: { type: "string", enum: ["reviewed-procedure"] },
  },
} as const;

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function createReviewedDiagnostic(input: z.infer<typeof diagnosticInputSchema>): DiagnosticTurnResponse {
  const diagnosticQuery = [input.deviceContext, input.report].filter(Boolean).join(" ");
  const guide = rankDiagnosticGuides(diagnosticQuery, input.selectedGuideId)[0];
  if (!guide) throw new Error("No reviewed diagnostic procedure matches this report.");

  const nextStepIndex = guide.steps.findIndex(
    (_, index) =>
      guide.id !== input.selectedGuideId || !input.completedStepIndexes.includes(index),
  );
  const step = nextStepIndex >= 0 ? guide.steps[nextStepIndex] : undefined;
  const safetyStop = Boolean(step?.requiresShutdown);
  const followUpQuestion = step
    ? "What did you observe after completing that check?"
    : "Did the equipment pass the approved return-to-service verification?";

  return {
    summary: `Pocket Technician matched the report to the reviewed procedure: ${guide.title}.`,
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
        }
      : null,
    followUpQuestion,
    evidenceToCollect: step ? guide.tools.slice(0, 4) : guide.verification.slice(0, 3),
    escalate: !step,
    escalationReason: !step ? "Reviewed procedure steps are complete." : null,
    serviceKnowledge: [],
    mode: "local-guided",
  };
}

function mcpDiagnosticResult(input: z.infer<typeof diagnosticInputSchema>) {
  const warnings = detectProhibitedContent(input.report);
  if (input.deviceContext) warnings.push(...detectProhibitedContent(input.deviceContext));
  if (warnings.length) {
    return {
      content: [
        {
          type: "text",
          text: "Remove patient, specimen, medication, label, or medical-record information before using Pocket Technician.",
        },
      ],
      structuredContent: {
        summary: "The report may contain protected health information.",
        speech:
          "Remove patient, specimen, medication, label, or medical-record information before using Pocket Technician.",
        recommendedGuideId: "none",
        confidence: "low",
        safetyStop: true,
        safetyMessage: "Pocket Technician only accepts equipment and infrastructure information.",
        nextStep: null,
        followUpQuestion: "Can you restate the issue with equipment-only details?",
        evidenceToCollect: [],
        escalate: true,
        escalationReason: "Possible protected health information was detected.",
        mode: "reviewed-procedure",
      },
    };
  }

  const result = createReviewedDiagnostic(input);
  return {
    content: [{ type: "text", text: result.speech }],
    structuredContent: {
      ...result,
      mode: "reviewed-procedure",
    },
    _meta: {
      protocolContext: diagnosticProtocolContext(
        [input.deviceContext, input.report].filter(Boolean).join(" "),
        input.selectedGuideId,
        input.completedStepIndexes,
      ),
    },
  };
}

async function handleRpc(request: JsonRpcRequest) {
  const id = request.id;
  if (request.method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: {
        name: "resovii-pocket-technician",
        title: "Resovii Pocket Technician",
        version: "0.1.0",
      },
      instructions:
        "Use Pocket Technician for equipment-only hospital pneumatic tube troubleshooting. It returns one reviewed diagnostic check at a time and must not be used for patient, specimen, medication, or medical-record information.",
    });
  }

  if (request.method === "notifications/initialized") return null;

  if (request.method === "tools/list") {
    return rpcResult(id, {
      tools: [
        {
          name: diagnosticToolName,
          title: "Run Pocket Technician diagnostic",
          description:
            "Selects one safe, reviewed diagnostic check for a hospital pneumatic tube equipment report. It is read-only and never controls equipment.",
          inputSchema: diagnosticJsonSchema,
          outputSchema: diagnosticOutputSchema,
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
            destructiveHint: false,
          },
        },
      ],
    });
  }

  if (request.method === "tools/call") {
    const params = z
      .object({
        name: z.literal(diagnosticToolName),
        arguments: diagnosticInputSchema,
      })
      .parse(request.params);
    return rpcResult(id, mcpDiagnosticResult(params.arguments));
  }

  return rpcError(id, -32601, `Unsupported method: ${request.method ?? "unknown"}`);
}

export default async (request: Request, context: Context) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method === "GET") {
    return json({
      status: "ok",
      service: "Resovii Pocket Technician MCP",
      mcp: "/mcp",
      requestId: context.requestId,
    });
  }
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, { status: 405 });

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await request.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return json(rpcError(null, -32700, "Invalid JSON"), { status: 400 });
  }

  try {
    if (Array.isArray(body)) {
      const results = (await Promise.all(body.map(handleRpc))).filter(Boolean);
      return json(results);
    }
    const result = await handleRpc(body);
    return result ? json(result) : new Response(null, { status: 202, headers: corsHeaders });
  } catch (error) {
    return json(
      rpcError(
        Array.isArray(body) ? null : body.id,
        -32602,
        error instanceof Error ? error.message : "Invalid request",
      ),
      { status: 400 },
    );
  }
};

export const config: Config = { path: "/mcp" };
