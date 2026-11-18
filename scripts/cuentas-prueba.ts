// Fake evaluator accounts for development and e2e (PRD §5.12):
//
//   npm run cuentas:prueba
//
// Every config member gets `<integranteId>@ejemplo.test`, activated with
// E2E_CONTRASENA (from .env.local); the e2e activation accounts stay
// pending. Every stored participant also gets a fake email
// (`participante-07.manana@ejemplo.test`) for the results-email specs. Dev branch only (see entornoDesarrollo.ts). Run through
// `tsx --conditions=react-server` so the `server-only` guard resolves.
// Playwright's global setup runs it before every e2e run.

import { cargarEntornoDesarrollo } from "./entornoDesarrollo";

async function main() {
  const host = cargarEntornoDesarrollo();
  const { contrasenaDePrueba, CUENTAS_PENDIENTES } = await import("../tests/e2e/cuentas");
  const contrasena = contrasenaDePrueba();
  // Imported after the env files load: the db module reads DATABASE_URL.
  const { getDb } = await import("@/lib/db");
  const { prepararCorreosParticipantes, prepararCuentasPrueba } = await import("./cuentasPrueba");
  const { total, pendientes } = await prepararCuentasPrueba(getDb(), contrasena, CUENTAS_PENDIENTES);
  const correos = await prepararCorreosParticipantes(getDb());
  console.log(
    `Base de datos: ${host}. Cuentas de prueba: ${total} (${pendientes} pendientes de activar). Participantes con correo de prueba: ${correos} filas.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "cuentas:prueba failed");
  process.exit(1);
});

export {};
