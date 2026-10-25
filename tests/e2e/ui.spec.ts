import { expect, test, type Page } from "@playwright/test";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// The /dev/ui showcase exercises every UI kit component in a real browser,
// covering the CLAUDE.md mobile checklist at 375 × 667.
test.use({ viewport: { width: 375, height: 667 } });

async function abrirMuestrario(page: Page) {
  await iniciarSesion(page);
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { level: 1, name: "Componentes" })).toBeVisible();
  await esperarHidratacion(page);
}

test("sin desplazamiento horizontal ni sombras", async ({ page }) => {
  await abrirMuestrario(page);
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);

  const conSombra = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*"))
      .filter((el) => getComputedStyle(el).boxShadow !== "none")
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(conSombra).toEqual([]);
});

test("objetivos táctiles de al menos 44 px y campos de 16 px o más", async ({ page }) => {
  await abrirMuestrario(page);
  const pequenos = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("button, a, [role='radio']"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ texto: el.textContent?.trim().slice(0, 30), caja: el.getBoundingClientRect() }))
      .filter(({ caja }) => caja.height < 44 || caja.width < 44)
      .map(({ texto, caja }) => `${texto} (${Math.round(caja.width)}×${Math.round(caja.height)})`),
  );
  expect(pequenos).toEqual([]);

  const tamanos = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, textarea")).map((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  expect(tamanos.length).toBeGreaterThan(0);
  for (const tamano of tamanos) expect(tamano).toBeGreaterThanOrEqual(16);
});

test("la navegación es esmerilada con backdrop-filter", async ({ page }) => {
  await abrirMuestrario(page);
  const filtro = await page
    .locator("header")
    .first()
    .evaluate((el) => {
      const estilo = getComputedStyle(el) as CSSStyleDeclaration & { webkitBackdropFilter?: string };
      return estilo.backdropFilter || estilo.webkitBackdropFilter || "";
    });
  expect(filtro).toContain("blur(20px)");
});

test("SelectorNivel funciona con teclado y habilita la barra de envío", async ({ page }) => {
  await abrirMuestrario(page);
  const seccion = page.getByRole("region", { name: "SelectorNivel" });
  const grupo = seccion.getByRole("radiogroup", { name: /Indicador 1\./ });
  const barra = page.getByRole("region", { name: "Envío" });

  await expect(barra.getByText("Falta 1 indicador por calificar")).toBeVisible();

  await grupo.getByRole("radio", { name: "Básico" }).focus();
  await page.keyboard.press("Space");
  await expect(grupo.getByRole("radio", { name: "Básico" })).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("ArrowDown");
  const intermedio = grupo.getByRole("radio", { name: "Intermedio" });
  await expect(intermedio).toHaveAttribute("aria-checked", "true");
  await expect(intermedio).toBeFocused();

  await expect(barra.getByRole("button", { name: "Enviar evaluación" })).toBeVisible();
});

test("Dialogo atrapa el foco, cierra con Escape y devuelve el foco", async ({ page }) => {
  await abrirMuestrario(page);
  const seccion = page.getByRole("region", { name: "Dialogo y Toast" });
  const disparador = seccion.getByRole("button", { name: "Borrar todo" });
  await disparador.click();

  const dialogo = page.getByRole("dialog", { name: "Borrar todo" });
  await expect(dialogo).toBeVisible();
  const cancelar = dialogo.getByRole("button", { name: "Cancelar" });
  const confirmar = dialogo.getByRole("button", { name: "Borrar todo" });
  await expect(cancelar).toBeFocused();

  await confirmar.focus();
  await page.keyboard.press("Tab");
  await expect(cancelar).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirmar).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
  await expect(disparador).toBeFocused();
});

test("Toast se anuncia y desaparece", async ({ page }) => {
  await abrirMuestrario(page);
  await page.getByRole("button", { name: "Mostrar aviso" }).click();
  const aviso = page.getByRole("status").filter({ hasText: "Evaluación enviada" });
  await expect(aviso).toBeVisible();
  await expect(aviso).toBeHidden({ timeout: 6000 });
});
