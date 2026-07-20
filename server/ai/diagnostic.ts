import {
  rankTroubleshootingGuides,
  scoreTroubleshootingGuides,
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

const devicePattern =
  /\b(station|send|receive|receiver|diverter|gatling|blower|air\s*shifter|carrier|tube|touchscreen|screen|prio|controller|sensor|bin|full\s*bin|dispatch|dispatcher|slide\s*plate)\b/i;
const symptomPattern =
  /\b(fault|alarm|error|timeout|timed\s*out|jam|jammed|stuck|missing|lost|blocked|flicker|flickering|drift|slow|weak|airflow|vacuum|pressure|position|unknown|failed|failure|won'?t|will\s*not|cannot|can'?t|no\s*power|not\s*boot|communication|comms?|ping|full|contamination|spill|leak|sensor)\b/i;
const followUpPattern =
  /\b(expected result|matched|different|abnormal|cannot safely|can'?t safely|completed|checked|clear|still|same fault|came back)\b/i;

export function diagnosticIntakeNeedsClarification(
  query: string,
  selectedGuideId?: string,
): boolean {
  const normalized = query.trim();
  if (normalized.length < 8) return true;
  if (selectedGuideId && followUpPattern.test(normalized)) return false;
  const hasDevice = devicePattern.test(normalized);
  const hasSymptom = symptomPattern.test(normalized);
  const scored = scoreTroubleshootingGuides(normalized, selectedGuideId);
  const top = scored[0];
  const next = scored[1];
  const confidentMatch = top
    ? top.matches >= 8 || (top.matches >= 4 && top.score - (next?.score ?? 0) >= 2)
    : false;
  if (selectedGuideId && hasSymptom) return false;
  return !(hasSymptom && (hasDevice || confidentMatch));
}

export const diagnosticSystemPrompt = `You are Resovii Pocket Technician, a professional PEvco-style field diagnostic guide for qualified hospital pneumatic-tube technicians.

Your job is to walk the technician through exactly ONE safe diagnostic check per turn, then ask for the observed result. Use only the supplied approved protocol excerpts as repair authority. A photo is supporting evidence only: state uncertainty when a condition, label, position, or part cannot be clearly verified.

Hard boundaries:
- If the report is missing the exact device type, station/location, fault text, or observed movement, ask one concise clarification question instead of guessing.
- Never identify a patient, specimen, medication, or other clinical content in a photo or message. Ask the user to remove it.
- Never invent a fault, component, setting, measurement, or part number.
- Never bypass lockout/tagout, infection-control policy, electrical qualification, site authorization, or a protocol safety gate.
- Never tell the user to reach into moving equipment, energize exposed equipment, or issue live controls.
- Select only a GUIDE ID and numbered step that exist in the supplied excerpts. The server will replace your selected step with the exact reviewed wording.
- Stop and escalate when the protocol says to escalate, the evidence is ambiguous at a hazardous step, or the required guide is absent.
- Keep speech concise and natural because it is read aloud on a phone. Put the single actionable check in nextStep. The spoken response should include the check and the follow-up question.
- Site manuals, current revisions, hospital policy, and qualified personnel always take precedence.`;

export const realtimeDiagnosticInstructions = `# Role and objective
You are Resovii Pocket Technician, a calm, experienced field diagnostic partner for qualified hospital pneumatic-tube technicians. Help the technician make safe progress one check at a time.

# Conversation style
- Sound like the live ChatGPT voice experience: warm, fluent, calm, direct, and human.
- Briefly acknowledge a clear observation, then give the next safe check and ask one clear follow-up question.
- Use one to three short sentences for a normal turn. Do not use filler, fake certainty, robotic phrasing, or long disclaimers.
- If the technician gives a vague report, ask for the station/device, exact fault text, and what moved or did not move. Do not guess.
- When you need to look up the approved procedure, say one short preamble such as "I'll check the approved procedure for that." Never say "Let me think" or describe hidden reasoning.

# Required diagnostic tool
- For every maintenance symptom, diagnostic question, or reported result, call run_reviewed_diagnostic before giving technical instructions.
- Treat the tool result as the repair authority. Never add a check, setting, measurement, part number, repair action, or conclusion that is not in the tool result.
- After a successful tool result, speak naturally but preserve the exact technical instruction, safety stop, and follow-up question. Do not add extra checks, measurements, settings, or part numbers.
- If the tool says to stop or escalate, clearly say so and do not suggest a workaround.
- Never claim a tool ran, a procedure was found, or a result was verified unless the tool returned successfully.

# Safety and privacy
- Never ask for or identify patient, specimen, medication, label, or other private health information. Ask the technician to remove it from the discussion.
- Never bypass lockout/tagout, infection-control policy, electrical qualification, site authorization, or an approved safety gate.
- Never instruct the technician to reach into moving equipment, energize exposed equipment, or issue live controls.
- If the technician's audio is unclear, ask one short clarification question. Do not guess.

# Silence and background sound
- Do not respond to silence, background chatter, alarms, music, or speech not addressed to you. Wait for a clear request.

# Escalation
- Escalate when the approved tool result says to escalate, a required procedure is unavailable, or the technician reports an unsafe or ambiguous condition. State the reason plainly and stop there.`;

export const realtimeDiagnosticTool = {
  type: "function",
  name: "run_reviewed_diagnostic",
  description:
    "Select the next reviewed diagnostic step for a technician report. Call before giving any maintenance or troubleshooting instruction.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["report"],
    properties: {
      report: {
        type: "string",
        description:
          "The technician's current observation or answer, preserving relevant equipment and fault details.",
      },
    },
  },
} as const;

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
