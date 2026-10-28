import { expect, test, type Page } from "@playwright/test";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// PWA files, security headers, CSP and the offline banner (PRD §13, FR-15).
// The service worker itself only registers in production builds; its
// caching rules are unit-tested in tests/unit/pwa.test.ts.

test.describe("archivos de la PWA sin sesión", () => {
  test("el manifest, sw.js y los íconos se sirven sin redirigir a /acceso", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest", { maxRedirects: 0 });
    expect(manifest.status()).toBe(200);
    expect(await manifest.json()).toMatchObject({ name: "Nivela", lang: "es-CR", display: "standalone" });

    const sw = await request.get("/sw.js", { maxRedirects: 0 });
    expect(sw.status()).toBe(200);
    expect(sw.headers()["cache-control"]).toContain("no-cache");

    for (const icono of ["icono-192.png", "icono-512.png", "icono-maskable-512.png", "apple-touch-icon.png", "icono.svg"]) {
      const respuesta = await request.get(`/icons/${icono}`, { maxRedirects: 0 });
      expect(respuesta.status(), icono).toBe(200);
    }
  });
});

test("las páginas y la API llevan los encabezados de seguridad", async ({ request }) => {
  for (const ruta of ["/acceso", "/api/evaluaciones"]) {
    const respuesta = await request.get(ruta, { maxRedirects: 0 });
    const h = respuesta.headers();
    expect(h["content-security-policy"], ruta).toContain("default-src 'self'");
    expect(h["content-security-policy"], ruta).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"], ruta).not.toMatch(/typesafe/i);
    expect(h["x-content-type-options"], ruta).toBe("nosniff");
    expect(h["referrer-policy"], ruta).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"], ruta).toBe("camera=(), microphone=(), geolocation=()");
  }
});

test("el <head> declara el manifest, el ícono de iOS y el modo app", async ({ page }) => {
  await page.goto("/acceso");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  await expect(page.locator('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]').first()).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Nivela");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CR");
});

/** Records CSP violations from the first script on every page. */
async function registrarViolacionesCsp(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __violacionesCsp: string[] };
    w.__violacionesCsp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__violacionesCsp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
}

async function violacionesCsp(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __violacionesCsp: string[] }).__violacionesCsp);
}

test("la CSP no bloquea nada en el flujo ni en los reportes", async ({ page }) => {
  await registrarViolacionesCsp(page);
  await iniciarSesion(page, "docente");
  await sinEnviosEnServidor(page);
  for (const ruta of ["/", "/adaptabilidad/evaluador", "/adaptabilidad/P01", "/reportes/adaptabilidad"]) {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("nivela:v1:evaluador:adaptabilidad", "jimena-salgado"));
    await page.goto(ruta);
    await esperarHidratacion(page);
    if (ruta.startsWith("/reportes")) await expect(page.locator("figure svg.recharts-surface:visible").first()).toBeVisible();
    expect(await violacionesCsp(page), ruta).toEqual([]);
  }
});

test("el aviso sin conexión aparece y desaparece con la red", async ({ page, context }) => {
  await iniciarSesion(page);
  await sinEnviosEnServidor(page);
  await page.goto("/");
  await esperarHidratacion(page);
  const aviso = page.getByText("Sin conexión. Sus respuestas se guardan en este dispositivo.");
  await expect(aviso).toBeHidden();

  await context.setOffline(true);
  await expect(aviso).toBeVisible();
  await context.setOffline(false);
  await expect(aviso).toBeHidden();
});
