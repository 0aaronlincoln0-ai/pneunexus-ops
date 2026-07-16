import { describe, expect, it } from "vitest";
import {
  rankTroubleshootingGuides,
  searchTroubleshootingGuides,
  troubleshootingGuides,
} from "./troubleshooting";

describe("troubleshooting knowledge model", () => {
  it("uses unique protocol identifiers", () => {
    const ids = troubleshootingGuides.map((guide) => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires safety, verification, and escalation boundaries", () => {
    for (const guide of troubleshootingGuides) {
      expect(guide.sourceSection.trim().length).toBeGreaterThan(0);
      expect(guide.faultNames.length).toBeGreaterThan(0);
      expect(guide.symptoms.length).toBeGreaterThan(0);
      expect(guide.likelyCauses.length).toBeGreaterThan(0);
      expect(guide.tools.length).toBeGreaterThan(0);
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

  it("lets a clear symptom override the protocol that happened to be selected", () => {
    expect(
      rankTroubleshootingGuides("A carrier is missing", "station-position-failure")[0]?.id,
    ).toBe("missing-carrier");
    expect(rankTroubleshootingGuides("Airflow feels weak", "station-position-failure")[0]?.id).toBe(
      "blower-position-airflow",
    );
  });
});
