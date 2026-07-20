import type { DiagnosticConversationMessage } from "./diagnostic-ai";

export interface DiagnosticHistoryEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  deviceContext?: string;
  guideId?: string;
  messages: DiagnosticConversationMessage[];
}

const storageKey = "resovii-diagnostic-history-v1";
const maxSessions = 12;
const maxMessages = 20;

export function loadDiagnosticHistory(): DiagnosticHistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const entries = JSON.parse(raw) as DiagnosticHistoryEntry[];
    return Array.isArray(entries)
      ? entries.filter((entry) => Array.isArray(entry.messages)).slice(0, maxSessions)
      : [];
  } catch {
    return [];
  }
}

export function saveDiagnosticHistory(entries: DiagnosticHistoryEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, maxSessions)));
}

export function upsertDiagnosticHistory(entry: DiagnosticHistoryEntry): DiagnosticHistoryEntry[] {
  const next = [
    { ...entry, messages: entry.messages.slice(-maxMessages) },
    ...loadDiagnosticHistory().filter((candidate) => candidate.id !== entry.id),
  ].slice(0, maxSessions);
  saveDiagnosticHistory(next);
  return next;
}

export function diagnosticHistoryTitle(messages: DiagnosticConversationMessage[]) {
  const firstReport = messages.find((message) => message.role === "user")?.text.trim();
  if (!firstReport) return "Untitled diagnostic";
  return firstReport.length > 64 ? `${firstReport.slice(0, 61)}...` : firstReport;
}
