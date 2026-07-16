import { expect, test } from "@playwright/test";

test("public route shows invite-only login without facility details", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => message.type() === "error" && runtimeErrors.push(message.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("No PHI.", { exact: true })).toBeVisible();
  await expect(page.getByText("Harbor Medical Campus")).toHaveCount(0);
  await expect(page.getByText(/10\.42\./)).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test("login form has accessible names and large controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Username or email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /enter command center/i })).toBeVisible();
});
