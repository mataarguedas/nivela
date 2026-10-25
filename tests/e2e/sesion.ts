import { expect, type Page } from "@playwright/test";

// Shared e2e helpers for the access gate. Codes come from the env files that
// playwright.config.ts loads (the same ones the dev server reads).

export type Rol = "evaluador" | "docente";

export function codigo(rol: Rol): string {
  const nombre = rol === "docente" ? "CODIGO_DOCENTE" : "CODIGO_ACCESO";
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} is not set: add it to .env.local (see .env.example)`);
  return valor;
}

/** Signs in through the API; the cookie lands in the page's browser context. */
export async function iniciarSesion(page: Page, rol: Rol = "evaluador") {
  const respuesta = await page.request.post("/api/acceso", { data: { codigo: codigo(rol) } });
  expect(respuesta.status()).toBe(200);
}
