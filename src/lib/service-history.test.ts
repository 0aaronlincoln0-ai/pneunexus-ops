import { beforeEach, describe, expect, it } from "vitest";
import { findServiceKnowledge, saveServiceHistory } from "./service-history";

describe("service knowledge", () => {
  beforeEach(() => localStorage.clear());

  it("returns a relevant administrator resolution without exposing photo data", () => {
    saveServiceHistory([
      {
        id: "case-1",
        createdAt: "2026-07-19T00:00:00.000Z",
        reportedBy: "Administrator",
        title: "Carrier arrival delay",
        equipment: "S10",
        location: "Receiving",
        symptom: "Carrier pauses at the station.",
        resolution: "Reset the sensor and verify three arrivals.",
        followUp: "Monitor the next shift.",
        status: "resolved",
        photos: [{ name: "sensor.jpg", dataUrl: "data:image/jpeg;base64,example" }],
      },
    ]);

    expect(findServiceKnowledge("carrier delayed at station")).toEqual([
      {
        id: "case-1",
        title: "Carrier arrival delay",
        equipment: "S10",
        location: "Receiving",
        resolution: "Reset the sensor and verify three arrivals.",
        status: "resolved",
      },
    ]);
  });
});
