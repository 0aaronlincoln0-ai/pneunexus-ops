import { describe, expect, it } from "vitest";
import { searchTroubleshootingGuides, troubleshootingGuides } from "./troubleshooting";

describe("troubleshooting knowledge model", () => {
  it("uses unique protocol identifiers", () => {
    const ids = troubleshootingGuides.map((guide) => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires safety, verification, and escalation boundaries", () => {
    for (const guide of troubleshootingGuides) {
      expect(guide.safety.length).toBeGreaterThan(0);
      expect(guide.steps.length).toBeGreaterThan(2);
      expect(guide.verification.length).toBeGreaterThan(0);
      expect(guide.escalateWhen.length).toBeGreaterThan(0);
    }
  });

  it("finds protocols by fault, symptom, and category", () => {
    expect(searchTroubleshootingGuides("carrier missing", "All")[0]?.id).toBe("missing-carrier");
    expect(searchTroubleshootingGuides("ping", "Controls & network")[0]?.id).toBe(
      "station-communications",
    );
    expect(searchTroubleshootingGuides("", "Safety & contamination")).toHaveLength(1);
  });
});
