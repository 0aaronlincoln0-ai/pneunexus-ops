import { describe, expect, it } from "vitest";
import { parseTubeTrackerConfig } from "./tube-tracker-import";

describe("Tube Tracker config import", () => {
  it("maps devices, zones, and duplicate source IDs into usable app records", () => {
    const preview = parseTubeTrackerConfig({
      _version: "1.0",
      _tool: "Tube Tracker",
      project: { name: "customer-system", hospital: "", systype: "Pneumatic Tube" },
      zones: ["A"],
      floors: [],
      devices: [
        { id: "S10", name: "Station 10", type: "Station", zone: "A", status: "Online" },
        { id: "D20", name: "Diverter 20", type: "Diverter", zone: "B", status: "Online" },
        { id: "D20", name: "Diverter 20 alternate", type: "Diverter", zone: "A", status: "Online" },
      ],
    });

    expect(preview.data.devices).toHaveLength(3);
    expect(preview.data.devices.map((device) => device.assetTag)).toEqual(["S10", "D20", "D20-2"]);
    expect(preview.data.zones.map((zone) => zone.name)).toEqual(["A", "B"]);
    expect(preview.warnings.join(" ")).toContain("Duplicate source ID");
    expect(preview.warnings.join(" ")).toContain("undeclared zone");
  });

  it("rejects a JSON export from another tool", () => {
    expect(() =>
      parseTubeTrackerConfig({
        _version: "1.0",
        _tool: "Different Tool",
        project: { name: "customer-system" },
        devices: [],
      }),
    ).toThrow();
  });
});
