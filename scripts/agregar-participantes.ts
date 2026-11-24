// Appends extra students to a jornada whose participant list is already set
// (PRD §5.10, v1.17), e.g. the night jornada's Contabilidad students:
//
//   npm run participantes:agregar -- --archivo privado/<hoja>.xlsx --jornada noche --simular
//   npm run participantes:agregar -- --archivo privado/<hoja>.xlsx --jornada noche
//   npm run participantes:agregar -- --archivo privado/<hoja>.xlsx --jornada noche --produccion
//
// Input (PII: keep it in the gitignored privado/ folder), by extension:
//   - .xlsx: one column of names, first name first, one per row, all in one
//     group: `--grupo N`, or by default the next group number in use + 1;
//   - .csv: `nombre,correo,grupo` (a course's participant export), each
//     student in their own group with their email; a row without a group
//     gets `--grupo N`, or "Sin grupo".
// The names become P{n+1}…, right after the n active participants.
// Current participants, their evaluations and their groups don't change,
// except with --actualizar-existentes: then a row whose name matches exactly
// one stored participant only sets that participant's group (a final group
// list that mixes students already stored and new ones).
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
import { leerCsvParticipantes, leerListaNombres, planificarAgregado } from "@/lib/agregarParticipantes";
import { exigirDestino, hostDe } from "./baseProduccion";
import { cargarEntornoDesarrollo } from "./entornoDesarrollo";
import { leerPrimeraHoja } from "./xlsx";

const USO =
  "Uso: npm run participantes:agregar -- --archivo <xlsx> --jornada manana|noche [--grupo N] [--actualizar-existentes] [--simular] [--produccion]";

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
    `Va a agregar ${cantidad} participantes (y cambiar grupos, si corresponde) en la jornada «${jornada}» en PRODUCCIÓN (${host}). Escriba «sí» para continuar: `,
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
  const esCsv = archivo.toLowerCase().endsWith(".csv");
  const lista = esCsv
    ? leerCsvParticipantes(readFileSync(archivo, "utf8"))
    : leerListaNombres(leerPrimeraHoja(readFileSync(archivo)));
  if (lista.errores.length > 0) {
    fallar(`La hoja tiene ${lista.errores.length} problema(s); no se agregó nada:`, lista.errores);
  }
  const conCorreo = lista.nombres.filter((n) => n.correo).length;
  console.log(`Hoja: ${lista.nombres.length} nombres${esCsv ? ` · ${conCorreo} con correo` : ""}.`);

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
  const {
    sentenciaAgregarParticipantes,
    sentenciaContarAsistencia,
    sentenciaContarEvaluaciones,
    sentenciaLeerFilas,
    sentenciasAsignarGrupos,
    sentenciasAsignarMatricula,
  } = await import("@/lib/db/participantes");

  const filas = await sentenciaLeerFilas(db, idJornada);
  const actualizarExistentes = process.argv.includes("--actualizar-existentes");
  const plan = planificarAgregado(
    lista.nombres,
    filas.map((f) => ({ ...f, grupo: f.grupo ?? null, tieneCorreo: false })),
    esCsv ? (grupo ?? null) : grupo,
    { actualizarExistentes },
  );
  if (!plan.ok) fallar("No se agregó nada:", plan.errores);
  if (plan.nombres.length === 0 && plan.actualizaciones.length === 0) fallar("No hay nada que agregar ni cambiar.");

  if (plan.ids.length > 0) {
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
  }

  const activas = filas.filter((f) => f.activo);
  const etiqueta = (g: number | null) => (g === null ? "Sin grupo" : `Grupo ${g}`);
  const resumen = (grupos: readonly (number | null)[]) => {
    const conteo = new Map<number | null, number>();
    for (const g of grupos) conteo.set(g, (conteo.get(g) ?? 0) + 1);
    return [...conteo]
      .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
      .map(([g, n]) => `${etiqueta(g)}: ${n}`)
      .join(" · ");
  };
  const cambiados = plan.actualizaciones.filter(
    (u) => (activas.find((f) => f.numero === u.numero)?.grupo ?? null) !== u.grupo,
  );
  const conCarnetNuevo = plan.actualizaciones.flatMap((u) => {
    const guardado = activas.find((f) => f.numero === u.numero)?.carnet ?? null;
    return u.carnet !== null && u.carnet !== guardado ? [{ numero: u.numero, carnet: u.carnet, correo: null }] : [];
  });
  if (plan.actualizaciones.length > 0) {
    console.log(
      `Ya guardados: ${plan.actualizaciones.length}; cambian de grupo ${cambiados.length} · ` +
        `reciben carné ${conCarnetNuevo.length} · ${resumen(plan.actualizaciones.map((u) => u.grupo))}.`,
    );
  }
  if (plan.nombres.length > 0) {
    console.log(
      `Se agregan ${plan.nombres.length} participantes como ${plan.ids[0]}…${plan.ids.at(-1)} ` +
        `(${plan.carnets.filter(Boolean).length} con carné, ${plan.correos.filter(Boolean).length} con correo) · ${resumen(plan.grupos)}.`,
    );
  }
  const gruposFinales = [
    ...activas.map((f) => plan.actualizaciones.find((u) => u.numero === f.numero)?.grupo ?? f.grupo ?? null),
    ...plan.grupos,
  ];
  console.log(`La lista pasa de ${activas.length} a ${gruposFinales.length}: ${resumen(gruposFinales)}.`);

  if (simular) {
    console.log("Simulación terminada. No se escribió nada.");
    return;
  }
  if (process.argv.includes("--produccion") && !(await confirmar(host, idJornada, plan.nombres.length))) {
    console.log("Cancelado. No se escribió nada.");
    return;
  }

  // One neon-http batch: group and carnet changes and the new rows land together or not at all.
  // sentenciasAsignarMatricula with correo null keeps the stored email.
  const sentencias = [
    ...sentenciasAsignarGrupos(db, idJornada, cambiados),
    ...sentenciasAsignarMatricula(db, idJornada, conCarnetNuevo),
    ...(plan.nombres.length > 0 ? [sentenciaAgregarParticipantes(db, idJornada, plan.inicio, plan)] : []),
  ];
  const [primera, ...resto] = sentencias;
  if (primera) await db.batch([primera, ...resto]);
  console.log("Listo. Revise la lista en /admin.");
}

main().catch((error: unknown) => {
  // A driver error repeats the query and its parameters (names): never print those.
  const mensaje = error instanceof Error ? error.message : "";
  const seguro = mensaje && !/query|params|insert|update|select/i.test(mensaje) && mensaje.length < 300;
  console.error(
    seguro ? mensaje : "participantes:agregar failed (database error; details omitted: they may contain names)",
  );
  process.exit(1);
});

export {};
