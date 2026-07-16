import { expect, test } from "@playwright/test";

test("authenticated troubleshooting workspace fits phone and tablet viewports", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Username or email").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: /enter command center/i }).click();
  await page.goto("/troubleshoot");

  await expect(page.getByRole("heading", { name: "Guided Voice Assistant" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Type a message to Voice Assist" })).toBeVisible();

  const viewport = page.viewportSize();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  if (viewport && viewport.width < 1280) {
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  }

  const tapToTalk = page.getByRole("button", { name: "Tap to speak" });
  const tapToTalkBox = await tapToTalk.boundingBox();
  expect(tapToTalkBox?.height).toBeGreaterThanOrEqual(44);
  expect(tapToTalkBox?.width).toBeGreaterThanOrEqual(44);

  if (viewport && viewport.width < 640) {
    const inputFontSize = await page
      .getByRole("textbox", { name: "Type a message to Voice Assist" })
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(inputFontSize).toBeGreaterThanOrEqual(16);
  }
});
