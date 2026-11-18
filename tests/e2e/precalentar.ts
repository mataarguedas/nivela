import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import { codigo } from "./sesion";

// Global setup: request every route once, one at a time, before any test
// runs. `next dev` compiles a route on its first request, and in Next 16.4.3
// concurrent first requests to the same route race: some answer 500 with
// "SyntaxError: Unexpected end of JSON input" (reproduced with plain curl on
// a cold server, on old and new routes alike; warm requests never fail).
// Parallel browsers opening the same page at startup hit exactly that.
// Playwright starts `webServer` before this runs.
//
// First it resets the fake evaluator accounts on the dev branch
// (`npm run cuentas:prueba`, tests/e2e/cuentas.ts), so every run starts
// with the same activated and pending accounts and no locks or codes.

const RUTAS = [
  "/acceso",
  "/",
  "/adaptabilidad/evaluador",
  "/adaptabilidad",
  "/adaptabilidad/P01",
  "/reportes",
  "/reportes/adaptabilidad",
  "/reportes/adaptabilidad/P01",
  "/reportes/pensamiento-critico",
  "/reportes/no-existe",
  "/api/reportes/adaptabilidad",
  "/api/reportes/adaptabilidad/csv",
  "/dev/ui",
  "/ruta-inexistente",
  "/pensamiento-critico",
  "/no-existe",
  "/orientacion-detalle/P01",
  "/adaptabilidad/P99",
  "/api/evaluaciones?competencia=adaptabilidad&evaluador=jimena-salgado",
  // POST-only routes: a GET answers 405 but compiles them.
  "/api/acceso/correo",
  "/api/acceso/activar",
  "/api/acceso/contrasena",
  "/api/acceso/recuperar",
  "/api/dev/correos",
  // PUT-only (PRD §5.13).
  "/api/asistencia",
];

export default async function precalentar(config: FullConfig) {
  execSync("npm run cuentas:prueba", { stdio: "inherit" });

  const base = config.projects[0]?.use.baseURL;
  if (!base) return;

  // The docente role can open every route, reports included.
  const acceso = await fetch(new URL("/api/acceso", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ codigo: codigo("docente") }),
  });
  const cookie = acceso.headers.get("set-cookie")?.split(";")[0] ?? "";

  for (const ruta of RUTAS) {
    const respuesta = await fetch(new URL(ruta, base), { headers: { cookie } });
    await respuesta.arrayBuffer(); // let the render finish before the next one
  }
}
