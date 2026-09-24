import { expect, test } from "@playwright/test";

test("malformed participant link shows a friendly not-found page", async ({ page }) => {
  await page.goto("/survey/1");
  await expect(page.getByRole("heading", { name: "Survey not found" })).toBeVisible();
});

test("unauthenticated admin access redirects to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("export endpoint rejects unauthenticated requests", async ({ request }) => {
  const res = await request.get("/api/export/00000000-0000-0000-0000-000000000000?format=csv");
  expect(res.status()).toBe(401);
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/admin/login");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
