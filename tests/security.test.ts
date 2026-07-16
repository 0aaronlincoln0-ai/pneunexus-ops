import { describe, expect, it } from "vitest";
import { capabilities, hasCapability, requireCapability } from "../server/security/capabilities";
import { escapeCsvCell, rowsToCsv } from "../server/security/csv";
import { detectProhibitedContent } from "../server/security/validation";
import { canTransitionWorkOrder } from "../server/security/work-order-state";

describe("server capabilities", () => {
  it("denies capabilities that were not explicitly granted", () => {
    const technician = new Set([capabilities.deviceRead, capabilities.workOrderWrite]);
    expect(hasCapability(technician, capabilities.userManage)).toBe(false);
    expect(() => requireCapability(technician, capabilities.userManage)).toThrow("Access denied");
  });

  it("does not let a read-only grant mutate records", () => {
    const readOnly = new Set([
      capabilities.dashboardRead,
      capabilities.facilityRead,
      capabilities.deviceRead,
    ]);
    expect(() => requireCapability(readOnly, capabilities.deviceWrite)).toThrow("Access denied");
  });
});

describe("work-order state machine", () => {
  it("accepts an approved transition", () =>
    expect(canTransitionWorkOrder("assigned", "in_progress")).toBe(true));
  it("rejects invalid transitions", () => {
    expect(canTransitionWorkOrder("new", "closed")).toBe(false);
    expect(canTransitionWorkOrder("closed", "in_progress")).toBe(false);
  });
});

describe("CSV export hardening", () => {
  it.each(["=2+2", "+cmd", "-1+1", "@SUM(A1:A2)", "\tformula", "\rformula"])(
    "neutralizes dangerous cell %j",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`"'${value}"`);
    },
  );
  it("quotes embedded delimiters and quotes", () =>
    expect(rowsToCsv([{ name: 'a,"b' }])).toContain('"a,""b"'));
});

describe("prohibited-content detector", () => {
  it("flags likely MRNs and dates of birth", () => {
    expect(detectProhibitedContent("MRN: A123456")).toContain("possible medical record number");
    expect(detectProhibitedContent("DOB 04/12/1982")).toContain("possible date of birth");
  });
  it("does not claim ordinary equipment text is prohibited", () =>
    expect(detectProhibitedContent("Blower panel B-14")).toEqual([]));
});
