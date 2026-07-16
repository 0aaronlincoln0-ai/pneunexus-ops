import { describe, expect, it } from "vitest";
import { titleCase } from "./utils";

describe("titleCase", () => {
  it("formats server enum values for display", () =>
    expect(titleCase("waiting_for_parts")).toBe("Waiting For Parts"));
});
