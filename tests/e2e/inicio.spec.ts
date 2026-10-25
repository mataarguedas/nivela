import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./sesion";

test("Inicio muestra Nivela en es-CR sin desplazamiento horizontal", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/");

  await expect(page).toHaveTitle("Nivela");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CR");
  await expect(page.getByRole("heading", { level: 1, name: "Nivela" })).toBeVisible();

  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
});
