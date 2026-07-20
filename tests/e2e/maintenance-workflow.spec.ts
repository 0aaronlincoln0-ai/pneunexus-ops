import { expect, test } from "@playwright/test";

test("standalone planned maintenance workflow can be completed without a system connection", async ({
  page,
}) => {
  await page.goto("/maintenance");

  await expect(
    page.getByRole("heading", { name: "Complete a PM from start to finish" }),
  ).toBeVisible();
  await expect(page.getByText("No live system connection")).toHaveCount(0);
  await expect(page.getByText(/does not connect to Atlas or the tube system/i)).toBeVisible();

  await page.getByLabel("Equipment ID or tag").fill("STA-014");
  await page.getByLabel("Location").fill("North wing receiving");
  await page.getByRole("button", { name: /confirm and unlock checklist/i }).click();
  await page.getByRole("button", { name: "Pass" }).first().click();

  await expect(page.getByText("1 of 6 inspections recorded")).toBeVisible();
  await expect(page.getByRole("link", { name: /request service/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /call pevco/i })).toBeVisible();
});
