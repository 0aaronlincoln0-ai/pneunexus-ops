import { beforeEach, describe, expect, it } from "vitest";
import { getBootstrap, getSession, login, logout, registerAccount } from "./api";

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
});
