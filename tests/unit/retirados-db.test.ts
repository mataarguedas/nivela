import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EQUIPOS } from "@/config/equipos";
import type { Bd } from "@/lib/db/cuentas";
import { contarDatosRetirados, eliminarDatosRetirados } from "@/lib/db/retirados";
import * as schema from "@/lib/db/schema";

// evaluadores:retirados (PRD Appendix B, v1.15) against a real Postgres
// (PGlite, built from the committed migrations): the data of an evaluator who
// left the roster goes (account, codes, evaluations with their calificaciones,
// attendance marks) and a current evaluator's data stays untouched.

const cliente = new PGlite();
const db = drizzle({ client: cliente, schema }) as unknown as Bd;

const VIGENTES = EQUIPOS.flatMap((e) => e.integrantes.map((i) => i.id));
const ACTUAL = VIGENTES[0];
const RETIRADO = "sebastian-chaves"; // left the roster in v1.15

beforeAll(async () => {
  await migrate(drizzle({ client: cliente, schema }), { migrationsFolder: "drizzle" });
});

afterAll(async () => {
  await cliente.close();
});

async function sembrar(evaluadorId: string, correo: string) {
  await db.insert(schema.cuentas).values({ integranteId: evaluadorId, correo, contrasenaHash: "hash" });
  await db.insert(schema.codigosVerificacion).values({
    integranteId: evaluadorId,
    proposito: "activar",
    codigoHash: "x",
    expiraEn: new Date("2026-11-20T00:00:00Z"),
  });
  for (const participanteId of ["P01", "P02"]) {
    const [evaluacion] = await db
      .insert(schema.evaluaciones)
      .values({ jornada: "manana", competenciaId: "adaptabilidad", evaluadorId, participanteId, puntaje: 3 })
      .returning({ id: schema.evaluaciones.id });
    await db.insert(schema.calificaciones).values(
      [1, 2, 3, 4].map((n) => ({ evaluacionId: evaluacion.id, indicadorId: `adaptabilidad-${n}`, nivel: 3, origen: "manual" as const })),
    );
  }
  await db.insert(schema.asistencia).values({ jornada: "manana", competenciaId: "adaptabilidad", evaluadorId, participanteId: "P03", ausente: true });
}

async function contar(tabla: string): Promise<number> {
  const { rows } = (await db.execute(sql.raw(`select count(*)::int as n from ${tabla}`))) as unknown as { rows: { n: number }[] };
  return rows[0].n;
}

beforeEach(async () => {
  await db.execute(sql`truncate cuentas, evaluaciones, asistencia cascade`);
  await sembrar(ACTUAL, "actual@ejemplo.test");
  await sembrar(RETIRADO, "retirado@ejemplo.test");
});

describe("datos de evaluadores retirados", () => {
  it("el retirado ya no está en la configuración", () => {
    expect(VIGENTES).not.toContain(RETIRADO);
    expect(VIGENTES).toContain(ACTUAL);
  });

  it("cuenta solo lo de quienes no están en la lista vigente", async () => {
    expect(await contarDatosRetirados(db, VIGENTES)).toEqual({ evaluadores: 1, cuentas: 1, evaluaciones: 2, asistencia: 1 });
    // Counting deletes nothing.
    expect(await contar("cuentas")).toBe(2);
  });

  it("elimina cuenta, códigos, evaluaciones (con sus calificaciones) y ausencias del retirado, y nada más", async () => {
    expect(await eliminarDatosRetirados(db, VIGENTES)).toEqual({ evaluadores: 1, cuentas: 1, evaluaciones: 2, asistencia: 1 });
    expect(await contar("cuentas")).toBe(1);
    expect(await contar("codigos_verificacion")).toBe(1);
    expect(await contar("evaluaciones")).toBe(2);
    expect(await contar("calificaciones")).toBe(8);
    expect(await contar("asistencia")).toBe(1);
    const { rows } = (await db.execute(sql`select distinct evaluador_id from evaluaciones`)) as unknown as { rows: { evaluador_id: string }[] };
    expect(rows.map((r) => r.evaluador_id)).toEqual([ACTUAL]);
    // Idempotent: a second run finds nothing.
    expect(await eliminarDatosRetirados(db, VIGENTES)).toEqual({ evaluadores: 0, cuentas: 0, evaluaciones: 0, asistencia: 0 });
  });

  it("con una lista vigente vacía se niega en vez de borrar todo", async () => {
    await expect(eliminarDatosRetirados(db, [])).rejects.toThrow(/vacía/);
    expect(await contar("cuentas")).toBe(2);
  });
});
