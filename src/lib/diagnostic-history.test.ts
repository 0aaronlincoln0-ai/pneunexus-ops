import { beforeEach, describe, expect, it } from "vitest";
import { diagnosticHistoryTitle, loadDiagnosticHistory, upsertDiagnosticHistory } from "./diagnostic-history";

describe("diagnostic conversation history", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the most recent version of a diagnostic conversation", () => {
    upsertDiagnosticHistory({
      id: "case-1",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:01:00.000Z",
      title: "Station will not send",
      messages: [{ role: "user", text: "Station will not send" }],
    });
    upsertDiagnosticHistory({
      id: "case-1",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:02:00.000Z",
      title: "Station will not send",
      messages: [
        { role: "user", text: "Station will not send" },
        { role: "assistant", text: "Check the station state." },
      ],
    });

    expect(loadDiagnosticHistory()).toEqual([
      {
        id: "case-1",
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:02:00.000Z",
        title: "Station will not send",
        messages: [
          { role: "user", text: "Station will not send" },
          { role: "assistant", text: "Check the station state." },
        ],
      },
    ]);
  });

  it("uses the first technician report as a readable case title", () => {
    expect(diagnosticHistoryTitle([{ role: "user", text: "  Carrier is missing at receiving  " }])).toBe(
      "Carrier is missing at receiving",
    );
  });
});
