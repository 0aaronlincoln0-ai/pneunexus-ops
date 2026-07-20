import type { MaintenanceTemplate } from "./maintenance";

export type PmFinding = "pass" | "attention" | "not-applicable";

export interface PmReportInput {
  template: MaintenanceTemplate;
  equipmentId: string;
  location: string;
  technician: string;
  workOrder: string;
  safetyConfirmed: boolean;
  completed: number[];
  findings: Record<number, PmFinding>;
  notes: Record<number, string>;
  generatedAt?: Date;
}

export interface PmReport {
  subject: string;
  body: string;
  attentionCount: number;
  completionPercent: number;
}

const findingLabel: Record<PmFinding, string> = {
  pass: "PASS",
  attention: "NEEDS ATTENTION",
  "not-applicable": "NOT APPLICABLE",
};

function reportDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function createPmReport(input: PmReportInput): PmReport {
  const completed = new Set(input.completed);
  const attentionSteps = input.template.steps
    .map((step, index) => ({ step, index, note: input.notes[index]?.trim() }))
    .filter(({ index }) => input.findings[index] === "attention");
  const completionPercent = Math.round((completed.size / input.template.steps.length) * 100);
  const equipment = input.equipmentId.trim() || "Equipment tag not entered";
  const location = input.location.trim() || "Location not entered";
  const generatedAt = input.generatedAt ?? new Date();
  const status =
    completed.size === input.template.steps.length && attentionSteps.length === 0
      ? "COMPLETE - NO OPEN FINDINGS"
      : attentionSteps.length
        ? "FOLLOW-UP REQUIRED"
        : "IN PROGRESS";

  const inspectionLog = input.template.steps.map((step, index) => {
    const finding = input.findings[index];
    const result = finding
      ? findingLabel[finding]
      : completed.has(index)
        ? "RECORDED"
        : "NOT RECORDED";
    const note = input.notes[index]?.trim();
    return `${index + 1}. ${step.title}\n   Result: ${result}${note ? `\n   Technician note: ${note}` : ""}`;
  });

  const attentionLog = attentionSteps.length
    ? attentionSteps.map(({ step, note }) => {
        const detail = note ? ` Technician note: ${note}` : " No technician note was recorded.";
        return `- ${step.title}: ${step.ifFailed}${detail}`;
      })
    : ["- No inspection items were marked as needing attention."];

  const subject = `PM report | ${input.template.shortName} | ${equipment} | ${status}`;
  const body = [
    "RESOVII - PLANNED MAINTENANCE REPORT",
    "",
    `Overall status: ${status}`,
    `Report created: ${reportDate(generatedAt)}`,
    `Technician: ${input.technician.trim() || "Technician not identified"}`,
    `Work order / reference: ${input.workOrder.trim() || "Not entered"}`,
    `Equipment: ${equipment}`,
    `Location: ${location}`,
    `Procedure: ${input.template.title}`,
    `Procedure source: ${input.template.source}`,
    "",
    "SAFETY AND COMPLETION",
    `- Safe work conditions confirmed: ${input.safetyConfirmed ? "Yes" : "No"}`,
    `- Inspections recorded: ${completed.size} of ${input.template.steps.length} (${completionPercent}%)`,
    `- Items needing attention: ${attentionSteps.length}`,
    "",
    "INSPECTION LOG",
    ...inspectionLog,
    "",
    "OPEN FINDINGS AND REQUIRED FOLLOW-UP",
    ...attentionLog,
    "",
    "RETURN-TO-SERVICE VERIFICATION",
    ...input.template.verification.map((item) => `- ${item}`),
    "",
    "ESCALATE IMMEDIATELY WHEN",
    ...input.template.escalation.map((item) => `- ${item}`),
    "",
    "This report records technician-entered infrastructure information only. The exact equipment-revision manual and hospital procedures remain authoritative.",
  ].join("\n");

  return { subject, body, attentionCount: attentionSteps.length, completionPercent };
}
