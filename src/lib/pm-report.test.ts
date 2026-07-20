import { describe, expect, it } from "vitest";
import { getMaintenanceTemplate } from "./maintenance";
import { createPmReport } from "./pm-report";

describe("PM report", () => {
  it("includes the inspection log and follow-up detail for a supervisor", () => {
    const report = createPmReport({
      template: getMaintenanceTemplate("station"),
      equipmentId: "STA-014",
      location: "North wing receiving",
      technician: "Jordan Lee",
      workOrder: "WO-2041",
      safetyConfirmed: true,
      completed: [0, 1],
      findings: { 0: "pass", 1: "attention" },
      notes: { 1: "Dispatch arm has wear at the pivot." },
      generatedAt: new Date("2026-07-19T13:30:00Z"),
    });

    expect(report.subject).toContain("STA-014");
    expect(report.subject).toContain("FOLLOW-UP REQUIRED");
    expect(report.body).toContain("Work order / reference: WO-2041");
    expect(report.body).toContain("Dispatch arm has wear at the pivot.");
    expect(report.body).toContain("OPEN FINDINGS AND REQUIRED FOLLOW-UP");
    expect(report.attentionCount).toBe(1);
  });
});
