import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { leerListaNombres, planificarAgregado, type NombreHoja } from "@/lib/agregarParticipantes";
import {
  participantesActivos,
  sentenciaAgregarParticipantes,
  sentenciaContarAsistencia,
  sentenciaLeerFilas,
  sentenciasGuardarParticipantes,
} from "@/lib/db/participantes";
import * as schema from "@/lib/db/schema";
import type { FilaGuardada } from "@/lib/distribucion";

// participantes:agregar (PRD §5.10, v1.17): extra students appended after a
// jornada's saved list, in one group. Fake names only: the real sheets are
// PII and never enter the repo.

const celdas = (valores: Record<string, string>) => new Map(Object.entries(valores));

function fila(numero: number, nombre: string | null, grupo: number | null = null, activo = true): FilaGuardada {
  return { numero, nombre, carnet: null, tieneCorreo: false, grupo, activo };
}

const nuevos = (...nombres: string[]): NombreHoja[] => nombres.map((nombre, i) => ({ nombre, posicion: `fila ${i + 1}` }));

describe("leerListaNombres", () => {
  it("lee una columna de nombres en orden de fila, sin numeración", () => {
    const lista = leerListaNombres(celdas({ A2: "Beto Ruiz Mora", A1: "1. Ana Lucía  Solís Vega ", A3: " " }));
    expect(lista.errores).toEqual([]);
    expect(lista.nombres).toEqual([
      { nombre: "Ana Lucía Solís Vega", posicion: "fila 1" },
      { nombre: "Beto Ruiz Mora", posicion: "fila 2" },
    ]);
  });

  it("rechaza una hoja con más de una columna", () => {
    const lista = leerListaNombres(celdas({ A1: "Grupo 1", B1: "Grupo 2", A2: "1. Ruiz Mora Beto" }));
    expect(lista.nombres).toEqual([]);
    expect(lista.errores[0]).toMatch(/una sola columna/);
  });

  it("rechaza una hoja vacía", () => {
    expect(leerListaNombres(celdas({})).errores).toEqual(["La hoja no tiene nombres."]);
  });

  it("señala por posición, sin el nombre, lo que no parece un nombre", () => {
    const lista = leerListaNombres(celdas({ A1: "Ana Solís", A2: "ana@ejemplo.test", A3: "Beto", A4: "Caro 88887777" }));
    expect(lista.errores).toEqual([
      expect.stringMatching(/^fila 2: /),
      expect.stringMatching(/^fila 3: /),
      expect.stringMatching(/^fila 4: /),
    ]);
    expect(lista.errores.join(" ")).not.toMatch(/ejemplo|Beto|Caro/);
  });
});

describe("planificarAgregado", () => {
  const guardadas = [fila(1, "Ana Solís", 1), fila(2, "Beto Ruiz", 2), fila(3, null, 2)];

  it("agrega después de la lista activa, en el grupo siguiente", () => {
    const plan = planificarAgregado(nuevos("Caro Vega", "Dani Mora"), guardadas);
    expect(plan).toEqual({
      ok: true,
      inicio: 4,
      nombres: ["Caro Vega", "Dani Mora"],
      grupo: 3,
      ids: ["P04", "P05"],
    });
  });

  it("usa el grupo pedido, o el 1 si nadie tiene grupo", () => {
    expect(planificarAgregado(nuevos("Caro Vega"), guardadas, 7)).toMatchObject({ ok: true, grupo: 7 });
    expect(planificarAgregado(nuevos("Caro Vega"), [fila(1, "Ana Solís")])).toMatchObject({ ok: true, grupo: 1 });
  });

  it("rechaza un grupo fuera de 1–20", () => {
    expect(planificarAgregado(nuevos("Caro Vega"), guardadas, 21)).toMatchObject({ ok: false });
    expect(planificarAgregado(nuevos("Caro Vega"), [fila(1, "Ana Solís", 20)])).toMatchObject({ ok: false });
  });

  it("rechaza una jornada sin lista guardada", () => {
    const plan = planificarAgregado(nuevos("Caro Vega"), []);
    expect(plan.ok).toBe(false);
  });

  it("rechaza si hay participantes ocultos, que perderían su número", () => {
    const plan = planificarAgregado(nuevos("Caro Vega"), [...guardadas, fila(4, "Eva Ríos", null, false)]);
    expect(plan).toMatchObject({ ok: false, errores: [expect.stringMatching(/oculto/)] });
  });

  it("rechaza nombres repetidos o ya guardados, sin acentos ni orden", () => {
    const plan = planificarAgregado(nuevos("Caro Vega", "VEGA caro", "Ana Solis"), guardadas);
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.errores).toEqual([
      "fila 2: repite el nombre de la fila 1.",
      "fila 3: ya está en la lista guardada de la jornada.",
    ]);
  });

  it("rechaza pasar de 99 participantes", () => {
    const muchas = Array.from({ length: 95 }, (_, i) => fila(i + 1, null));
    const plan = planificarAgregado(nuevos("A Uno", "B Dos", "C Tres", "D Cuatro", "E Cinco"), muchas);
    expect(plan).toMatchObject({ ok: false, errores: [expect.stringMatching(/100 participantes/)] });
  });
});

describe("participantes:agregar en la base de datos", () => {
  const cliente = new PGlite();
  const db = drizzle({ client: cliente, schema });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await db.execute(sql`truncate participantes, asistencia`);
  });

  afterAll(async () => {
    await cliente.close();
  });

  it("agrega al final sin tocar la lista guardada ni la otra jornada", async () => {
    await db.transaction(async (tx) => {
      for (const s of sentenciasGuardarParticipantes(tx, "noche", {
        nombres: ["Ana Solís", "Beto Ruiz"],
        carnets: ["100000001", null],
        grupos: [1, 2],
        correos: [null, null],
      })) {
        await s;
      }
    });
    await sentenciaAgregarParticipantes(db, "noche", 3, ["Caro Vega", "Dani Mora"], 3);

    const filas = await sentenciaLeerFilas(db, "noche");
    expect(participantesActivos(filas, 20).map((p) => [p.id, p.etiqueta, p.carnet, p.grupo])).toEqual([
      ["P01", "Ana Solís", "100000001", 1],
      ["P02", "Beto Ruiz", null, 2],
      ["P03", "Caro Vega", null, 3],
      ["P04", "Dani Mora", null, 3],
    ]);
    expect(await sentenciaLeerFilas(db, "manana")).toEqual([]);
  });

  it("falla en vez de escribir sobre una fila guardada", async () => {
    await sentenciaAgregarParticipantes(db, "noche", 1, ["Ana Solís"], 1);
    await expect(sentenciaAgregarParticipantes(db, "noche", 1, ["Caro Vega"], 1)).rejects.toThrow();
    const filas = await sentenciaLeerFilas(db, "noche");
    expect(filas.map((f) => f.nombre)).toEqual(["Ana Solís"]);
  });

  it("cuenta las marcas de asistencia de los números nuevos, por jornada", async () => {
    await db.insert(schema.asistencia).values([
      { jornada: "noche", competenciaId: "adaptabilidad", evaluadorId: "x", participanteId: "P05", ausente: true },
      { jornada: "manana", competenciaId: "adaptabilidad", evaluadorId: "x", participanteId: "P06", ausente: true },
    ]);
    const [{ total }] = await sentenciaContarAsistencia(db, "noche", ["P05", "P06"]);
    expect(total).toBe(1);
  });
});
