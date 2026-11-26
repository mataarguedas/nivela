import { PGlite } from "@electric-sql/pglite";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NombreHoja } from "@/lib/agregarParticipantes";
import { planificarConservar } from "@/lib/conservarParticipantes";
import {
  estadoDesdeFilas,
  participantesActivos,
  sentenciaLeerFilas,
  sentenciaLeerFilasCompletas,
  sentenciasGuardarParticipantes,
  sentenciasRenumerar,
} from "@/lib/db/participantes";
import * as schema from "@/lib/db/schema";
import type { FilaGuardada } from "@/lib/distribucion";

// participantes:conservar (PRD §5.10, v1.19): only the docentes' final list
// stays visible, renumbered P01…Pk; everyone else is hidden after them.
// Fake names only.

function fila(numero: number, nombre: string | null, activo = true): FilaGuardada {
  return { numero, nombre, carnet: null, tieneCorreo: false, grupo: null, activo };
}
const hoja = (...nombres: string[]): NombreHoja[] =>
  nombres.map((nombre, i) => ({ nombre, posicion: `línea ${i + 2}` }));

describe("planificarConservar", () => {
  const guardadas = [fila(1, "Ana Solís"), fila(2, "Beto Ruiz"), fila(3, "Caro Vega"), fila(4, "Dani Mora")];

  it("los de la lista pasan a P01… en su orden actual; el resto se oculta después", () => {
    const plan = planificarConservar(hoja("Dani Mora", "vega caro"), guardadas);
    expect(plan).toEqual({
      ok: true,
      mapa: [
        { de: 3, a: 1, activo: true },
        { de: 4, a: 2, activo: true },
        { de: 1, a: 3, activo: false },
        { de: 2, a: 4, activo: false },
      ],
      conservados: 2,
      ocultados: 2,
      cambios: [
        { deId: "P03", aId: "P01" },
        { deId: "P04", aId: "P02" },
        { deId: "P01", aId: "P03" },
        { deId: "P02", aId: "P04" },
      ],
    });
  });

  it("los ya ocultos siguen ocultos, al final", () => {
    const plan = planificarConservar(hoja("Ana Solís"), [fila(1, "Ana Solís"), fila(2, "Beto Ruiz", false)]);
    expect(plan).toMatchObject({
      ok: true,
      mapa: [
        { de: 1, a: 1, activo: true },
        { de: 2, a: 2, activo: false },
      ],
      ocultados: 0,
      cambios: [],
    });
  });

  it("rechaza, por posición, un nombre sin coincidencia, uno oculto, uno ambiguo o repetido", () => {
    const filas = [fila(1, "Ana Solís"), fila(2, "Solís Ana"), fila(3, "Beto Ruiz"), fila(4, "Eva Ríos", false)];
    const plan = planificarConservar(hoja("Ana Solís", "Zoe Paz", "Eva Ríos", "Beto Ruiz", "RUIZ Beto"), filas);
    expect(plan).toEqual({
      ok: false,
      errores: [
        "línea 2: coincide con varios participantes de la lista guardada.",
        "línea 3: no coincide con ningún participante visible de la lista guardada.",
        "línea 4: no coincide con ningún participante visible de la lista guardada.",
        "línea 6: es el mismo participante que la línea 5.",
      ],
    });
  });
});

