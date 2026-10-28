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
import { registrarError } from "@/lib/registro";
import { getDb } from "./index";
import { evaluaciones, participantes } from "./schema";
import type * as schema from "./schema";

// Reads and writes of the evaluados the admin manages (PRD §9.2). Not cached:
// one small query per render keeps every page, every server instance and the
// submission check in agreement right after the admin saves. Pages call
// these behind Suspense after `connection()`, so the build never needs the DB.

type Bd = PgDatabase<PgQueryResultHKT, typeof schema>;

export type FilaParticipante = { numero: number; nombre: string | null; activo: boolean };

/** What the admin editor starts from. */
export type EstadoParticipantes = {
  /** Active participants now (the fallback count while nothing is saved). */
  cantidad: number;
  /** Stored name per numero (index = numero − 1), hidden rows included, so raising the count brings them back. */
  nombres: (string | null)[];
};

export function sentenciaLeerFilas<B extends Bd>(db: B) {
  return db
    .select({ numero: participantes.numero, nombre: participantes.nombre, activo: participantes.activo })
    .from(participantes)
    .orderBy(asc(participantes.numero));
}

function cantidadRespaldo(): number {
  return leerCantidadParticipantes(process.env.CANTIDAD_PARTICIPANTES);
}

/** Active participants in order; the unnamed fallback list while the table is empty. */
export function participantesActivos(filas: readonly FilaParticipante[], respaldo: number): Participante[] {
  if (filas.length === 0) return generarParticipantes(respaldo);
  return filas.filter((f) => f.activo).map((f) => crearParticipante(f.numero, f.nombre));
}

export function estadoDesdeFilas(filas: readonly FilaParticipante[], respaldo: number): EstadoParticipantes {
  if (filas.length === 0) return { cantidad: respaldo, nombres: [] };
  const maximo = Math.max(...filas.map((f) => f.numero));
  const nombres: (string | null)[] = Array.from({ length: maximo }, () => null);
  for (const f of filas) nombres[f.numero - 1] = f.nombre;
  return { cantidad: filas.filter((f) => f.activo).length, nombres };
}

export async function obtenerParticipantes(): Promise<Participante[]> {
  return participantesActivos(await sentenciaLeerFilas(getDb()), cantidadRespaldo());
}

/** Every stored participant, hidden ones included (the CSV keeps their rows). */
export async function obtenerTodosLosParticipantes(): Promise<Participante[]> {
  const filas = await sentenciaLeerFilas(getDb());
  if (filas.length === 0) return generarParticipantes(cantidadRespaldo());
  return filas.map((f) => crearParticipante(f.numero, f.nombre));
}

/**
 * For pages: reads at request time (`connection()`, so a prerender never
 * touches the DB) and turns a DB failure into `null`, logged without PII, so
 * the page can say so instead of crashing.
 */
export async function cargarParticipantes(ruta: string): Promise<Participante[] | null> {
  await connection();
  const inicio = Date.now();
  try {
    return await obtenerParticipantes();
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/** The admin editor's starting point, read like cargarParticipantes (null on a DB failure). */
export async function cargarEstadoParticipantes(ruta: string): Promise<EstadoParticipantes | null> {
  await connection();
  const inicio = Date.now();
  try {
    return estadoDesdeFilas(await sentenciaLeerFilas(getDb()), cantidadRespaldo());
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/** Evaluations (any competencia) received by these participants. */
export function sentenciaContarEvaluaciones<B extends Bd>(db: B, ids: readonly string[]) {
  return db
    .select({ total: count() })
    .from(evaluaciones)
    .where(inArray(evaluaciones.participanteId, [...ids]));
}

/**
 * Saving the list as two statements for one transaction (a neon-http batch):
 * upsert P01…P{n} as active with their names, then hide every row above n.
 * Rows are never deleted, so hidden participants keep their names.
 */
export function sentenciasGuardarParticipantes<B extends Bd>(db: B, nombres: readonly (string | null)[]) {
  const cantidad = nombres.length;
  const upsert = db
    .insert(participantes)
    .values(nombres.map((nombre, i) => ({ id: idParticipante(i + 1), numero: i + 1, nombre, activo: true })))
    .onConflictDoUpdate({
      target: participantes.id,
      set: { nombre: sql`excluded.nombre`, activo: true, updatedAt: sql`now()` },
    });
  const ocultar = db
    .update(participantes)
    .set({ activo: false, updatedAt: sql`now()` })
    .where(and(gt(participantes.numero, cantidad), eq(participantes.activo, true)));
  return [upsert, ocultar] as const;
}

export type ResultadoGuardar =
  | { ok: true; participantes: Participante[] }
  | { ok: false; ocultos: number; evaluacionesAfectadas: number };

/**
 * Saves the list. Without `confirmar`, refuses when participants that would
 * be hidden already have evaluations, and says how many (PRD §5.10).
 */
export async function guardarParticipantes(nombres: readonly (string | null)[], confirmar: boolean): Promise<ResultadoGuardar> {
  const db = getDb();
  const actuales = participantesActivos(await sentenciaLeerFilas(db), cantidadRespaldo());
  const ocultos = actuales.filter((p) => p.numero > nombres.length).map((p) => p.id);
  if (ocultos.length > 0 && !confirmar) {
    const [{ total }] = await sentenciaContarEvaluaciones(db, ocultos);
    if (total > 0) return { ok: false, ocultos: ocultos.length, evaluacionesAfectadas: total };
  }
  await db.batch(sentenciasGuardarParticipantes(db, nombres));
  return { ok: true, participantes: nombres.map((nombre, i) => crearParticipante(i + 1, nombre)) };
}
