import { beforeEach, describe, expect, it } from "vitest";
import { getBootstrap, getSession, login, logout } from "./api";

describe("local development administrator", () => {
  beforeEach(() => localStorage.clear());

  it("rejects incorrect credentials", async () => {
    await expect(login("admin", "incorrect")).rejects.toThrow("Username or password is incorrect");
  });

  it("creates and clears an administrator session", async () => {
    expect(await getSession()).toBeNull();
    await login("admin", "admin");
    expect((await getSession())?.user.role).toBe("organization_admin");
    expect((await getBootstrap()).metrics.devices).toBeGreaterThan(0);
    await logout("local-development");
    expect(await getSession()).toBeNull();
  });
});
