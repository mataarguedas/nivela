import "server-only";
import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { connection } from "next/server";
import {
  crearParticipante,
  generarParticipantes,
  idParticipante,
  leerCantidadParticipantes,
  type Participante,
} from "@/config/participantes";
import type { JornadaId } from "@/config/jornadas";
import { registrarError } from "@/lib/registro";
import { getDb } from "./index";
import { asistencia, evaluaciones, participantes } from "./schema";
import type * as schema from "./schema";

// Reads and writes of the evaluados the admin manages (PRD §9.2), one list
// per jornada: every function takes it, and ids P01…P99 repeat across
// jornadas, so nothing here may query without it. Not cached:
// one small query per render keeps every page, every server instance and the
// submission check in agreement right after the admin saves. Pages call
// these behind Suspense after `connection()`, so the build never needs the DB.

type Bd = PgDatabase<PgQueryResultHKT, typeof schema>;

export type FilaParticipante = {
  numero: number;
  nombre: string | null;
  carnet: string | null;
  /** v1.8 (PRD §5.4): the COFI group, or null. Optional so older fixtures stay valid. */
  grupo?: number | null;
  activo: boolean;
};

/** What the admin editor starts from. */
export type EstadoParticipantes = {
  /** Active participants now (the fallback count while nothing is saved). */
  cantidad: number;
  /** Stored name per numero (index = numero − 1), hidden rows included, so raising the count brings them back. */
  nombres: (string | null)[];
  /** Stored carnet per numero, aligned with `nombres`. */
  carnets: (string | null)[];
  /** Stored group per numero, aligned with `nombres` (PRD §5.4, v1.8). */
  grupos: (number | null)[];
  /**
   * Stored email per numero, aligned with `nombres` (PRD §5.14). Only the
   * admin editor receives this: participant emails never reach any other
   * client bundle.
   */
  correos: (string | null)[];
};

/** A participant's email row: kept apart from FilaParticipante so pages that list participants never read emails. */
export type FilaCorreo = { numero: number; correo: string | null };

export function sentenciaLeerFilas<B extends Bd>(db: B, jornada: JornadaId) {
  return db
    .select({
      numero: participantes.numero,
      nombre: participantes.nombre,
      carnet: participantes.carnet,
      grupo: participantes.grupo,
      activo: participantes.activo,
    })
    .from(participantes)
    .where(eq(participantes.jornada, jornada))
    .orderBy(asc(participantes.numero));
}

/** The jornada's stored emails (PRD §5.14), hidden rows included. Only for the admin editor and the results email. */
export function sentenciaLeerCorreos<B extends Bd>(db: B, jornada: JornadaId) {
  return db
    .select({ numero: participantes.numero, correo: participantes.correo })
    .from(participantes)
    .where(eq(participantes.jornada, jornada))
    .orderBy(asc(participantes.numero));
}

function cantidadRespaldo(): number {
  return leerCantidadParticipantes(process.env.CANTIDAD_PARTICIPANTES);
}

/** Active participants in order; the unnamed fallback list while the jornada has no rows. */
export function participantesActivos(filas: readonly FilaParticipante[], respaldo: number): Participante[] {
  if (filas.length === 0) return generarParticipantes(respaldo);
  return filas.filter((f) => f.activo).map((f) => crearParticipante(f.numero, f.nombre, f.carnet, f.grupo ?? null));
}

export function estadoDesdeFilas(
  filas: readonly FilaParticipante[],
  respaldo: number,
  filasCorreo: readonly FilaCorreo[] = [],
): EstadoParticipantes {
  if (filas.length === 0) return { cantidad: respaldo, nombres: [], carnets: [], grupos: [], correos: [] };
  const maximo = Math.max(...filas.map((f) => f.numero));
  const nombres: (string | null)[] = Array.from({ length: maximo }, () => null);
  const carnets: (string | null)[] = Array.from({ length: maximo }, () => null);
  const grupos: (number | null)[] = Array.from({ length: maximo }, () => null);
  const correos: (string | null)[] = Array.from({ length: maximo }, () => null);
  for (const f of filas) {
    nombres[f.numero - 1] = f.nombre;
    carnets[f.numero - 1] = f.carnet;
    grupos[f.numero - 1] = f.grupo ?? null;
  }
  for (const f of filasCorreo) {
    if (f.numero >= 1 && f.numero <= maximo) correos[f.numero - 1] = f.correo;
  }
  return { cantidad: filas.filter((f) => f.activo).length, nombres, carnets, grupos, correos };
}

