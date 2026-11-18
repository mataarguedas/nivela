import { expect, test, type Page } from "@playwright/test";
import { buscarIntegrante, equipoDeCompetencia } from "../../src/config/equipos";
import type { JornadaId } from "../../src/config/jornadas";
import {
  contrasenaDePrueba,
  correoDePrueba,
  CUENTA_OTRO_EQUIPO,
  cuentasDelProyecto,
  evaluadorAdaptabilidad,
} from "./cuentas";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Evaluator accounts (PRD §5.12): first activation with the emailed code,
// password sign-in, "¿Olvidó su contraseña?", lockout, identity from the
// account (no evaluator picker, own jornada only) and the 403 for writing as
// someone else. Codes are read from the dev "consola" outbox
// (/api/dev/correos), never a real inbox. The accounts are fake and reset by
// the global setup; each project uses its own (cuentasDelProyecto).

const CODIGO = /Su código de Nivela es (\d{6})\./;

function nav(page: Page) {
  return page.getByRole("navigation", { name: "Navegación principal" });
}

/** The newest code emailed to `correo` after `desde` (ms), polling the dev outbox. */
async function leerCodigo(page: Page, correo: string, desde: number): Promise<string> {
  let codigo = "";
  await expect
    .poll(
      async () => {
        const respuesta = await page.request.get(`/api/dev/correos?para=${encodeURIComponent(correo)}`);
        if (!respuesta.ok()) return false;
        const mensaje = (await respuesta.json()) as { texto: string; enviadoEn: string };
        if (new Date(mensaje.enviadoEn).getTime() < desde) return false;
        codigo = CODIGO.exec(mensaje.texto)?.[1] ?? "";
        return codigo !== "";
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return codigo;
}

async function escribirCorreo(page: Page, correo: string) {
  await page.goto("/acceso");
  await esperarHidratacion(page);
  await page.getByLabel("Correo electrónico").fill(correo);
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function crearContrasena(page: Page, codigo: string, contrasena: string) {
  await page.getByLabel("Código de verificación").fill(codigo);
  await page.getByLabel("Cree su contraseña").fill(contrasena);
  await page.getByLabel("Confirme su contraseña").fill(contrasena);
  await page.getByRole("button", { name: "Crear contraseña y entrar" }).click();
}

async function entrarConContrasena(page: Page, correo: string, contrasena: string) {
  await escribirCorreo(page, correo);
  await page.getByLabel("Contraseña").fill(contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("primera activación: código por correo, contraseña nueva, salir y volver a entrar", async ({ page }, info) => {
  const { activar } = cuentasDelProyecto(info.project.name);
  const correo = correoDePrueba(activar);
  const nueva = `Nueva-${Date.now()}`;

  const desde = Date.now();
  await escribirCorreo(page, correo);
  await expect(
    page.getByText(`Le enviamos un código de 6 dígitos a ${correo}. Revise también la carpeta de correo no deseado.`),
  ).toBeVisible();
  await expect(page.getByLabel("Código de verificación")).toHaveAttribute("autocomplete", "one-time-code");
  await expect(page.getByRole("button", { name: "Reenviar código" })).toBeDisabled();
  await expect(page.locator(".bg-primary")).toHaveCount(1);

  // Client-side checks first.
  await page.getByLabel("Código de verificación").fill("000000");
  await page.getByLabel("Cree su contraseña").fill("corta");
  await page.getByRole("button", { name: "Crear contraseña y entrar" }).click();
  await expect(page.getByLabel("Cree su contraseña")).toHaveAttribute("aria-invalid", "true");

  await crearContrasena(page, await leerCodigo(page, correo, desde), nueva);
  await expect(page).toHaveURL(/\/$/);
  // Their team's competencia isn't enabled yet.
  await expect(page.getByText("La competencia de su equipo aún no está disponible.")).toBeVisible();

  await nav(page).getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  await entrarConContrasena(page, correo, nueva);
  await expect(page).toHaveURL(/\/$/);
});

test("un correo fuera de la lista ve la misma pantalla del código y no recibe nada", async ({ page }) => {
  const correo = `nadie-${Date.now()}@ejemplo.test`;
  await escribirCorreo(page, correo);
  await expect(page.getByText(`Le enviamos un código de 6 dígitos a ${correo}.`, { exact: false })).toBeVisible();
  await page.waitForTimeout(500);
  expect((await page.request.get(`/api/dev/correos?para=${encodeURIComponent(correo)}`)).status()).toBe(404);
  await crearContrasena(page, "123456", "una-clave-larga");
  await expect(page.getByText("El código no es válido o expiró.")).toBeVisible();
});

test("«¿Olvidó su contraseña?» envía un código y permite crear otra contraseña", async ({ page }, info) => {
  const { recuperar } = cuentasDelProyecto(info.project.name);
  const correo = correoDePrueba(recuperar);
  const nueva = `Recuperada-${Date.now()}`;

  await escribirCorreo(page, correo);
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  const desde = Date.now();
  await page.getByRole("button", { name: "¿Olvidó su contraseña?" }).click();
  await crearContrasena(page, await leerCodigo(page, correo, desde), nueva);
  await expect(page).toHaveURL(/\/$/);

  await nav(page).getByRole("button", { name: "Salir" }).click();
  await entrarConContrasena(page, correo, contrasenaDePrueba());
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await page.getByLabel("Contraseña").fill(nueva);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("5 contraseñas incorrectas bloquean la cuenta 15 minutos", async ({ page }, info) => {
  const { bloquear } = cuentasDelProyecto(info.project.name);
  const correo = correoDePrueba(bloquear);
  for (let i = 0; i < 4; i++) {
    const respuesta = await page.request.post("/api/acceso/contrasena", { data: { correo, contrasena: "incorrecta" } });
    expect(respuesta.status()).toBe(401);
  }
  await entrarConContrasena(page, correo, "incorrecta");
  await expect(page.getByText("Demasiados intentos. Intente de nuevo en 15 minutos.")).toBeVisible();
  // Even the right password is refused while locked.
  await page.getByLabel("Contraseña").fill(contrasenaDePrueba());
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Demasiados intentos. Intente de nuevo en 15 minutos.")).toBeVisible();
  await expect(page).toHaveURL(/\/acceso/);
});

/** The participant list the docente sees for `jornada` while rating as `integranteId`. */
async function listaDelDocente(page: Page, jornada: JornadaId, integranteId: string): Promise<string[]> {
  await iniciarSesion(page, "docente");
  expect((await page.request.post("/api/jornada", { data: { jornada } })).status()).toBe(200);
  await page.goto("/");
  await page.evaluate((id) => localStorage.setItem("nivela:v1:evaluador:adaptabilidad", id), integranteId);
  await page.goto("/adaptabilidad");
  return etiquetas(page);
}

/** The participant labels in the list (without the status chips, which load later). */
async function etiquetas(page: Page): Promise<string[]> {
  const nombres = page.getByRole("main").getByRole("listitem").locator("a > span:first-child");
  await expect(nombres.first()).toBeVisible();
  return nombres.allInnerTexts();
}

for (const jornada of ["manana", "noche"] as const) {
  test(`${jornada}: el equipo de Adaptabilidad entra directo a su lista, sin elegir evaluador`, async ({ browser }) => {
    const integranteId = evaluadorAdaptabilidad(jornada);
    const { integrante } = buscarIntegrante(integranteId)!;
    const equipo = equipoDeCompetencia(jornada, "adaptabilidad")!;

    const docente = await browser.newContext();
    const esperada = await listaDelDocente(await docente.newPage(), jornada, integranteId);
    await docente.close();

    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await iniciarSesion(page, { integranteId });
    await sinEnviosEnServidor(page);
    await page.goto("/");
    await expect(page.getByText(jornada === "noche" ? "Jornada: Noche" : "Jornada: Mañana")).toBeVisible();
    const fila = page.getByRole("link", { name: /Adaptabilidad/ });
    await expect(fila).toHaveAttribute("href", "/adaptabilidad");
    await fila.click();
    await expect(page).toHaveURL(/\/adaptabilidad$/);

    // Their own jornada's participants, the same list the docente sees there.
    expect(await etiquetas(page)).toEqual(esperada);

    // Their name in the nav, as plain text: there is no picker to switch.
    await expect(nav(page).getByText(integrante.nombre)).toBeVisible();
    await expect(nav(page).getByRole("link", { name: new RegExp(integrante.nombre) })).toHaveCount(0);
    await page.goto("/adaptabilidad/evaluador");
    await expect(page).toHaveURL(/\/adaptabilidad$/);
    // The team is looked up by competencia; its number is just this jornada's label.
    expect(equipo.integrantes.some((i) => i.id === integranteId)).toBe(true);
    await contexto.close();
  });
}

test("un evaluador de otro equipo no puede abrir Adaptabilidad", async ({ page }) => {
  await iniciarSesion(page, { integranteId: CUENTA_OTRO_EQUIPO });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Adaptabilidad/ })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("link", { name: /Adaptabilidad/ }).getByText("No asignada")).toBeVisible();
  // Decided from the session behind Suspense: the not-found page streams in
  // after the shell, so the status can be 200 (see [competencia]/layout.tsx).
  await page.goto("/adaptabilidad");
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(0);
});

test("un evaluador no puede enviar ni consultar a nombre de otra persona (403)", async ({ page }) => {
  const propio = evaluadorAdaptabilidad("manana", 0);
  const otro = evaluadorAdaptabilidad("manana", 1);
  await iniciarSesion(page, { integranteId: propio });
  const cuerpo = {
    competenciaId: "adaptabilidad",
    evaluadorId: otro,
    participanteId: "P01",
    calificaciones: [1, 2, 3, 4].map((n) => ({ indicadorId: `adaptabilidad-${n}`, nivel: 2, origen: "manual" })),
  };
  const envio = await page.request.post("/api/evaluaciones", { data: cuerpo });
  expect(envio.status()).toBe(403);
  expect(await envio.json()).toEqual({ error: "Solo puede registrar evaluaciones a su nombre." });
  const consulta = await page.request.get(`/api/evaluaciones?competencia=adaptabilidad&evaluador=${otro}`);
  expect(consulta.status()).toBe(403);
});
