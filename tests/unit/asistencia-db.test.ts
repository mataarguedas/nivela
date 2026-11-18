import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { JornadaId } from "@/config/jornadas";
import { sqlMarcar, type ClaveAsistencia } from "@/lib/db/asistencia";
import { sentenciasGuardar } from "@/lib/db/evaluaciones";
import * as schema from "@/lib/db/schema";
import type { EvaluacionValida } from "@/lib/validacion";

// The attendance mark against a real Postgres (PGlite, built from the
// committed migrations): "marking absent is refused once that evaluator sent
// the evaluation" lives in the INSERT … WHERE NOT EXISTS, so only SQL can
// show it. The same statement the route sends through neon-http runs here.

const cliente = new PGlite();
const db = drizzle({ client: cliente, schema });

const CLAVE: ClaveAsistencia = { competenciaId: "adaptabilidad", evaluadorId: "jimena-salgado", participanteId: "P05" };

async function marcar(ausente: boolean, clave: ClaveAsistencia = CLAVE, jornada: JornadaId = "manana") {
  const { rows } = await db.execute<{ updated_at: string }>(sqlMarcar(jornada, clave, ausente));
  return rows;
}

async function enviar(clave: ClaveAsistencia = CLAVE, jornada: JornadaId = "manana") {
  const evaluacion: EvaluacionValida = {
    ...clave,
    calificaciones: [1, 2, 3, 4].map((n) => ({
      indicadorId: `adaptabilidad-${n}`,
      nivel: 3,
      observacion: null,
      origen: "manual" as const,
      ia: null,
    })),
  };
  await db.transaction(async (tx) => {
    const [upsert, borrar, insertar] = sentenciasGuardar(tx, jornada, evaluacion);
    await upsert;
    await borrar;
    await insertar;
  });
}

const filas = () => db.select().from(schema.asistencia).orderBy(schema.asistencia.jornada);

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  await db.execute(sql`truncate evaluaciones, calificaciones, asistencia`);
});

afterAll(async () => {
  await cliente.close();
});

describe("sqlMarcar (asistencia)", () => {
  it("marca ausente, luego presente, sobre la misma fila", async () => {
    expect(await marcar(true)).toHaveLength(1);
    expect(await filas()).toMatchObject([{ ...CLAVE, jornada: "manana", ausente: true }]);
    expect(await marcar(false)).toHaveLength(1);
    const [fila] = await filas();
    expect(fila.ausente).toBe(false);
    expect(await filas()).toHaveLength(1);
  });

  it("no marca ausente si esa persona ya envió la evaluación: sin fila devuelta ni escrita", async () => {
    await enviar();
    expect(await marcar(true)).toEqual([]);
    expect(await filas()).toEqual([]);
  });

  it("tampoco cambia una marca previa de presente a ausente después de enviar", async () => {
    await marcar(false);
    await enviar();
    expect(await marcar(true)).toEqual([]);
    const [fila] = await filas();
    expect(fila.ausente).toBe(false);
  });

  it("marcar presente siempre se puede, aunque ya haya enviado", async () => {
    await enviar();
    expect(await marcar(false)).toHaveLength(1);
  });

  it("la evaluación de otra persona, de otro participante o de la otra jornada no bloquea", async () => {
    await enviar({ ...CLAVE, evaluadorId: "allison-campos-morera" });
    await enviar({ ...CLAVE, participanteId: "P06" });
    await enviar(CLAVE, "noche");
    expect(await marcar(true)).toHaveLength(1);
  });

  it("la misma clave en otra jornada es otra marca", async () => {
    await marcar(true);
    await marcar(false, CLAVE, "noche");
    expect((await filas()).map((f) => [f.jornada, f.ausente])).toEqual([
      ["manana", true],
      ["noche", false],
    ]);
  });

  it("la restricción rechaza una jornada desconocida", async () => {
    await expect(marcar(true, CLAVE, "tarde" as JornadaId)).rejects.toThrow();
  });
});
