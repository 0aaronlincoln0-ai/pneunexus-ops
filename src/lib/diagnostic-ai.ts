export interface DiagnosticNextStep {
  title: string;
  instruction: string;
  expected: string;
  sourceGuideId: string;
}

export interface PocketTechSkillResult {
  id:
    | "fault-code-expert"
    | "equipment-photo-inspector"
    | "service-history-memory"
    | "parts-tools-helper"
    | "return-to-service-verifier"
    | "technician-report-writer"
    | "safety-gate";
  title: string;
  status: "active" | "ready" | "blocked";
  detail: string;
}

export interface DiagnosticApiTrace {
  route: "/api/diagnose" | "/mcp";
  provider: "openai" | "netlify-ai-gateway" | "none";
  model: string;
  requestId: string | null;
  usedAi: boolean;
  imageReviewed: boolean;
}

export interface DiagnosticTurnResponse {
  summary: string;
  speech: string;
  recommendedGuideId: string;
  confidence: "high" | "medium" | "low";
  safetyStop: boolean;
  safetyMessage: string | null;
  nextStep: DiagnosticNextStep | null;
  followUpQuestion: string;
  evidenceToCollect: string[];
  escalate: boolean;
  escalationReason: string | null;
  serviceKnowledge: Array<{
    id: string;
    title: string;
    equipment: string;
    location: string;
    resolution: string;
    status: "resolved" | "monitoring" | "open";
  }>;
  skills: PocketTechSkillResult[];
  apiTrace: DiagnosticApiTrace;
  mode: "ai-gateway" | "local-guided";
}

export interface DiagnosticConversationMessage {
  role: "user" | "assistant";
  text: string;
}

export interface DiagnosticTurnInput {
  message: string;
  guideId?: string;
  completedStepIndexes: number[];
  conversation: DiagnosticConversationMessage[];
  deviceContext?: string;
  imageDataUrl?: string;
}
