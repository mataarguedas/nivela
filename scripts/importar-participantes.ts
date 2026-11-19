// Loads a "Distribución de estudiantes COFI" sheet into a jornada's
// participant list (PRD §5.4, §5.10, v1.8):
//
//   npm run participantes:importar -- --archivo privado/<hoja>.xlsx --jornada noche --simular
//   npm run participantes:importar -- --archivo privado/<hoja>.xlsx --jornada noche
//   npm run participantes:importar -- --archivo privado/<hoja>.xlsx --jornada manana --produccion
//
// The sheet has one column per group ("Grupo 1" …) with the students below
// it, surnames first. It is PII: keep it in the gitignored privado/ folder.
// What gets written (src/lib/distribucion.ts → planificarImportacion):
//   - a jornada with no names yet gets the sheet as its list: P01… in group
//     order, names first-name-first, each with its group. If the jornada
//     already has evaluations (on unnamed participants), they would end up
//     under these names, so that needs --aceptar-evaluaciones.
//   - a jornada with names keeps them; only the groups change, matched by
//     name (any order, accents and case ignored). A sheet row that matches
//     no one, or more than one, stops the import.
// --simular reads and plans without writing. Prints counts, positions
// ("Grupo 2, línea 3") and the database host, never names.
//
// Without --produccion, DATABASE_URL must come from .env.local (the Neon dev
// branch). With it, the target is DATABASE_URL_MIGRACION or the DATABASE_URL
// in .env (production), and the script asks for a typed "sí" first, like
// cuentas:importar. Run through `tsx --conditions=react-server`.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { IDS_JORNADA, type JornadaId } from "@/config/jornadas";
import { leerDistribucion, planificarImportacion } from "@/lib/distribucion";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";
import { leerPrimeraHoja } from "./xlsx";

const USO =
  "Uso: npm run participantes:importar -- --archivo <xlsx> --jornada manana|noche [--simular] [--aceptar-evaluaciones] [--produccion]";

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

async function confirmar(host: string, jornada: JornadaId): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `Va a escribir la lista de participantes de la jornada «${jornada}» en PRODUCCIÓN (${host}). Escriba «sí» para continuar: `,
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

  // 1. Read and check the sheet before touching any database.
  const distribucion = leerDistribucion(leerPrimeraHoja(readFileSync(archivo)));
  if (distribucion.errores.length > 0) {
    fallar(`La hoja tiene ${distribucion.errores.length} problema(s); no se importó nada:`, distribucion.errores);
  }
  if (distribucion.pistaJornada && distribucion.pistaJornada !== idJornada) {
    fallar(`El título de la hoja parece de la jornada «${distribucion.pistaJornada}», no «${idJornada}». No se importó nada.`);
  }
  const porGrupo = new Map<number, number>();
  for (const e of distribucion.estudiantes) porGrupo.set(e.grupo, (porGrupo.get(e.grupo) ?? 0) + 1);
  console.log(
    `Hoja: ${distribucion.estudiantes.length} estudiantes · ${[...porGrupo].map(([g, n]) => `Grupo ${g}: ${n}`).join(" · ")}.`,
  );

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
  const {
    sentenciaContarEvaluaciones,
    sentenciaLeerCorreos,
    sentenciaLeerFilas,
    sentenciasAsignarGrupos,
    sentenciasGuardarParticipantes,
  } = await import("@/lib/db/participantes");
  const { idParticipante } = await import("@/config/participantes");

  const [filas, correos] = await Promise.all([sentenciaLeerFilas(db, idJornada), sentenciaLeerCorreos(db, idJornada)]);
  const conCorreo = new Set(correos.filter((c) => c.correo).map((c) => c.numero));
  const plan = planificarImportacion(
    distribucion.estudiantes,
    filas.map((f) => ({ ...f, grupo: f.grupo ?? null, tieneCorreo: conCorreo.has(f.numero) })),
  );
  if (plan.modo === "error") fallar("No se importó nada:", plan.errores);

  if (plan.modo === "asignar") {
    console.log(
      `La lista guardada ya tiene nombres: se asignan grupos por nombre. Cambian ${plan.cambios} · quedan sin grupo ${plan.sinGrupo}.`,
    );
  } else {
    // The new list may rename unnamed participants that already have evaluations.
    const ids = Array.from({ length: Math.max(plan.nombres.length, filas.length) }, (_, i) => idParticipante(i + 1));
    const [{ total }] = await sentenciaContarEvaluaciones(db, idJornada, ids);
    console.log(
      `La lista guardada no tiene nombres: la hoja será la lista (${plan.nombres.length} participantes, P01…, en orden de grupo).`,
    );
    if (total > 0 && !process.argv.includes("--aceptar-evaluaciones")) {
      const aviso =
        `La jornada ya tiene ${total} evaluaciones enviadas para participantes sin nombre; quedarían bajo los nombres nuevos. ` +
        "Si son de prueba, use --aceptar-evaluaciones.";
      if (!simular) fallar(`${aviso} No se importó nada.`);
      console.log(`Aviso: ${aviso}`);
    }
  }

  if (simular) {
    console.log("Simulación terminada. No se escribió nada.");
    return;
  }
  if (process.argv.includes("--produccion") && !(await confirmar(host, idJornada))) {
    console.log("Cancelado. No se escribió nada.");
    return;
  }

  if (plan.modo === "asignar") {
    const [primera, ...resto] = sentenciasAsignarGrupos(db, idJornada, plan.grupos);
    if (primera) await db.batch([primera, ...resto]);
  } else {
    await db.batch(
      sentenciasGuardarParticipantes(db, idJornada, {
        nombres: plan.nombres,
        carnets: plan.nombres.map(() => null),
        grupos: plan.grupos,
        correos: plan.nombres.map(() => null),
      }),
    );
  }
  console.log("Listo. Revise los nombres en /admin: los que no siguen «Apellido Apellido Nombre» pueden quedar en otro orden.");
}

main().catch((error: unknown) => {
  // A driver error repeats the query and its parameters (names): never print those.
  const mensaje = error instanceof Error ? error.message : "";
  const seguro = mensaje && !/query|params|insert|update|select/i.test(mensaje) && mensaje.length < 300;
  console.error(seguro ? mensaje : "participantes:importar failed (database error; details omitted: they may contain names)");
  process.exit(1);
});

export {};
