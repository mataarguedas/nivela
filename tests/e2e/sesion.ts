import { expect, type Page } from "@playwright/test";

// Shared e2e helpers for the access gate. Codes come from the env files that
// playwright.config.ts loads (the same ones the dev server reads).

export type Rol = "evaluador" | "docente" | "admin";
/** The roles plus the night class code (jornada "noche", PRD §5.11). */
export type Codigo = Rol | "evaluadorNoche";

const VARIABLE: Record<Codigo, string> = {
  evaluador: "CODIGO_ACCESO",
  evaluadorNoche: "CODIGO_ACCESO_NOCHE",
  docente: "CODIGO_DOCENTE",
  admin: "CODIGO_ADMIN",
};

export function codigo(rol: Codigo): string {
  const nombre = VARIABLE[rol];
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} is not set: add it to .env.local (see .env.example)`);
  return valor;
}

/** Signs in through the API; the cookie lands in the page's browser context. */
export async function iniciarSesion(page: Page, rol: Codigo = "evaluador") {
  const respuesta = await page.request.post("/api/acceso", { data: { codigo: codigo(rol) } });
  expect(respuesta.status()).toBe(200);
}
