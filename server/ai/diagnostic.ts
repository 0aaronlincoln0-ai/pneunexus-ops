import { troubleshootingGuides, type TroubleshootingGuide } from "../../src/lib/troubleshooting";

const stopWords = new Set([
  "about",
  "after",
  "again",
  "does",
  "from",
  "have",
  "into",
  "that",
  "the",
  "then",
  "this",
  "with",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

export function rankDiagnosticGuides(
  query: string,
  selectedGuideId?: string,
): TroubleshootingGuide[] {
  const queryTokens = tokens(query);
  return troubleshootingGuides
    .map((guide) => {
      const searchable = [
        guide.title,
        ...guide.faultNames,
        guide.category,
        ...guide.deviceTypes,
        guide.summary,
        ...guide.symptoms,
        ...guide.likelyCauses,
      ]
        .join(" ")
        .toLowerCase();
      const matches = queryTokens.reduce(
        (score, token) => score + (searchable.includes(token) ? 2 : 0),
        0,
      );
      return { guide, score: matches + (guide.id === selectedGuideId ? 8 : 0) };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ guide }) => guide);
}

export function diagnosticProtocolContext(
  query: string,
  selectedGuideId?: string,
  completedStepIndexes: number[] = [],
): string {
  return rankDiagnosticGuides(query, selectedGuideId)
    .map((guide) => {
      const steps = guide.steps
        .map(
          (step, index) =>
            `${index + 1}. ${step.title}${completedStepIndexes.includes(index) && guide.id === selectedGuideId ? " [completed]" : ""}\n` +
            `   Instruction: ${step.instruction}\n   Expected: ${step.expected}\n   If abnormal: ${step.ifAbnormal}`,
        )
        .join("\n");
      return `GUIDE ID: ${guide.id}\nTITLE: ${guide.title}\nRISK: ${guide.risk}\nSUMMARY: ${guide.summary}\nSAFETY: ${guide.safety.join(" | ")}\nSTEPS:\n${steps}\nESCALATE WHEN: ${guide.escalateWhen.join(" | ")}\nSOURCE: ${guide.sourceSection}`;
    })
    .join("\n\n---\n\n");
}

export const diagnosticSystemPrompt = `You are PneuNexus Voice Assist, a field diagnostic guide for qualified hospital pneumatic-tube technicians.

Your job is to walk the technician through exactly ONE safe diagnostic check per turn, then ask for the observed result. Use only the supplied approved protocol excerpts as repair authority. A photo is supporting evidence only: state uncertainty when a condition, label, position, or part cannot be clearly verified.

Hard boundaries:
- Never identify a patient, specimen, medication, or other clinical content in a photo or message. Ask the user to remove it.
- Never invent a fault, component, setting, measurement, or part number.
- Never bypass lockout/tagout, infection-control policy, electrical qualification, site authorization, or a protocol safety gate.
- Never tell the user to reach into moving equipment, energize exposed equipment, or issue live controls.
- Stop and escalate when the protocol says to escalate, the evidence is ambiguous at a hazardous step, or the required guide is absent.
- Keep speech concise and natural because it is read aloud on a phone. Put the single actionable check in nextStep. The spoken response should include the check and the follow-up question.
- Site manuals, current revisions, hospital policy, and qualified personnel always take precedence.`;

export const diagnosticResponseJsonSchema = {
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
  },
} as const;
