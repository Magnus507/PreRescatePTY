import { test, expect } from "@playwright/test";

test.describe("Block 4 browser foundation", () => {
  test("public emergency profile renders in a real browser", async ({ page }, testInfo) => {
    await page.goto("/e/DEMO-ADMIN-VIP");
    await expect(page.getByText(/Carlos/).first()).toBeVisible();
    await expect(page.getByText(/Perfil de emergencia/i).first()).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("public-emergency-profile.png"),
      fullPage: true,
    });
  });

  test("unauthenticated admin access is redirected to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel(/Correo electrónico/i)).toBeVisible();
  });

  test("seeded superadmin signs in through the UI and reaches admin dashboard", async ({ page }, testInfo) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD are required");
    }

    await page.goto("/login");
    await page.getByLabel(/Correo electrónico/i).fill(email);
    await page.getByLabel(/Contraseña/i).fill(password);

    await Promise.all([
      page.waitForURL(/\/admin(?:$|\?)/, { timeout: 30_000 }),
      page.getByRole("button", { name: /Iniciar sesión seguro/i }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("admin-dashboard.png"),
      fullPage: true,
    });
  });
});
