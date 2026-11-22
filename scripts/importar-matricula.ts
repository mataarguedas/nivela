// Fills the carnets and emails of a jornada's participants from the
// university's "Listado de Alumnos Matriculados" (PRD §5.10, v1.9):
//
//   npm run participantes:matricula -- --jornada manana --archivo privado/a.pdf --archivo privado/b.pdf --simular
//   npm run participantes:matricula -- --jornada manana --archivo privado/a.pdf --archivo privado/b.pdf
//   npm run participantes:matricula -- --jornada manana --archivo privado/a.pdf --archivo privado/b.pdf --produccion
//
// One list per course section; pass every section of the jornada at once. A
// .pdf is turned into text with `pdftotext -layout` (poppler; it ships with
// Git for Windows), a .txt is read as is. The jornada's list must already
// have the names (participantes:importar): each student is matched to one
// participant by name (src/lib/matricula.ts), and only the carnet and the
// email change, so P01… keep their order, groups and evaluations. A cut
// email in the list is skipped (the stored one stays) and reported by
// position. Prints counts, positions and the database host, never names,
// carnets or emails. The lists are PII: keep them in the gitignored privado/.
//
// Without --produccion, DATABASE_URL must come from .env.local (the Neon dev
// branch). With it, the target is DATABASE_URL_MIGRACION or the DATABASE_URL
// in .env (production), and the script asks for a typed "sí" first.
// Run through `tsx --conditions=react-server`.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { IDS_JORNADA, type JornadaId } from "@/config/jornadas";
import { leerMatricula, planificarMatricula, type Matriculado } from "@/lib/matricula";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";

const USO =
  "Uso: npm run participantes:matricula -- --jornada manana|noche --archivo <pdf|txt> [--archivo <pdf|txt> …] [--simular] [--produccion]";

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function argumentos(nombre: string): string[] {
  return process.argv.flatMap((valor, i) => (valor === nombre && process.argv[i + 1] ? [process.argv[i + 1]] : []));
}

function urlProduccion(): string {
  if (process.env.DATABASE_URL_MIGRACION) return process.env.DATABASE_URL_MIGRACION;
  const url = parseEnv(readFileSync(".env", "utf8")).DATABASE_URL;
  if (!url) throw new Error("No production DATABASE_URL: set DATABASE_URL_MIGRACION or add it to .env.");
  return url;
}

function textoDe(archivo: string): string {
  if (!archivo.toLowerCase().endsWith(".pdf")) return readFileSync(archivo, "utf8");
  try {
    return execFileSync("pdftotext", ["-enc", "UTF-8", "-layout", archivo, "-"], { encoding: "utf8" });
  } catch {
    throw new Error(
      `No se pudo leer ${basename(archivo)} con pdftotext. Instale poppler (viene con Git para Windows) o pase el texto como .txt.`,
    );
  }
}

async function confirmar(host: string, jornada: JornadaId): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `Va a escribir carnés y correos de la jornada «${jornada}» en PRODUCCIÓN (${host}). Escriba «sí» para continuar: `,
  );
  rl.close();
  return respuesta.trim().toLowerCase() === "sí";
}

function fallar(mensaje: string, errores: readonly string[] = []): never {
  console.error(mensaje);
  for (const error of errores) console.error(`  - ${error}`);
  process.exit(1);
}

async function main() {
  const archivos = argumentos("--archivo");
  const jornada = argumento("--jornada");
  if (archivos.length === 0 || !jornada || !(IDS_JORNADA as readonly string[]).includes(jornada)) {
    console.error(USO);
    process.exit(2);
  }
  const idJornada = jornada as JornadaId;
  const simular = process.argv.includes("--simular");

  // 1. Read and check every list before touching any database.
  const estudiantes: Matriculado[] = [];
  const errores: string[] = [];
  const avisos: string[] = [];
  for (const archivo of archivos) {
    const lista = leerMatricula(textoDe(archivo), basename(archivo));
    console.log(`${basename(archivo)}: ${lista.estudiantes.length} estudiantes.`);
    estudiantes.push(...lista.estudiantes);
    errores.push(...lista.errores);
    avisos.push(...lista.avisos);
  }
  if (errores.length > 0) fallar(`Las listas tienen ${errores.length} problema(s); no se importó nada:`, errores);
  for (const aviso of avisos) console.log(`Aviso: ${aviso}`);

  // 2. Pick the database (dev unless --produccion).
  let host: string;
  if (process.argv.includes("--produccion")) {
    const url = urlProduccion();
    process.env.DATABASE_URL = url;
    host = hostDe(url);
    if (!exigirDestino(url, true).produccion) console.log(`Aviso: ${host} no coincide con el host de producción de .env.`);
  } else {
    host = cargarEntornoDesarrollo();
  }
  console.log(`Base de datos: ${host} · jornada ${idJornada}${simular ? " · simulación (no se escribe nada)" : ""}`);

  // Imported after DATABASE_URL is settled: the db module reads it once.
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const { sentenciaLeerCorreos, sentenciaLeerFilas, sentenciasAsignarMatricula } = await import("@/lib/db/participantes");

  const [filas, correos] = await Promise.all([sentenciaLeerFilas(db, idJornada), sentenciaLeerCorreos(db, idJornada)]);
  const correoDe = new Map(correos.map((c) => [c.numero, c.correo]));
  const plan = planificarMatricula(
    estudiantes,
    filas.map((f) => {
      const correo = correoDe.get(f.numero) ?? null;
      return { ...f, grupo: f.grupo ?? null, correo, tieneCorreo: correo !== null };
    }),
  );
  if (plan.modo === "error") fallar("No se importó nada:", plan.errores);

  console.log(
    `Coinciden ${plan.cambios.length} estudiantes · carnés nuevos ${plan.carnetsNuevos} · carnés que cambian ${plan.carnetsCambiados} · ` +
      `correos nuevos o distintos ${plan.correosNuevos} · participantes activos sin coincidencia ${plan.sinCoincidencia}.`,
  );

  if (simular) {
    console.log("Simulación terminada. No se escribió nada.");
    return;
  }
  if (process.argv.includes("--produccion") && !(await confirmar(host, idJornada))) {
    console.log("Cancelado. No se escribió nada.");
    return;
  }
  const [primera, ...resto] = sentenciasAsignarMatricula(db, idJornada, plan.cambios);
  if (primera) await db.batch([primera, ...resto]);
  console.log("Listo. Revise los carnés y correos en /admin.");
}

main().catch((error: unknown) => {
  // A driver error repeats the query and its parameters (carnets, emails): never print those.
  const mensaje = error instanceof Error ? error.message : "";
  const seguro = mensaje && !/query|params|insert|update|select/i.test(mensaje) && mensaje.length < 300;
  console.error(seguro ? mensaje : "participantes:matricula failed (database error; details omitted: they may contain PII)");
  process.exit(1);
});

export {};
