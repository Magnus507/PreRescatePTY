import { test, expect } from "@playwright/test";

const E2E_ADMIN_EMAIL = "block4-e2e-admin@example.test";
const E2E_ADMIN_PASSWORD = "Block4-E2E-Only-Password-2026!";
const E2E_CUSTOMER_EMAIL = "block4-e2e-customer@example.test";
const E2E_CUSTOMER_PASSWORD = "Block4-E2E-Customer-Only-2026!";

async function dismissCookieConsent(page) {
  const consent = page.getByRole("region", { name: /Consentimiento de cookies/i });
  if (await consent.isVisible().catch(() => false)) {
    await consent.getByRole("button", { name: /Solo necesarias/i }).click();
    await expect(consent).toBeHidden();
  }
}

test.describe("Block 4 browser foundation", () => {
  test("public emergency profile renders through the real rescue flow", async ({ page }, testInfo) => {
    await page.goto("/e/DEMO-ADMIN-VIP");
    await dismissCookieConsent(page);

    // The public route intentionally starts at the responder role selector and
    // does not expose patient identity until the responder chooses a view.
    await expect(page.getByRole("heading", { name: /PRE RESCUE ID/i })).toBeVisible();
    await page.getByRole("button", { name: /Soy ciudadano/i }).click();

    await expect(page.getByRole("heading", { name: /Carlos/i }).first()).toBeVisible();
    await expect(page.getByText(/Ficha de Emergencia/i).first()).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("public-emergency-profile.png"),
      fullPage: true,
    });
  });

  test("unauthenticated admin access is redirected to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await dismissCookieConsent(page);
    await expect(page.getByLabel(/Correo electrónico/i)).toBeVisible();
  });

  test("mobile Drops page is organized into touch-friendly sections", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Mobile-only Drops layout check.");

    await page.goto("/login");
    await dismissCookieConsent(page);
    await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
    await page.getByLabel(/Correo electrónico/i).fill(E2E_CUSTOMER_EMAIL);
    await page.getByLabel(/Contraseña/i).fill(E2E_CUSTOMER_PASSWORD);
    await page.getByRole("button", { name: /Iniciar sesión seguro/i }).click();
    await page.waitForURL(/\/dashboard(?:$|\?)/, { timeout: 45_000 });

    await page.goto("/dashboard/drops");
    await expect(page.getByText("Pre-Rescate Drops").first()).toBeVisible();

    const sectionNav = page.getByRole("navigation", { name: "Secciones de Drops" });
    await expect(sectionNav).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "Drops" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "Rewards" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "Actividad" })).toBeVisible();

    await sectionNav.getByRole("button", { name: "Rewards" }).click();
    await expect(page.getByRole("heading", { name: /Tu progreso dentro de la comunidad/i })).toBeVisible();

    await sectionNav.getByRole("button", { name: "Actividad" }).click();
    await expect(page.getByRole("heading", { name: /Historial de Drop Passes/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Bonus Entries/i })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("mobile-drops-organized.png"),
      fullPage: true,
    });
  });

  test("seeded superadmin signs in through the UI and reaches admin dashboard", async ({ page }, testInfo) => {
    await page.goto("/login");
    await dismissCookieConsent(page);
    await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
    await page.getByLabel(/Correo electrónico/i).fill(E2E_ADMIN_EMAIL);
    await page.getByLabel(/Contraseña/i).fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: /Iniciar sesión seguro/i }).click();

    const success = page.getByText(/Autenticación exitosa/i);
    const authError = page.locator("form").getByText(/Credenciales inválidas|No pudimos iniciar sesión|servidor tardó demasiado|MFA/i);

    await Promise.race([
      page.waitForURL(/\/admin(?:$|\?)/, { timeout: 45_000 }),
      success.waitFor({ state: "visible", timeout: 20_000 }),
      authError.waitFor({ state: "visible", timeout: 20_000 }),
    ]).catch(() => {});

    if (await authError.isVisible().catch(() => false)) {
      throw new Error(`Admin UI authentication failed: ${await authError.innerText()}`);
    }

    if (!/\/admin(?:$|\?)/.test(page.url())) {
      await page.waitForURL(/\/admin(?:$|\?)/, { timeout: 30_000 });
    }

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("admin-dashboard.png"),
      fullPage: true,
    });
  });
});
