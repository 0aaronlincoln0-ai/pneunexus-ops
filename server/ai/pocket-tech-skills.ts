import type { DiagnosticNextStep, PocketTechSkillResult } from "../../src/lib/diagnostic-ai";
import type { TroubleshootingGuide } from "../../src/lib/troubleshooting";

interface PocketTechSkillInput {
  guide: TroubleshootingGuide;
  nextStep: DiagnosticNextStep | null;
  imageProvided: boolean;
  serviceKnowledgeCount: number;
  safetyStop: boolean;
  escalate: boolean;
}

export function buildPocketTechSkills({
  guide,
  nextStep,
  imageProvided,
  serviceKnowledgeCount,
  safetyStop,
  escalate,
}: PocketTechSkillInput): PocketTechSkillResult[] {
  return [
    {
      id: "fault-code-expert",
      title: "Fault code expert",
      status: "active",
      detail: `Matched this case to ${guide.title} using reviewed fault names and symptoms.`,
    },
    {
      id: "equipment-photo-inspector",
      title: "Equipment photo inspector",
      status: imageProvided ? "active" : "ready",
      detail: imageProvided
        ? "Reviewed the uploaded equipment photo as supporting evidence while keeping the approved procedure in control."
        : "Ready for a station, diverter, blower, carrier, or fault-screen photo.",
    },
    {
      id: "service-history-memory",
      title: "Service history memory",
      status: serviceKnowledgeCount > 0 ? "active" : "ready",
      detail:
        serviceKnowledgeCount > 0
          ? `Found ${serviceKnowledgeCount} related field resolution record${serviceKnowledgeCount === 1 ? "" : "s"}.`
          : "No matching field-history record was found for this report yet.",
    },
    {
      id: "parts-tools-helper",
      title: "Parts and tools helper",
      status: nextStep ? "active" : "ready",
      detail: nextStep
        ? `Use approved evidence and tools for ${guide.category.toLowerCase()}: ${guide.tools.slice(0, 3).join(", ")}.`
        : "Ready to list approved tools after a reviewed next step is selected.",
    },
    {
      id: "return-to-service-verifier",
      title: "Return-to-service verifier",
      status: nextStep ? "ready" : "active",
      detail: nextStep
        ? "Standing by until the current check is complete."
        : `Verify before closing: ${guide.verification.slice(0, 2).join(" ")}`,
    },
    {
      id: "technician-report-writer",
      title: "Technician report writer",
      status: escalate || !nextStep ? "active" : "ready",
      detail: escalate
        ? "Ready to summarize the stop condition and escalation reason for the service ticket."
        : "Building a clean case summary from each observation and approved check.",
    },
    {
      id: "safety-gate",
      title: "Safety gate",
      status: safetyStop ? "blocked" : "active",
      detail: safetyStop
        ? "Stop condition is active. Confirm site authorization and lockout/tagout before continuing."
        : "No protocol stop condition is active for this single next check.",
    },
  ];
}
