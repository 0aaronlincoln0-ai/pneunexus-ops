import { describe, expect, it } from "vitest";
import {
  diagnosticIntakeNeedsClarification,
  diagnosticProtocolContext,
  diagnosticSystemPrompt,
  rankDiagnosticGuides,
  realtimeDiagnosticInstructions,
} from "../server/ai/diagnostic";

describe("AI diagnostic grounding", () => {
  it("ranks a missing carrier report to the missing-carrier protocol", () => {
    expect(rankDiagnosticGuides("carrier is missing after send")[0]?.id).toBe("missing-carrier");
  });

  it("keeps the technician's selected protocol in context", () => {
    expect(rankDiagnosticGuides("it does not move", "blower-position-airflow")[0]?.id).toBe(
      "blower-position-airflow",
    );
  });

  it("recognizes UPF at a named diverter as actionable fault detail", () => {
    expect(rankDiagnosticGuides("system says UPF at diverter 10")[0]?.id).toBe(
      "diverter-position-failure",
    );
    expect(diagnosticIntakeNeedsClarification("system says UPF at diverter 10")).toBe(false);
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

  it("keeps later steps available after the first selected-guide step is completed", () => {
    const context = diagnosticProtocolContext(
      "The check matched the expected result.",
      "station-position-failure",
      [0],
    );
    expect(context).toContain("Confirm the reported position [completed]");
    expect(context).toContain("Check transaction ownership");
  });

  it("asks for PEvco field details before guessing from a vague report", () => {
    expect(diagnosticIntakeNeedsClarification("it is not working")).toBe(true);
    expect(diagnosticIntakeNeedsClarification("Station 224 shows full bin alarm")).toBe(false);
    expect(
      diagnosticIntakeNeedsClarification(
        "The result was different: the dispatcher stayed unknown",
        "station-position-failure",
      ),
    ).toBe(false);
  });

  it("has explicit safety and one-step boundaries", () => {
    expect(diagnosticSystemPrompt).toContain("exactly ONE safe diagnostic check");
    expect(diagnosticSystemPrompt).toContain("Never bypass lockout/tagout");
    expect(diagnosticSystemPrompt).toContain("Never invent");
    expect(diagnosticSystemPrompt).toContain("numbered step that exist");
    expect(diagnosticSystemPrompt).toContain("professional PEvco-style");
    expect(diagnosticSystemPrompt).toContain("inside the Resovii web app");
    expect(diagnosticSystemPrompt).toContain("Do not claim to be the official ChatGPT app");
  });

  it("keeps realtime voice natural while preserving reviewed tool output", () => {
    expect(realtimeDiagnosticInstructions).toContain("live ChatGPT voice experience");
    expect(realtimeDiagnosticInstructions).toContain("Make the technician feel capable");
    expect(realtimeDiagnosticInstructions).toContain("preserve the exact technical instruction");
    expect(realtimeDiagnosticInstructions).toContain("Do not add extra checks");
  });
});
