// Keeps only the students on the docentes' final list in a jornada
// (PRD §5.10, v1.19):
//
//   npm run participantes:conservar -- --archivo privado/<lista>.csv --jornada noche --simular
//   npm run participantes:conservar -- --archivo privado/<lista>.csv --jornada noche --produccion
//
// The list is the same input as participantes:agregar (an .xlsx column of
// names, or a CSV whose first column is `nombre`); only the names are read.
// Every name must match exactly one visible participant. Those become
// P01…Pk (in their current order) and everyone else is hidden after them,
// never deleted: hidden participants keep their data and come back if the
// admin raises the count. Evaluations, absence marks and sent-email records
// move with their participant. All in one transaction.
//
// Renumbering changes the URLs and the drafts kept on evaluators' phones
// (they are keyed by participant id), so run it before rating starts; the
// dry run counts the evaluations and absence marks that would move.
// --simular reads and plans without writing. Prints counts, positions and
// the database host, never names.
//
// Without --produccion, DATABASE_URL must come from .env.local (the Neon dev
// branch). With it, the target is DATABASE_URL_MIGRACION or the DATABASE_URL
// in .env (production), and the script asks for a typed "sí" first. Run
// through `tsx --conditions=react-server`.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { IDS_JORNADA, type JornadaId } from "@/config/jornadas";
import { leerCsvParticipantes, leerListaNombres } from "@/lib/agregarParticipantes";
import { planificarConservar } from "@/lib/conservarParticipantes";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";
import { leerPrimeraHoja } from "./xlsx";

const USO =
  "Uso: npm run participantes:conservar -- --archivo <xlsx|csv> --jornada manana|noche [--simular] [--produccion]";

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

async function confirmar(host: string, jornada: JornadaId, conservados: number, ocultados: number): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `Va a dejar ${conservados} participantes visibles y ocultar ${ocultados} en la jornada «${jornada}» en PRODUCCIÓN (${host}). Escriba «sí» para continuar: `,
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
  const archivo = argumento("--archivo");
  const jornada = argumento("--jornada");
  if (!archivo || !jornada || !(IDS_JORNADA as readonly string[]).includes(jornada)) {
    console.error(USO);
    process.exit(2);
  }
  const idJornada = jornada as JornadaId;
  const simular = process.argv.includes("--simular");

  // 1. Read and check the list before touching any database.
  const lista = archivo.toLowerCase().endsWith(".csv")
    ? leerCsvParticipantes(readFileSync(archivo, "utf8"))
    : leerListaNombres(leerPrimeraHoja(readFileSync(archivo)));
  if (lista.errores.length > 0)
    fallar(`La lista tiene ${lista.errores.length} problema(s); no se cambió nada:`, lista.errores);
  console.log(`Lista: ${lista.nombres.length} nombres.`);

  // 2. Pick the database (dev unless --produccion).
  let host: string;
  if (process.argv.includes("--produccion")) {
    const url = urlProduccion();
    process.env.DATABASE_URL = url;
    host = hostDe(url);
    if (!exigirDestino(url, true).produccion)
      console.log(`Aviso: ${host} no coincide con el host de producción de .env.`);
  } else {
    host = cargarEntornoDesarrollo();
  }
  console.log(`Base de datos: ${host} · jornada ${idJornada}${simular ? " · simulación (no se escribe nada)" : ""}`);

  // Imported after DATABASE_URL is settled: the db module reads it once.
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const { sentenciaContarAsistencia, sentenciaContarEvaluaciones, sentenciaLeerFilasCompletas, sentenciasRenumerar } =
    await import("@/lib/db/participantes");

  const filas = await sentenciaLeerFilasCompletas(db, idJornada);
  const plan = planificarConservar(
    lista.nombres,
    filas.map((f) => ({ ...f, tieneCorreo: Boolean(f.correo) })),
  );
  if (!plan.ok) fallar("No se cambió nada:", plan.errores);

  const visibles = filas.filter((f) => f.activo).length;
  const movidos = plan.cambios.map((c) => c.deId);
  const ocultadosIds = plan.mapa
    .filter((m) => !m.activo && filas.find((f) => f.numero === m.de)?.activo)
    .map((m) => `P${String(m.de).padStart(2, "0")}`);
  const [[{ total: evaluacionesMovidas }], [{ total: marcasMovidas }], [{ total: evaluacionesOcultas }]] =
    await Promise.all([
      movidos.length > 0 ? sentenciaContarEvaluaciones(db, idJornada, movidos) : Promise.resolve([{ total: 0 }]),
      movidos.length > 0 ? sentenciaContarAsistencia(db, idJornada, movidos) : Promise.resolve([{ total: 0 }]),
      ocultadosIds.length > 0
        ? sentenciaContarEvaluaciones(db, idJornada, ocultadosIds)
        : Promise.resolve([{ total: 0 }]),
    ]);

  console.log(
    `Visibles ahora: ${visibles}. Quedan visibles ${plan.conservados} (P01…P${String(plan.conservados).padStart(2, "0")}) ` +
      `y se ocultan ${plan.ocultados}. Cambian de número ${plan.cambios.length} participantes.`,
  );
  console.log(
    `Se mueven con su participante: ${evaluacionesMovidas} evaluaciones y ${marcasMovidas} marcas de asistencia. ` +
      `Evaluaciones de los que se ocultan (se conservan, ocultas): ${evaluacionesOcultas}.`,
  );
  if (evaluacionesMovidas > 0 || marcasMovidas > 0) {
    console.log(
      "Aviso: ya hay calificaciones. Los borradores en los teléfonos usan el número del participante: " +
        "pida a los evaluadores enviar o borrar sus borradores antes de continuar.",
    );
  }

  if (simular) {
    console.log("Simulación terminada. No se escribió nada.");
    return;
  }
  if (process.argv.includes("--produccion") && !(await confirmar(host, idJornada, plan.conservados, plan.ocultados))) {
    console.log("Cancelado. No se escribió nada.");
    return;
  }

  const [primera, ...resto] = sentenciasRenumerar(db, idJornada, filas, plan.mapa);
  await db.batch([primera, ...resto]);
  console.log(`Listo. La jornada tiene ${plan.conservados} participantes visibles. Revise la lista en /admin.`);
}

main().catch((error: unknown) => {
  // A driver error repeats the query and its parameters (names): never print those.
  const mensaje = error instanceof Error ? error.message : "";
  const seguro = mensaje && !/query|params|insert|update|select|delete/i.test(mensaje) && mensaje.length < 300;
  console.error(
    seguro ? mensaje : "participantes:conservar failed (database error; details omitted: they may contain names)",
  );
  process.exit(1);
});

export {};
