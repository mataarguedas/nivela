import { expect, type Page } from "@playwright/test";
import { contrasenaDePrueba, correoDePrueba } from "./cuentas";

// Shared e2e helpers for the access gate. Docente and admin sign in with
// their codes, read from the env files that playwright.config.ts loads (the
// same ones the dev server reads). Evaluadores sign in with a fake account
// (`<integranteId>@ejemplo.test` + E2E_CONTRASENA, see cuentas.ts), since
// v1.2 retired the class codes (PRD §5.1, §5.12).

export type Rol = "evaluador" | "docente" | "admin";

/** Who to sign in as: a role, or a specific evaluador. */
export type Quien = Rol | { integranteId: string };

/**
 * The evaluador used when a spec only needs "an evaluator": a morning
 * Adaptabilidad member. Specs that rate in parallel use their own members.
 */
export const EVALUADOR_PREDETERMINADO = "jimena-salgado";

const VARIABLE: Record<Exclude<Rol, "evaluador">, string> = {
  docente: "CODIGO_DOCENTE",
  admin: "CODIGO_ADMIN",
};

export function codigo(rol: Exclude<Rol, "evaluador">): string {
  const nombre = VARIABLE[rol];
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} is not set: add it to .env.local (see .env.example)`);
  return valor;
}

/** Signs in through the API; the cookie lands in the page's browser context. */
export async function iniciarSesion(page: Page, quien: Quien = "evaluador") {
  if (quien === "docente" || quien === "admin") {
    const respuesta = await page.request.post("/api/acceso", { data: { codigo: codigo(quien) } });
    expect(respuesta.status()).toBe(200);
    return;
  }
  const integranteId = quien === "evaluador" ? EVALUADOR_PREDETERMINADO : quien.integranteId;
  const respuesta = await page.request.post("/api/acceso/contrasena", {
    data: { correo: correoDePrueba(integranteId), contrasena: contrasenaDePrueba() },
  });
  expect(respuesta.status(), `sign-in as ${integranteId} (run npm run cuentas:prueba?)`).toBe(200);
}
