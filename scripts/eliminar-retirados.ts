// Deletes the stored data of evaluators who left the roster (PRD Appendix B, v1.15):
//
//   npm run evaluadores:retirados                         # count only, dev branch
//   npm run evaluadores:retirados -- --eliminar           # delete, dev branch
//   npm run evaluadores:retirados -- --produccion         # count only, production
//   npm run evaluadores:retirados -- --eliminar --produccion
//
// "Retired" means an evaluator id with rows in the DB that isn't in
// src/config/equipos.ts any more: first remove the person from config, then
// run this. It deletes their account (and its codes), their evaluations (and
// their calificaciones) and their attendance marks; a current evaluator's
// data is never touched (src/lib/db/retirados.ts). Without --eliminar it only
// counts. Prints counts and the database host, never names or emails.
//
// Without --produccion, DATABASE_URL must come from .env.local (the Neon dev
// branch). With it, the target is DATABASE_URL_MIGRACION or the DATABASE_URL
// in .env (production), and deleting asks for a typed "sí" first. Either way
// the host is checked against production (scripts/baseProduccion.ts). Run
// through `tsx --conditions=react-server` so `server-only` resolves.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";

function urlProduccion(): string {
  if (process.env.DATABASE_URL_MIGRACION) return process.env.DATABASE_URL_MIGRACION;
  const url = parseEnv(readFileSync(".env", "utf8")).DATABASE_URL;
  if (!url) throw new Error("No production DATABASE_URL: set DATABASE_URL_MIGRACION or add it to .env.");
  return url;
}

async function confirmar(host: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `Va a ELIMINAR datos de evaluadores retirados en PRODUCCIÓN (${host}). No se puede deshacer. Escriba «sí» para continuar: `,
  );
  rl.close();
  return respuesta.trim().toLowerCase() === "sí";
}

async function main() {
  const eliminar = process.argv.includes("--eliminar");
  const produccion = process.argv.includes("--produccion");

  let host: string;
  if (produccion) {
    const url = urlProduccion();
    process.env.DATABASE_URL = url;
    host = hostDe(url);
    if (!exigirDestino(url, true).produccion) {
      console.log(`Aviso: ${host} no coincide con el host de producción de .env.`);
    }
  } else {
    // Refuses production hosts (and anything not from .env.local).
    host = cargarEntornoDesarrollo();
  }

  // Imported after DATABASE_URL is settled: the db module reads it once.
  const { EQUIPOS } = await import("@/config/equipos");
  const { getDb } = await import("@/lib/db");
  const { contarDatosRetirados, eliminarDatosRetirados } = await import("@/lib/db/retirados");
  const db = getDb();
  const vigentes = EQUIPOS.flatMap((e) => e.integrantes.map((i) => i.id));
  console.log(`Base de datos: ${host}`);
  console.log(`Evaluadores en la configuración: ${vigentes.length}`);

  const datos = await contarDatosRetirados(db, vigentes);
  const resumen = `${datos.evaluadores} evaluador(es) retirado(s) con datos: ${datos.cuentas} cuenta(s), ${datos.evaluaciones} evaluación(es), ${datos.asistencia} marca(s) de asistencia.`;
  console.log(resumen);
  if (datos.evaluadores === 0) {
    console.log("No hay nada que eliminar.");
    return;
  }
  if (!eliminar) {
    console.log("Solo se contó. Agregue --eliminar para borrarlos.");
    return;
  }
  if (produccion && !(await confirmar(host))) {
    console.log("Cancelado. No se eliminó nada.");
    return;
  }
  const eliminados = await eliminarDatosRetirados(db, vigentes);
  console.log(
    `Eliminado: ${eliminados.cuentas} cuenta(s), ${eliminados.evaluaciones} evaluación(es) (con sus calificaciones), ${eliminados.asistencia} marca(s) de asistencia.`,
  );
  const resto = await contarDatosRetirados(db, vigentes);
  console.log(`Verificación: quedan ${resto.cuentas + resto.evaluaciones + resto.asistencia} fila(s) de evaluadores retirados.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
