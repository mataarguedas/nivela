import "server-only";
import { and, count, desc, eq, gt, inArray, isNull, lt, max, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { codigosVerificacion, cuentas } from "./schema";
import type * as schema from "./schema";

// Statements on evaluator accounts and their verification codes (PRD §5.12,
// §9.2). Each one takes the db, so the same code runs on neon-http in the
// app and on PGlite in tests. Every counter that guards a limit changes in a
// single `UPDATE … RETURNING`, so two concurrent requests can't both pass.
// Emails and hashes are never logged here or by the callers.

export type Bd = PgDatabase<PgQueryResultHKT, typeof schema>;

export type FilaCuenta = typeof cuentas.$inferSelect;
export type FilaCodigo = typeof codigosVerificacion.$inferSelect;
export type Proposito = FilaCodigo["proposito"];

const marca = (fecha: Date) => sql`${fecha.toISOString()}::timestamptz`;

export async function cuentaPorCorreo(db: Bd, correo: string): Promise<FilaCuenta | undefined> {
  const [fila] = await db.select().from(cuentas).where(eq(cuentas.correo, correo)).limit(1);
  return fila;
}

export async function cuentaPorId(db: Bd, integranteId: string): Promise<FilaCuenta | undefined> {
  const [fila] = await db.select().from(cuentas).where(eq(cuentas.integranteId, integranteId)).limit(1);
  return fila;
}

export async function cuentasPorIds(db: Bd, ids: readonly string[]): Promise<FilaCuenta[]> {
  if (ids.length === 0) return [];
  return db.select().from(cuentas).where(inArray(cuentas.integranteId, [...ids]));
}

/**
 * Counts one wrong password. The `limite`-th failure in a row locks the
 * account until `hasta` and restarts the count. Returns the lock, if any.
 */
export async function registrarContrasenaFallida(
  db: Bd,
  integranteId: string,
  limite: number,
  hasta: Date,
): Promise<{ bloqueadaHasta: Date | null } | undefined> {
  const alcanza = sql`${cuentas.intentosFallidos} + 1 >= ${limite}`;
  const [fila] = await db
    .update(cuentas)
    .set({
      intentosFallidos: sql`case when ${alcanza} then 0 else ${cuentas.intentosFallidos} + 1 end`,
      bloqueadaHasta: sql`case when ${alcanza} then ${marca(hasta)} else ${cuentas.bloqueadaHasta} end`,
      updatedAt: sql`now()`,
    })
    .where(eq(cuentas.integranteId, integranteId))
    .returning({ bloqueadaHasta: cuentas.bloqueadaHasta });
  return fila;
}

/** A successful sign-in: clears the failure count and the lock, stamps the last access. */
export async function registrarIngreso(db: Bd, integranteId: string, ahora: Date): Promise<void> {
  await db
    .update(cuentas)
    .set({ intentosFallidos: 0, bloqueadaHasta: null, ultimoAcceso: ahora, updatedAt: sql`now()` })
    .where(eq(cuentas.integranteId, integranteId));
}

/** Sets the password after a valid code; the first time also marks the activation. */
export async function guardarContrasena(db: Bd, integranteId: string, hash: string, ahora: Date): Promise<void> {
  await db
    .update(cuentas)
    .set({
      contrasenaHash: hash,
      activadaEn: sql`coalesce(${cuentas.activadaEn}, ${marca(ahora)})`,
      intentosFallidos: 0,
      bloqueadaHasta: null,
      ultimoAcceso: ahora,
      updatedAt: sql`now()`,
    })
    .where(eq(cuentas.integranteId, integranteId));
}

/** Codes created for this account since `desde`, and when the latest was created. */
export async function codigosRecientes(
  db: Bd,
  integranteId: string,
  desde: Date,
): Promise<{ total: number; ultimo: Date | null }> {
  const [fila] = await db
    .select({ total: count(), ultimo: max(codigosVerificacion.createdAt) })
    .from(codigosVerificacion)
    .where(and(eq(codigosVerificacion.integranteId, integranteId), gt(codigosVerificacion.createdAt, marca(desde))));
  return { total: fila?.total ?? 0, ultimo: fila?.ultimo ? new Date(fila.ultimo) : null };
}

export async function insertarCodigo(
  db: Bd,
  valores: { integranteId: string; proposito: Proposito; codigoHash: string; expiraEn: Date; creadoEn: Date },
): Promise<void> {
  await db.insert(codigosVerificacion).values({
    integranteId: valores.integranteId,
    proposito: valores.proposito,
    codigoHash: valores.codigoHash,
    expiraEn: valores.expiraEn,
    createdAt: valores.creadoEn,
  });
}

/** The newest code of the account: a new code invalidates every older one. */
export async function ultimoCodigo(db: Bd, integranteId: string): Promise<FilaCodigo | undefined> {
  const [fila] = await db
    .select()
    .from(codigosVerificacion)
    .where(eq(codigosVerificacion.integranteId, integranteId))
    .orderBy(desc(codigosVerificacion.createdAt))
    .limit(1);
  return fila;
}

/** Spends one attempt on an unused code; false when none is left (or it was used meanwhile). */
export async function gastarIntento(db: Bd, codigoId: string, limite: number): Promise<boolean> {
  const filas = await db
    .update(codigosVerificacion)
    .set({ intentos: sql`${codigosVerificacion.intentos} + 1` })
    .where(
      and(
        eq(codigosVerificacion.id, codigoId),
        lt(codigosVerificacion.intentos, limite),
        isNull(codigosVerificacion.usadoEn),
      ),
    )
    .returning({ id: codigosVerificacion.id });
  return filas.length > 0;
}

/** Marks the code used; false if another request used it first (single use). */
export async function usarCodigo(db: Bd, codigoId: string, ahora: Date): Promise<boolean> {
  const filas = await db
    .update(codigosVerificacion)
    .set({ usadoEn: ahora })
    .where(and(eq(codigosVerificacion.id, codigoId), isNull(codigosVerificacion.usadoEn)))
    .returning({ id: codigosVerificacion.id });
  return filas.length > 0;
}

/**
 * Sets (or clears) an account's email. A different email returns the account
 * to "Pendiente de activar": password, activation, lock and codes go, so only
 * the new mailbox's owner can activate it. The same email changes nothing.
 * Returns whether anything changed.
 */
export async function cambiarCorreo(db: Bd, integranteId: string, correo: string | null): Promise<boolean> {
  const actual = await cuentaPorId(db, integranteId);
  if (actual && actual.correo === correo) return false;
  if (!actual && correo === null) return false;
  await db
    .insert(cuentas)
    .values({ integranteId, correo })
    .onConflictDoUpdate({
      target: cuentas.integranteId,
      set: {
        correo,
        contrasenaHash: null,
        activadaEn: null,
        intentosFallidos: 0,
        bloqueadaHasta: null,
        updatedAt: sql`now()`,
      },
    });
  await borrarCodigos(db, integranteId);
  return true;
}

/** "Restablecer acceso": clears the password; the evaluator activates again with a new code. */
export async function restablecerAcceso(db: Bd, integranteId: string): Promise<void> {
  await db
    .update(cuentas)
    .set({ contrasenaHash: null, activadaEn: null, intentosFallidos: 0, bloqueadaHasta: null, updatedAt: sql`now()` })
    .where(eq(cuentas.integranteId, integranteId));
  await borrarCodigos(db, integranteId);
}

export async function borrarCodigos(db: Bd, integranteId: string): Promise<void> {
  await db.delete(codigosVerificacion).where(eq(codigosVerificacion.integranteId, integranteId));
}