describe("sentenciasRenumerar en la base de datos", () => {
  const cliente = new PGlite();
  const db = drizzle({ client: cliente, schema });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    await db.execute(sql`truncate participantes, evaluaciones, calificaciones, asistencia, envios_resultados`);
  });
  afterAll(async () => {
    await cliente.close();
  });

  // In production these run as one neon-http batch (a transaction); here, in order.
  async function enTransaccion(sentencias: readonly PromiseLike<unknown>[]) {
    for (const s of sentencias) await s;
  }

  it("intercambia números con sus evaluaciones, asistencia y envíos, y oculta al resto", async () => {
    await enTransaccion(
      sentenciasGuardarParticipantes(db, "noche", {
        nombres: ["Ana Solís", "Beto Ruiz", "Caro Vega"],
        carnets: ["100000001", null, "300000003"],
        grupos: [1, 2, 3],
        correos: ["ana@ejemplo.test", null, null],
      }),
    );
    // The other jornada's P01 must not move.
    await enTransaccion(
      sentenciasGuardarParticipantes(db, "manana", { nombres: ["Zoe Paz"], carnets: [null], correos: [null] }),
    );
    const evaluacion = (participanteId: string, jornada: "manana" | "noche" = "noche") => ({
      jornada,
      competenciaId: "adaptabilidad",
      evaluadorId: "e1",
      participanteId,
      puntaje: 2.5,
    });
    await db.insert(schema.evaluaciones).values([evaluacion("P01"), evaluacion("P03"), evaluacion("P01", "manana")]);
    await db.insert(schema.asistencia).values({
      jornada: "noche",
      competenciaId: "adaptabilidad",
      evaluadorId: "e2",
      participanteId: "P03",
      ausente: true,
    });
    await db.insert(schema.enviosResultados).values({
      jornada: "noche",
      competenciaId: "consolidado",
      participanteId: "P01",
      estado: "enviado",
    });

    // Keep Caro (P03) and Beto (P02): they become P01 and P02 in current order (Beto first), Ana is hidden as P03.
    const plan = planificarConservar(
      hoja("Caro Vega", "Beto Ruiz"),
      (await sentenciaLeerFilas(db, "noche")).map((f) => ({ ...f, grupo: f.grupo ?? null, tieneCorreo: false })),
    );
    if (!plan.ok) throw new Error("plan");
    const completas = await sentenciaLeerFilasCompletas(db, "noche");
    await enTransaccion(sentenciasRenumerar(db, "noche", completas, plan.mapa));

    const filas = await sentenciaLeerFilasCompletas(db, "noche");
    expect(filas.map((f) => [f.id, f.nombre, f.carnet, f.grupo, f.correo, f.activo])).toEqual([
      ["P01", "Beto Ruiz", null, 2, null, true],
      ["P02", "Caro Vega", "300000003", 3, null, true],
      ["P03", "Ana Solís", "100000001", 1, "ana@ejemplo.test", false],
    ]);
    expect(participantesActivos(await sentenciaLeerFilas(db, "noche"), 20).map((p) => p.etiqueta)).toEqual([
      "Beto Ruiz",
      "Caro Vega",
    ]);
    // The admin editor sees a contiguous list of 2 (the hidden one comes back if the count goes to 3).
    expect(estadoDesdeFilas(await sentenciaLeerFilas(db, "noche"), 20).cantidad).toBe(2);

    const evals = await db
      .select({ jornada: schema.evaluaciones.jornada, id: schema.evaluaciones.participanteId })
      .from(schema.evaluaciones)
      .orderBy(asc(schema.evaluaciones.jornada), asc(schema.evaluaciones.participanteId));
    // Ana's (P01 → P03) and Caro's (P03 → P02) evaluations followed them; the morning one stayed.
    expect(evals).toEqual([
      { jornada: "manana", id: "P01" },
      { jornada: "noche", id: "P02" },
      { jornada: "noche", id: "P03" },
    ]);
    const marcas = await db.select({ id: schema.asistencia.participanteId }).from(schema.asistencia);
    expect(marcas).toEqual([{ id: "P02" }]);
    const envios = await db
      .select({ id: schema.enviosResultados.participanteId })
      .from(schema.enviosResultados)
      .where(eq(schema.enviosResultados.jornada, "noche"));
    expect(envios).toEqual([{ id: "P03" }]);
  });

  it("rechaza un mapa que no cubre las filas", async () => {
    await enTransaccion(
      sentenciasGuardarParticipantes(db, "noche", { nombres: ["Ana Solís"], carnets: [null], correos: [null] }),
    );
    const completas = await sentenciaLeerFilasCompletas(db, "noche");
    expect(() => sentenciasRenumerar(db, "noche", completas, [])).toThrow();
  });
});
