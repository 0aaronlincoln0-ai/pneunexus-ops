import { describe, expect, it } from "vitest";
import { maintenanceTemplates } from "./maintenance";

describe("planned maintenance knowledge model", () => {
  it("covers the three supported device families", () => {
    expect(maintenanceTemplates.map(({ id }) => id)).toEqual(["station", "diverter", "blower"]);
  });

  it("requires safe, complete, verifiable PM workflows", () => {
    for (const template of maintenanceTemplates) {
      expect(template.safety.length).toBeGreaterThanOrEqual(4);
      expect(template.tools.length).toBeGreaterThanOrEqual(4);
      expect(template.steps).toHaveLength(6);
      expect(template.verification.length).toBeGreaterThanOrEqual(4);
      expect(template.escalation.length).toBeGreaterThanOrEqual(4);
      expect(template.source).toContain("Equipment PM procedure");
      for (const step of template.steps) {
        expect(step.instruction.length).toBeGreaterThan(40);
        expect(step.passCriteria.length).toBeGreaterThan(20);
        expect(step.ifFailed.length).toBeGreaterThan(20);
      }
    }
  });
});
