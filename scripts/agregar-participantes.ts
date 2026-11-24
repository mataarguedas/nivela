// Appends extra students to a jornada whose participant list is already set
// (PRD §5.10, v1.17), e.g. the night jornada's Contabilidad students:
//
//   npm run participantes:agregar -- --archivo privado/<hoja>.xlsx --jornada noche --simular
//   npm run participantes:agregar -- --archivo privado/<hoja>.xlsx --jornada noche
//   npm run participantes:agregar -- --archivo privado/<hoja>.xlsx --jornada noche --produccion
//
// The sheet is one column of names, first name first, one per row. It is
// PII: keep it in the gitignored privado/ folder. The names become
// P{n+1}…, right after the n active participants, all in one group:
// `--grupo N`, or by default the next group number after the ones in use.
// Current participants, their evaluations and their groups don't change.
// It refuses (src/lib/agregarParticipantes.ts) a jornada with no saved list
// or with hidden participants, a repeated name or one already in the list,
// more than 99 participants, and new ids that already have evaluations or
// absence marks.
// --simular reads and plans without writing. Prints counts, positions
// ("fila 3") and the database host, never names.
//
// Without --produccion, DATABASE_URL must come from .env.local (the Neon dev
// branch). With it, the target is DATABASE_URL_MIGRACION or the DATABASE_URL
// in .env (production), and the script asks for a typed "sí" first, like
// participantes:importar. Run through `tsx --conditions=react-server`.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { IDS_JORNADA, type JornadaId } from "@/config/jornadas";
import { leerListaNombres, planificarAgregado } from "@/lib/agregarParticipantes";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";
import { leerPrimeraHoja } from "./xlsx";

const USO =
  "Uso: npm run participantes:agregar -- --archivo <xlsx> --jornada manana|noche [--grupo N] [--simular] [--produccion]";

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

async function confirmar(host: string, jornada: JornadaId, cantidad: number): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `Va a agregar ${cantidad} participantes a la jornada «${jornada}» en PRODUCCIÓN (${host}). Escriba «sí» para continuar: `,
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
  const textoGrupo = argumento("--grupo");
  if (!archivo || !jornada || !(IDS_JORNADA as readonly string[]).includes(jornada)) {
    console.error(USO);
    process.exit(2);
  }
  const grupo = textoGrupo === undefined ? undefined : Number(textoGrupo);
  if (grupo !== undefined && !Number.isInteger(grupo)) {
    console.error(USO);
    process.exit(2);
  }
  const idJornada = jornada as JornadaId;
  const simular = process.argv.includes("--simular");

  // 1. Read and check the sheet before touching any database.
  const lista = leerListaNombres(leerPrimeraHoja(readFileSync(archivo)));
  if (lista.errores.length > 0) {
    fallar(`La hoja tiene ${lista.errores.length} problema(s); no se agregó nada:`, lista.errores);
  }
  console.log(`Hoja: ${lista.nombres.length} nombres.`);

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
  const { sentenciaAgregarParticipantes, sentenciaContarAsistencia, sentenciaContarEvaluaciones, sentenciaLeerFilas } =
    await import("@/lib/db/participantes");

  const filas = await sentenciaLeerFilas(db, idJornada);
  const plan = planificarAgregado(
    lista.nombres,
    filas.map((f) => ({ ...f, grupo: f.grupo ?? null, tieneCorreo: false })),
    grupo,
  );
  if (!plan.ok) fallar("No se agregó nada:", plan.errores);

  const [[{ total: evaluaciones }], [{ total: marcas }]] = await Promise.all([
    sentenciaContarEvaluaciones(db, idJornada, plan.ids),
    sentenciaContarAsistencia(db, idJornada, plan.ids),
  ]);
  if (evaluaciones > 0 || marcas > 0) {
    fallar(
      `Ya hay ${evaluaciones} evaluaciones y ${marcas} marcas de asistencia para ${plan.ids[0]}…${plan.ids.at(-1)}; ` +
        "quedarían bajo los nombres nuevos. No se agregó nada.",
    );
  }

  const activos = filas.filter((f) => f.activo).length;
  console.log(
    `Se agregan ${plan.nombres.length} participantes como ${plan.ids[0]}…${plan.ids.at(-1)} en el Grupo ${plan.grupo}. ` +
      `La lista pasa de ${activos} a ${activos + plan.nombres.length}.`,
  );

  if (simular) {
    console.log("Simulación terminada. No se escribió nada.");
    return;
  }
  if (process.argv.includes("--produccion") && !(await confirmar(host, idJornada, plan.nombres.length))) {
    console.log("Cancelado. No se escribió nada.");
    return;
  }

  await sentenciaAgregarParticipantes(db, idJornada, plan.inicio, plan.nombres, plan.grupo);
  console.log("Listo. Los carnés y correos de los nuevos participantes se agregan en /admin o con participantes:matricula.");
}

main().catch((error: unknown) => {
  // A driver error repeats the query and its parameters (names): never print those.
  const mensaje = error instanceof Error ? error.message : "";
  const seguro = mensaje && !/query|params|insert|update|select/i.test(mensaje) && mensaje.length < 300;
  console.error(seguro ? mensaje : "participantes:agregar failed (database error; details omitted: they may contain names)");
  process.exit(1);
});

export {};