export async function obtenerParticipantes(jornada: JornadaId): Promise<Participante[]> {
  return participantesActivos(await sentenciaLeerFilas(getDb(), jornada), cantidadRespaldo());
}

/**
 * The active participants' emails by id (PRD §5.14), for the results email
 * only. A participant without an email is absent from the map.
 */
export async function obtenerCorreosParticipantes(jornada: JornadaId): Promise<Map<string, string>> {
  const db = getDb();
  const [filas, correos] = await Promise.all([sentenciaLeerFilas(db, jornada), sentenciaLeerCorreos(db, jornada)]);
  const activos = new Set(filas.filter((f) => f.activo).map((f) => f.numero));
  return new Map(
    correos.flatMap((f) => (f.correo && activos.has(f.numero) ? [[idParticipante(f.numero), f.correo] as const] : [])),
  );
}

/** Every stored participant, hidden ones included (the CSV keeps their rows). */
export async function obtenerTodosLosParticipantes(jornada: JornadaId): Promise<Participante[]> {
  const filas = await sentenciaLeerFilas(getDb(), jornada);
  if (filas.length === 0) return generarParticipantes(cantidadRespaldo());
  return filas.map((f) => crearParticipante(f.numero, f.nombre, f.carnet, f.grupo ?? null));
}

/**
 * For pages: reads at request time (`connection()`, so a prerender never
 * touches the DB) and turns a DB failure into `null`, logged without PII, so
 * the page can say so instead of crashing.
 */
