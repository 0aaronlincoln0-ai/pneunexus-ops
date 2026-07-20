import { describe, expect, it } from "vitest";
import {
  diagnosticProtocolContext,
  diagnosticSystemPrompt,
  rankDiagnosticGuides,
} from "../server/ai/diagnostic";
import { mergeCompletedStepIndexes } from "../src/lib/diagnostic-ai";

describe("AI diagnostic grounding", () => {
  it("ranks a missing carrier report to the missing-carrier protocol", () => {
    expect(rankDiagnosticGuides("carrier is missing after send")[0]?.id).toBe("missing-carrier");
  });

  it("keeps the technician's selected protocol in context", () => {
    expect(rankDiagnosticGuides("it does not move", "blower-position-airflow")[0]?.id).toBe(
      "blower-position-airflow",
    );
  });

  it("marks completed selected-guide steps in the grounded context", () => {
    const context = diagnosticProtocolContext(
      "station will not make position",
      "station-position-failure",
      [0],
    );
    expect(context).toContain("Confirm the reported position [completed]");
    expect(context).toContain("SOURCE:");
    expect(context).toContain("LIKELY CAUSE GROUPS:");
    expect(context).toContain("RETURN-TO-SERVICE VERIFICATION:");
  });

  it("has explicit safety and one-step boundaries", () => {
    expect(diagnosticSystemPrompt).toContain("exactly ONE safe diagnostic check");
    expect(diagnosticSystemPrompt).toContain("Never bypass lockout/tagout");
    expect(diagnosticSystemPrompt).toContain("Never invent");
    expect(diagnosticSystemPrompt).toContain("numbered step that exist");
    expect(diagnosticSystemPrompt).toContain("resolved service records");
    expect(diagnosticSystemPrompt).toContain("supporting evidence");
  });

  it("advances completed checks without duplicating step indexes", () => {
    expect(mergeCompletedStepIndexes([], 0)).toEqual([0]);
    expect(mergeCompletedStepIndexes([2, 0], 1)).toEqual([0, 1, 2]);
    expect(mergeCompletedStepIndexes([0, 1], 1)).toEqual([0, 1]);
  });
});
