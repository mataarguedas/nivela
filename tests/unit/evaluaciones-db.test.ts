import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sentenciasGuardar } from "@/lib/db/evaluaciones";
import * as schema from "@/lib/db/schema";
import type { EvaluacionValida } from "@/lib/validacion";

// Integration test of the submission upsert against a real Postgres (PGlite,
// in-process): "re-submission updates instead of duplicating" is a property of
// the SQL and the constraints, which a mocked db layer couldn't show. The
// committed migrations in drizzle/ build the schema, and the same statements
// the route sends as a neon-http batch run here inside a transaction.

const cliente = new PGlite();
const db = drizzle({ client: cliente, schema });

async function guardar(evaluacion: EvaluacionValida) {
  return db.transaction(async (tx) => {
    const [upsert, borrar, insertar] = sentenciasGuardar(tx, evaluacion);
    const [fila] = await upsert;
    await borrar;
    await insertar;
    return fila;
  });
}

function evaluacion(niveles: [number, number, number, number], extra: Partial<EvaluacionValida> = {}): EvaluacionValida {
  return {
    competenciaId: "adaptabilidad",
    evaluadorId: "jimena-salgado",
    participanteId: "P01",
    calificaciones: niveles.map((nivel, i) => ({
      indicadorId: `adaptabilidad-${i + 1}`,
      nivel,
      observacion: i === 0 ? "Adaptó su método al nuevo procedimiento." : null,
      origen: "manual" as const,
      ia: null,
    })),
    ...extra,
  };
}

const contar = async (tabla: "evaluaciones" | "calificaciones") =>
  (await db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.identifier(tabla)}`)).rows[0].n;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  await db.execute(sql`truncate evaluaciones, calificaciones, uso_jev`);
});

describe("sentenciasGuardar (upsert de una evaluación)", () => {
  it("el primer envío crea 1 evaluación con 4 calificaciones y el puntaje de puntajes.ts", async () => {
    const fila = await guardar(evaluacion([3, 1, 4, 2]));
    expect(fila.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await contar("evaluaciones")).toBe(1);
    expect(await contar("calificaciones")).toBe(4);
    const [guardada] = await db.select().from(schema.evaluaciones);
    expect(guardada.puntaje).toBe(2.5);
  });

  it("reenviar actualiza en lugar de duplicar: mismo id, nuevos niveles, updated_at cambia, created_at no", async () => {
    const primera = await guardar(evaluacion([3, 1, 4, 2]));
    const [antes] = await db.select().from(schema.evaluaciones);
    await new Promise((r) => setTimeout(r, 10)); // now() must move forward

    const segunda = await guardar(evaluacion([4, 4, 4, 3]));
    expect(segunda.id).toBe(primera.id);
    expect(await contar("evaluaciones")).toBe(1);
    expect(await contar("calificaciones")).toBe(4);

    const [despues] = await db.select().from(schema.evaluaciones);
    expect(despues.puntaje).toBe(3.75);
    expect(despues.createdAt.getTime()).toBe(antes.createdAt.getTime());
    expect(despues.updatedAt.getTime()).toBeGreaterThan(antes.updatedAt.getTime());
    expect(segunda.actualizadoEn.getTime()).toBe(despues.updatedAt.getTime());

    const niveles = await db
      .select({ indicadorId: schema.calificaciones.indicadorId, nivel: schema.calificaciones.nivel })
      .from(schema.calificaciones)
      .orderBy(schema.calificaciones.indicadorId);
    expect(niveles.map((n) => n.nivel)).toEqual([4, 4, 4, 3]);
  });

  it("otra persona evaluadora u otro participante crean filas aparte", async () => {
    await guardar(evaluacion([3, 3, 3, 3]));
    await guardar(evaluacion([2, 2, 2, 2], { evaluadorId: "allison-campos-morera" }));
    await guardar(evaluacion([1, 1, 1, 1], { participanteId: "P02" }));
    expect(await contar("evaluaciones")).toBe(3);
    expect(await contar("calificaciones")).toBe(12);
  });

  it("guarda los metadatos de IA y una observación nula", async () => {
    const conIa = evaluacion([3, 2, 2, 2]);
    conIa.calificaciones[0] = {
      ...conIa.calificaciones[0],
      origen: "ia",
      ia: { nivelSugerido: 3, probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 }, confianza: 0.71, modelo: "jev-1.13.0" },
    };
    await guardar(conIa);
    const filas = await db
      .select()
      .from(schema.calificaciones)
      .where(eq(schema.calificaciones.indicadorId, "adaptabilidad-1"));
    expect(filas[0]).toMatchObject({
      origen: "ia",
      iaNivelSugerido: 3,
      iaProbabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 },
      iaModelo: "jev-1.13.0",
    });
    expect(filas[0].iaConfianza).toBeCloseTo(0.71, 5);
    const segunda = await db.select().from(schema.calificaciones).where(eq(schema.calificaciones.indicadorId, "adaptabilidad-2"));
    expect(segunda[0].observacion).toBeNull();
    expect(segunda[0].iaModelo).toBeNull();
  });

  it("si falla una sentencia no queda nada a medias (transacción)", async () => {
    await guardar(evaluacion([3, 3, 3, 3]));
    // Nivel 5 passes no validation here on purpose: the DB check must reject it.
    await expect(guardar(evaluacion([4, 4, 4, 5]))).rejects.toThrow();
    const niveles = await db.select({ nivel: schema.calificaciones.nivel }).from(schema.calificaciones);
    expect(niveles.map((n) => n.nivel)).toEqual([3, 3, 3, 3]);
    const [fila] = await db.select().from(schema.evaluaciones);
    expect(fila.puntaje).toBe(3);
  });

  it("las restricciones de la tabla rechazan un origen desconocido y borran en cascada", async () => {
    const { id } = await guardar(evaluacion([3, 3, 3, 3]));
    await expect(
      db.execute(sql`insert into calificaciones (evaluacion_id, indicador_id, nivel, origen) values (${id}, 'x', 2, 'otro')`),
    ).rejects.toThrow();
    await db.delete(schema.evaluaciones).where(eq(schema.evaluaciones.id, id));
    expect(await contar("calificaciones")).toBe(0);
  });
});

afterAll(async () => {
  await cliente.close();
});
