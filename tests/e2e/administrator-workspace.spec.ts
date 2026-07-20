import { expect, test } from "@playwright/test";

test("administrator workspace and service history stay usable on phone and tablet", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Username or email").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: /open maintenance guide/i }).click();

  await expect(page.getByRole("heading", { name: "Administrator workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administrator" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Service history" })).toHaveCount(1);
  await expect(page.getByLabel("Service call title")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add photos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add videos" })).toBeVisible();
  await page.getByLabel("Service call title").fill("Carrier arrival delay");
  await page.getByLabel("Observed problem").fill("Carrier paused before the receiving station.");
  await page
    .getByLabel("Resolution and verification")
    .fill("Reset the carrier sensor and verified three successful arrivals.");
  await page
    .getByLabel("Attached field instructions")
    .fill("Run three approved empty-carrier tests before closeout.");
  await page.getByRole("button", { name: "Save service resolution" }).click();
  await expect(page.getByRole("dialog", { name: "Carrier arrival delay" })).toBeVisible();
  await expect(page.getByText("Attached field instructions")).toBeVisible();
  await expect(
    page.getByText("Run three approved empty-carrier tests before closeout."),
  ).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  const viewport = page.viewportSize();
  if (viewport && viewport.width < 1280) {
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  }
});