export async function cargarParticipantes(ruta: string, jornada: JornadaId): Promise<Participante[] | null> {
  await connection();
  const inicio = Date.now();
  try {
    return await obtenerParticipantes(jornada);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/** The admin editor's starting point, read like cargarParticipantes (null on a DB failure). */
export async function cargarEstadoParticipantes(ruta: string, jornada: JornadaId): Promise<EstadoParticipantes | null> {
  await connection();
  const inicio = Date.now();
  try {
    const db = getDb();
    const [filas, correos] = await Promise.all([sentenciaLeerFilas(db, jornada), sentenciaLeerCorreos(db, jornada)]);
    return estadoDesdeFilas(filas, cantidadRespaldo(), correos);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/** Evaluations (any competencia) received by these participants of the jornada. */
export function sentenciaContarEvaluaciones<B extends Bd>(db: B, jornada: JornadaId, ids: readonly string[]) {
  return db
    .select({ total: count() })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.jornada, jornada), inArray(evaluaciones.participanteId, [...ids])));
}

/** Attendance marks (any competencia) on these participants of the jornada. */
export function sentenciaContarAsistencia<B extends Bd>(db: B, jornada: JornadaId, ids: readonly string[]) {
  return db
    .select({ total: count() })
    .from(asistencia)
    .where(and(eq(asistencia.jornada, jornada), inArray(asistencia.participanteId, [...ids])));
}

/**
 * v1.17 (`participantes:agregar`, PRD §5.10): append new participants as
 * P{inicio}… with their names and one group, active, no carnet or email.
 * A plain insert: if any of those ids is already stored (a hidden row) it
 * fails instead of writing over it. The plan (lib/agregarParticipantes.ts)
 * refuses that case before getting here.
 */
export function sentenciaAgregarParticipantes<B extends Bd>(
  db: B,
  jornada: JornadaId,
  inicio: number,
  nombres: readonly string[],
  grupo: number,
) {
  return db.insert(participantes).values(
    nombres.map((nombre, i) => ({
      jornada,
      id: idParticipante(inicio + i),
      numero: inicio + i,
      nombre,
      grupo,
      activo: true,
    })),
  );
}

/** The list the admin saves: names, carnets, groups and emails aligned by position (P01 first). */
export type ListaParticipantes = {
  nombres: readonly (string | null)[];
  carnets: readonly (string | null)[];
  /** Missing → every row "Sin grupo". */
  grupos?: readonly (number | null)[];
  correos: readonly (string | null)[];
};

/**
 * Saving the list as two statements for one transaction (a neon-http batch):
 * upsert P01…P{n} as active with their names, carnets, groups and emails, then hide every row
 * above n. Rows are never deleted, so hidden participants keep their data.
 */
export function sentenciasGuardarParticipantes<B extends Bd>(db: B, jornada: JornadaId, lista: ListaParticipantes) {
  const cantidad = lista.nombres.length;
  const upsert = db
    .insert(participantes)
    .values(
      lista.nombres.map((nombre, i) => ({
        jornada,
        id: idParticipante(i + 1),
        numero: i + 1,
        nombre,
        carnet: lista.carnets[i] ?? null,
        grupo: lista.grupos?.[i] ?? null,
        correo: lista.correos[i] ?? null,
        activo: true,
      })),
    )
    .onConflictDoUpdate({
      target: [participantes.jornada, participantes.id],
      set: {
        nombre: sql`excluded.nombre`,
        carnet: sql`excluded.carnet`,
        grupo: sql`excluded.grupo`,
        correo: sql`excluded.correo`,
        activo: true,
        updatedAt: sql`now()`,
      },
    });
  const ocultar = db
    .update(participantes)
    .set({ activo: false, updatedAt: sql`now()` })
    .where(and(eq(participantes.jornada, jornada), gt(participantes.numero, cantidad), eq(participantes.activo, true)));
  return [upsert, ocultar] as const;
}

export type ResultadoGuardar =
  | { ok: true; participantes: Participante[] }
  | { ok: false; ocultos: number; evaluacionesAfectadas: number };

/**
 * Saves the jornada's list. Without `confirmar`, refuses when participants that would
 * be hidden already have evaluations, and says how many (PRD §5.10).
 */
export async function guardarParticipantes(
  jornada: JornadaId,
  lista: ListaParticipantes,
  confirmar: boolean,
): Promise<ResultadoGuardar> {
  const db = getDb();
  const actuales = participantesActivos(await sentenciaLeerFilas(db, jornada), cantidadRespaldo());
  const ocultos = actuales.filter((p) => p.numero > lista.nombres.length).map((p) => p.id);
  if (ocultos.length > 0 && !confirmar) {
    const [{ total }] = await sentenciaContarEvaluaciones(db, jornada, ocultos);
    if (total > 0) return { ok: false, ocultos: ocultos.length, evaluacionesAfectadas: total };
  }
  await db.batch(sentenciasGuardarParticipantes(db, jornada, lista));
  return {
    ok: true,
    participantes: lista.nombres.map((nombre, i) =>
      crearParticipante(i + 1, nombre, lista.carnets[i] ?? null, lista.grupos?.[i] ?? null),
    ),
  };
}

/**
 * v1.8 (`participantes:importar`, PRD §5.10): set only the group of existing
 * rows, by numero, leaving names, carnets and emails as they are. One
 * statement per row, for one neon-http batch (at most 99).
 */
export function sentenciasAsignarGrupos<B extends Bd>(
  db: B,
  jornada: JornadaId,
  grupos: readonly { numero: number; grupo: number | null }[],
) {
  return grupos.map(({ numero, grupo }) =>
    db
      .update(participantes)
      .set({ grupo, updatedAt: sql`now()` })
      .where(and(eq(participantes.jornada, jornada), eq(participantes.numero, numero))),
  );
}

/**
 * v1.9 (`participantes:matricula`, PRD §5.10): set the carnet of existing
 * rows, by numero, and their email when the enrollment list has one (null
 * keeps the stored email). Names and groups stay as they are. One statement
 * per row, for one neon-http batch (at most 99).
 */
export function sentenciasAsignarMatricula<B extends Bd>(
  db: B,
  jornada: JornadaId,
  cambios: readonly { numero: number; carnet: string; correo: string | null }[],
) {
  return cambios.map(({ numero, carnet, correo }) =>
    db
      .update(participantes)
      .set(correo === null ? { carnet, updatedAt: sql`now()` } : { carnet, correo, updatedAt: sql`now()` })
      .where(and(eq(participantes.jornada, jornada), eq(participantes.numero, numero))),
  );
}
