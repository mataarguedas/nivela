import { expect, test, type Page } from "@playwright/test";
import { codigo, iniciarSesion, type Rol } from "./sesion";

// Access gate (PRD §5.1, FR-1): codes, roles, redirects and the nav's "Salir".

const ETIQUETA = "Ingrese el código de acceso de su clase";

async function ingresar(page: Page, valor: string) {
  await page.getByLabel(ETIQUETA).fill(valor);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function ingresarComo(page: Page, rol: Rol) {
  await ingresar(page, codigo(rol));
}

function nav(page: Page) {
  return page.getByRole("navigation", { name: "Navegación principal" });
}

test("sin sesión, Inicio redirige a /acceso", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nivela" })).toBeVisible();
  await expect(page.getByLabel(ETIQUETA)).toBeVisible();
  await expect(nav(page).getByRole("button", { name: "Salir" })).toHaveCount(0);
});

test("un código incorrecto muestra el error y no da acceso", async ({ page }) => {
  await page.goto("/acceso");
  await ingresar(page, "codigo-incorrecto");
  await expect(page.getByText("El código no es válido. Verifique con su docente.")).toBeVisible();
  await expect(page).toHaveURL(/\/acceso$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/acceso$/);
});

test("el código de clase entra como evaluador", async ({ page }) => {
  await page.goto("/");
  await ingresarComo(page, "evaluador");
  await expect(page).toHaveURL(/\/$/);
  await expect(nav(page).getByRole("button", { name: "Salir" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Reportes" })).toHaveCount(0);
});

test("el evaluador no puede abrir /reportes", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  await page.goto("/reportes");
  await expect(page).toHaveURL(/\/acceso\?/);
  await expect(page.getByRole("status").filter({ hasText: "Esta sección requiere el código docente." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reportes" })).toHaveCount(0);

  const api = await page.request.get("/api/reportes/adaptabilidad");
  expect(api.status()).toBe(403);
  expect(await api.json()).toEqual({ error: expect.any(String) });
});

test("el código docente llega a /reportes", async ({ page }) => {
  await page.goto("/reportes");
  await expect(page).toHaveURL(/\/acceso\?next=%2Freportes$/);
  await ingresarComo(page, "docente");
  await expect(page).toHaveURL(/\/reportes$/);
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Reportes" })).toBeVisible();
});

test("el evaluador puede pasar a docente desde el aviso", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  await page.goto("/reportes");
  await ingresarComo(page, "docente");
  await expect(page).toHaveURL(/\/reportes$/);
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
});

test("Salir cierra la sesión sin mostrar el aviso de expiración", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/");
  await nav(page).getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/acceso$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByText("Su sesión expiró. Ingrese el código nuevamente.")).toHaveCount(0);
});

test("una sesión expirada muestra el aviso", async ({ page, context }) => {
  await iniciarSesion(page);
  // The browser drops the cookie when its 12 h max-age ends.
  await context.clearCookies({ name: "nivela_sesion" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/acceso\?motivo=expirada$/);
  await expect(page.getByRole("status").filter({ hasText: "Su sesión expiró. Ingrese el código nuevamente." })).toBeVisible();
});

test("la API responde 401 JSON sin sesión", async ({ request }) => {
  const respuesta = await request.post("/api/jev", { data: {} });
  expect(respuesta.status()).toBe(401);
  expect(await respuesta.json()).toEqual({ error: expect.any(String) });
});

test("la cookie de sesión es httpOnly, SameSite=Lax y dura 12 h", async ({ request }) => {
  // Read the Set-Cookie header: Playwright's WebKit on Windows reports every
  // cookie as SameSite=None in its cookie jar.
  const respuesta = await request.post("/api/acceso", { data: { codigo: codigo("evaluador") } });
  const cookie = respuesta
    .headersArray()
    .find((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("nivela_sesion="))?.value;
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/SameSite=Lax/i);
  expect(cookie).toMatch(/Max-Age=43200/);
  expect(cookie).toMatch(/Path=\//);
});

test("el código nunca aparece en la URL", async ({ page }) => {
  await page.goto("/acceso");
  await ingresar(page, "codigo-incorrecto");
  await expect(page.getByText("El código no es válido. Verifique con su docente.")).toBeVisible();
  expect(page.url()).not.toContain("codigo");
});

test("ignora un next externo y vuelve a Inicio", async ({ page }) => {
  await page.goto("/acceso?next=https%3A%2F%2Fejemplo.com%2F");
  await ingresarComo(page, "evaluador");
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
});

test("/acceso cabe en 375 px sin zoom en iOS", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/acceso");
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
  const tamano = await page.getByLabel(ETIQUETA).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(tamano).toBeGreaterThanOrEqual(16);
  const alto = await page.getByRole("button", { name: "Entrar" }).evaluate((el) => el.getBoundingClientRect().height);
  expect(alto).toBeGreaterThanOrEqual(44);
});
