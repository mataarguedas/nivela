import "server-only";
import { count, notInArray } from "drizzle-orm";
import type { Bd } from "./cuentas";
import { asistencia, cuentas, evaluaciones } from "./schema";

// Data of evaluators who left the roster (PRD Appendix B, v1.15). Removing
// someone from src/config/equipos.ts already drops their evaluations and
// attendance marks from every report (agregarReporte keeps only the team's
// members), invalidates their session and treats their email as unknown at
// sign-in (cuentaValida in lib/cuentas.ts), but their rows stay in the DB:
// their account (with its email), its verification codes, their evaluations
// (with their calificaciones) and their attendance marks. These statements
// count and delete exactly those rows: every evaluator id that isn't in
// `vigentes` (the roster's integrante ids), never one that is. Codes and
// calificaciones go by ON DELETE CASCADE. Each statement is idempotent, so an
// interrupted run is finished by running it again.

export type DatosRetirados = {
  /** Distinct evaluator ids with data that are no longer in the roster. */
  evaluadores: number;
  cuentas: number;
  evaluaciones: number;
  asistencia: number;
};

function exigirVigentes(vigentes: readonly string[]): string[] {
  // An empty roster would match every row: refuse rather than wipe the tables.
  if (vigentes.length === 0) throw new Error("La lista de evaluadores vigentes está vacía; no se elimina nada.");
  return [...vigentes];
}

export async function contarDatosRetirados(db: Bd, vigentes: readonly string[]): Promise<DatosRetirados> {
  const ids = exigirVigentes(vigentes);
  const [c] = await db.select({ n: count() }).from(cuentas).where(notInArray(cuentas.integranteId, ids));
  const [e] = await db.select({ n: count() }).from(evaluaciones).where(notInArray(evaluaciones.evaluadorId, ids));
  const [a] = await db.select({ n: count() }).from(asistencia).where(notInArray(asistencia.evaluadorId, ids));
  const distintos = new Set<string>();
  for (const fila of await db.selectDistinct({ id: cuentas.integranteId }).from(cuentas).where(notInArray(cuentas.integranteId, ids))) {
    distintos.add(fila.id);
  }
  for (const fila of await db
    .selectDistinct({ id: evaluaciones.evaluadorId })
    .from(evaluaciones)
    .where(notInArray(evaluaciones.evaluadorId, ids))) {
    distintos.add(fila.id);
  }
  for (const fila of await db
    .selectDistinct({ id: asistencia.evaluadorId })
    .from(asistencia)
    .where(notInArray(asistencia.evaluadorId, ids))) {
    distintos.add(fila.id);
  }
  return { evaluadores: distintos.size, cuentas: c.n, evaluaciones: e.n, asistencia: a.n };
}

/** Deletes the rows contarDatosRetirados() counts; returns how many went. */
export async function eliminarDatosRetirados(db: Bd, vigentes: readonly string[]): Promise<DatosRetirados> {
  const antes = await contarDatosRetirados(db, vigentes);
  const ids = exigirVigentes(vigentes);
  await db.delete(asistencia).where(notInArray(asistencia.evaluadorId, ids));
  await db.delete(evaluaciones).where(notInArray(evaluaciones.evaluadorId, ids));
  await db.delete(cuentas).where(notInArray(cuentas.integranteId, ids));
  return antes;
}
