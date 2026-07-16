export interface DiagnosticNextStep {
  title: string;
  instruction: string;
  expected: string;
  sourceGuideId: string;
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
  imageDataUrl?: string;
}
