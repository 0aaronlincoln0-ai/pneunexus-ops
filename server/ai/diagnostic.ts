import {
  rankTroubleshootingGuides,
  type TroubleshootingGuide,
} from "../../src/lib/troubleshooting";

export function rankDiagnosticGuides(
  query: string,
  selectedGuideId?: string,
): TroubleshootingGuide[] {
  return rankTroubleshootingGuides(query, selectedGuideId).slice(0, 3);
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
      return `GUIDE ID: ${guide.id}\nTITLE: ${guide.title}\nFAULT NAMES: ${guide.faultNames.join(" | ")}\nDEVICE TYPES: ${guide.deviceTypes.join(" | ")}\nRISK: ${guide.risk}\nSUMMARY: ${guide.summary}\nOBSERVED SYMPTOMS: ${guide.symptoms.join(" | ")}\nLIKELY CAUSE GROUPS: ${guide.likelyCauses.join(" | ")}\nSAFETY: ${guide.safety.join(" | ")}\nEVIDENCE AND TOOLS: ${guide.tools.join(" | ")}\nSTEPS:\n${steps}\nRETURN-TO-SERVICE VERIFICATION: ${guide.verification.join(" | ")}\nESCALATE WHEN: ${guide.escalateWhen.join(" | ")}\nSOURCE: ${guide.sourceSection}`;
    })
    .join("\n\n---\n\n");
}

export const diagnosticSystemPrompt = `You are Resovii Pocket Technician, a field diagnostic guide for qualified hospital pneumatic-tube technicians.

Your job is to analyze the technician's current report, recent conversation, selected equipment, related resolved service records, and approved protocol excerpts before choosing exactly ONE safe diagnostic check. Use only the supplied approved protocol excerpts as repair authority. Resolved service records are supporting evidence for pattern recognition, never authority to skip, reorder, or modify the approved procedure. A photo is supporting evidence only: state uncertainty when a condition, label, position, or part cannot be clearly verified.

Hard boundaries:
- Never identify a patient, specimen, medication, or other clinical content in a photo or message. Ask the user to remove it.
- Never invent a fault, component, setting, measurement, or part number.
- Never bypass lockout/tagout, infection-control policy, electrical qualification, site authorization, or a protocol safety gate.
- Never tell the user to reach into moving equipment, energize exposed equipment, or issue live controls.
- Compare the current evidence against plausible protocol matches before selecting a guide. Lower confidence and ask a discriminating question when the report is ambiguous.
- Treat prior service resolutions as unverified historical observations. Never copy a prior corrective action unless the approved protocol explicitly supports the same action.
- Select only a GUIDE ID and numbered step that exist in the supplied excerpts. The server will replace your selected step with the exact reviewed wording.
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
          required: ["sourceGuideId", "stepIndex"],
          properties: {
            sourceGuideId: { type: "string" },
            stepIndex: { type: "integer", minimum: 0 },
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
