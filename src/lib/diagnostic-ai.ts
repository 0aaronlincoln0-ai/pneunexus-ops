export interface DiagnosticNextStep {
  title: string;
  instruction: string;
  expected: string;
  sourceGuideId: string;
  stepIndex: number;
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
  mode: "ai-gateway" | "local-guided";
}

export interface DiagnosticConversationMessage {
  role: "user" | "assistant";
  text: string;
}

export interface DiagnosticTurnInput {
  message: string;
  deviceId?: string;
  guideId?: string;
  completedStepIndexes: number[];
  conversation: DiagnosticConversationMessage[];
  deviceContext?: string;
  imageDataUrl?: string;
}

export function mergeCompletedStepIndexes(indexes: number[], completedIndex?: number): number[] {
  if (completedIndex === undefined) return indexes;
  return [...new Set([...indexes, completedIndex])].sort((left, right) => left - right);
}
