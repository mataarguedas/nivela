// Loads evaluator emails into `cuentas` (PRD §5.12):
//
//   npm run cuentas:importar -- --archivo privado/correos-evaluadores.csv
//   npm run cuentas:importar -- --archivo <csv> --produccion
//
// The CSV (`integranteId,correo`) lives in the gitignored privado/ folder and
// is never committed. Every row is validated first (src/lib/importarCuentas.ts):
// known integrante, valid email (trimmed, lowercased), no repeats. Then only
// the email is upserted: a new or changed email leaves the account "Pendiente
// de activar"; the same email changes nothing. Rows with an empty email are
// skipped ("Sin correo"). Prints counts and the database host, never emails.
//
// Without --produccion, DATABASE_URL must come from .env.local (the Neon dev
// branch). With it, the target is DATABASE_URL_MIGRACION or the DATABASE_URL
// in .env (production), and the script asks for a typed "sí" first. Either
// way the host is checked against production (scripts/baseProduccion.ts).
// Run through `tsx --conditions=react-server` so `server-only` resolves.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function urlProduccion(): string {
  if (process.env.DATABASE_URL_MIGRACION) return process.env.DATABASE_URL_MIGRACION;
  const url = parseEnv(readFileSync(".env", "utf8")).DATABASE_URL;
  if (!url) throw new Error("No production DATABASE_URL: set DATABASE_URL_MIGRACION or add it to .env.");
  return url;
}

async function confirmar(host: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(`Va a escribir correos en PRODUCCIÓN (${host}). Escriba «sí» para continuar: `);
  rl.close();
  return respuesta.trim().toLowerCase() === "sí";
}

async function main() {
  const archivo = argumento("--archivo");
  if (!archivo) {
    console.error("Uso: npm run cuentas:importar -- --archivo <csv> [--produccion]");
    process.exit(2);
  }

  let host: string;
  if (process.argv.includes("--produccion")) {
    const url = urlProduccion();
    process.env.DATABASE_URL = url;
    host = hostDe(url);
    if (!exigirDestino(url, true).produccion) {
      console.log(`Aviso: ${host} no coincide con el host de producción de .env.`);
    }
    if (!(await confirmar(host))) {
      console.log("Cancelado. No se escribió nada.");
      return;
    }
  } else {
    // Refuses production hosts (and anything not from .env.local).
    host = cargarEntornoDesarrollo();
  }

  const { validarCsvCuentas } = await import("@/lib/importarCuentas");
  const resultado = validarCsvCuentas(readFileSync(archivo, "utf8"));
  if (!resultado.ok) {
    console.error(`El archivo tiene ${resultado.errores.length} error(es); no se importó nada:`);
    for (const error of resultado.errores) console.error(`  - ${error}`);
    process.exit(1);
  }

  // Imported after DATABASE_URL is settled: the db module reads it once.
  const { getDb } = await import("@/lib/db");
  const { cambiarCorreo, cuentaPorCorreo, cuentaPorId } = await import("@/lib/db/cuentas");
  const db = getDb();
  console.log(`Base de datos: ${host}`);

  let nuevas = 0;
  let cambiadas = 0;
  let iguales = 0;
  const conflictos: string[] = [];
  for (const fila of resultado.filas) {
    const otra = await cuentaPorCorreo(db, fila.correo);
    if (otra && otra.integranteId !== fila.integranteId) {
      conflictos.push(`Línea ${fila.linea}: el correo de «${fila.integranteId}» ya está en otra cuenta.`);
      continue;
    }
    const previa = await cuentaPorId(db, fila.integranteId);
    if (!(await cambiarCorreo(db, fila.integranteId, fila.correo))) iguales += 1;
    else if (previa?.correo) cambiadas += 1;
    else nuevas += 1;
  }

  console.log(
    `Correos nuevos: ${nuevas} · cambiados: ${cambiadas} · sin cambios: ${iguales} · filas sin correo: ${resultado.sinCorreo.length}.`,
  );
  if (conflictos.length > 0) {
    console.error(`No se importaron ${conflictos.length} fila(s):`);
    for (const c of conflictos) console.error(`  - ${c}`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  // Only the message: a driver error could embed an email from the query.
  console.error(error instanceof Error && !/@/.test(error.message) ? error.message : "cuentas:importar failed");
  process.exit(1);
});

export {};
