import { expect, test } from "@playwright/test";

test("public route opens the field guide without facility details", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => message.type() === "error" && runtimeErrors.push(message.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What do you need to do?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administrator" })).toBeVisible();
  await expect(page.getByText("Example facility")).toHaveCount(0);
  await expect(page.getByText(/10\.42\./)).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test("administrator route requires sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Maintenance guide" })).toBeVisible();
  await expect(page.getByLabel("Username or email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /open maintenance guide/i })).toBeVisible();
});
