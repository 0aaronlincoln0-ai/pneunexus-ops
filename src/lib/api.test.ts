import { beforeEach, describe, expect, it } from "vitest";
import {
  createServiceMemoryRecord,
  getBootstrap,
  getServiceMemoryRecords,
  getSession,
  login,
  logout,
  registerAccount,
} from "./api";

describe("local development administrator", () => {
  beforeEach(() => localStorage.clear());

  it("rejects incorrect credentials", async () => {
    await expect(login("admin", "incorrect")).rejects.toThrow("Username or password is incorrect");
  });

  it("creates and clears an administrator session", async () => {
    expect(await getSession()).toBeNull();
    await login("admin", "admin");
    expect((await getSession())?.user.role).toBe("organization_admin");
    const workspace = await getBootstrap();
    expect(workspace.metrics.devices).toBe(0);
    expect(workspace.demo).toBe(false);
    await logout("local-development");
    expect(await getSession()).toBeNull();
  });

  it("creates a local workspace session from account setup", async () => {
    const session = await registerAccount({
      organizationName: "Field Engineering",
      displayName: "Avery Technician",
      email: "avery@example.com",
      password: "safe-password-123",
      plan: "lifetime",
    });
    expect(session.user.role).toBe("organization_admin");
    expect((await getBootstrap()).devices).toEqual([]);
  });

  it("keeps service memory usable in local demo mode", async () => {
    const { record } = await createServiceMemoryRecord(
      {
        title: "Station full bin",
        equipment: "STA-224",
        location: "Lab receiving",
        symptom: "Full bin alarm remained active.",
        resolution: "Cleared debris and verified the sensor changed state.",
        followUp: "Monitor next shift.",
        instructions: ["Verify one self-send before closeout."],
        status: "resolved",
        photos: [{ name: "sensor.jpg", dataUrl: "data:image/jpeg;base64,AAAA" }],
      },
      "local-development",
    );

    expect(record.photos[0]?.dataUrl).toBe("data:image/jpeg;base64,AAAA");
    expect((await getServiceMemoryRecords()).records[0]?.title).toBe("Station full bin");
  });
});
