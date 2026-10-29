import { expect, test } from "@playwright/test";

test("landing page renders HerdBook", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "HerdBook", level: 1 }),
  ).toBeVisible();
});
