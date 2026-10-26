import "server-only";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getDb } from "./index";
import { usoJev } from "./schema";
import type * as schema from "./schema";

// Per-session Jev cap (FR-16, CLAUDE.md → Jev integration): at most
// LIMITE_ANALISIS_POR_HORA analyses per session per clock hour, counted in
// `uso_jev` with one atomic upsert-increment, so concurrent requests from the
// same session can't both slip under the limit. The hour window comes from
// the database clock, not the server's. Every attempt counts, including those
// rejected by the cap or failed upstream: the check runs before calling Jev.

export const LIMITE_ANALISIS_POR_HORA = 60;

type Bd = PgDatabase<PgQueryResultHKT, typeof schema>;

export type UsoRegistrado = {
  /** Analyses in the current window, this one included. */
  conteo: number;
  /** Seconds until the window ends (for Retry-After), at least 1. */
  segundosRestantes: number;
};

/** The increment statement, generic over the database so the test can run it on PGlite. */
export function sentenciaRegistrarUso<B extends Bd>(db: B, sesionId: string) {
  return db
    .insert(usoJev)
    .values({ sesionId, ventana: sql`date_trunc('hour', now())`, conteo: 1 })
    .onConflictDoUpdate({
      target: [usoJev.sesionId, usoJev.ventana],
      set: { conteo: sql`${usoJev.conteo} + 1` },
    })
    .returning({
      conteo: usoJev.conteo,
      segundosRestantes: sql<number>`ceil(extract(epoch from (${usoJev.ventana} + interval '1 hour' - now())))`.mapWith(Number),
    });
}

export function leerUso(filas: { conteo: number; segundosRestantes: number }[]): UsoRegistrado {
  const fila = filas[0];
  if (!fila) throw new Error("uso_jev upsert returned no row");
  return { conteo: fila.conteo, segundosRestantes: Math.max(1, fila.segundosRestantes) };
}

/** Counts one analysis for the session and returns the window's total. */
export async function registrarUsoJev(sesionId: string): Promise<UsoRegistrado> {
  return leerUso(await sentenciaRegistrarUso(getDb(), sesionId));
}
