import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  leerCsvParticipantes,
  leerListaNombres,
  planificarAgregado,
  type NombreHoja,
} from "@/lib/agregarParticipantes";
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

const nuevos = (...nombres: string[]): NombreHoja[] =>
  nombres.map((nombre, i) => ({ nombre, posicion: `fila ${i + 1}` }));

describe("leerListaNombres", () => {
  it("lee una columna de nombres en orden de fila, sin numeración", () => {
    const lista = leerListaNombres(
      celdas({
        A2: "Beto Ruiz Mora",
        A1: "1. Ana Lucía  Solís Vega ",
        A3: " ",
      }),
    );
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
    const lista = leerListaNombres(
      celdas({
        A1: "Ana Solís",
        A2: "ana@ejemplo.test",
        A3: "Beto",
        A4: "Caro 88887777",
      }),
    );
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
      grupos: [3, 3],
      correos: [null, null],
      carnets: [null, null],
      ids: ["P04", "P05"],
      actualizaciones: [],
    });
  });

  it("usa el grupo pedido, o el 1 si nadie tiene grupo", () => {
    expect(planificarAgregado(nuevos("Caro Vega"), guardadas, 7)).toMatchObject({ ok: true, grupos: [7] });
    expect(planificarAgregado(nuevos("Caro Vega"), [fila(1, "Ana Solís")])).toMatchObject({ ok: true, grupos: [1] });
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
    expect(plan).toMatchObject({
      ok: false,
      errores: [expect.stringMatching(/oculto/)],
    });
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
    expect(plan).toMatchObject({
      ok: false,
      errores: [expect.stringMatching(/100 participantes/)],
    });
  });
});

describe("leerCsvParticipantes y grupos por fila", () => {
  it("lee nombre, correo y grupo; el correo en minúsculas y «Grupo 3» como 3", () => {
    const lista = leerCsvParticipantes(
      "nombre,correo,grupo\nAna Solís Vega,Ana@Ejemplo.test,Grupo 3\n\nBeto Ruiz Mora,,\r\nCaro Díaz,caro@ejemplo.test,2\n",
    );
    expect(lista.errores).toEqual([]);
    expect(lista.nombres).toEqual([
      {
        nombre: "Ana Solís Vega",
        posicion: "línea 2",
        correo: "ana@ejemplo.test",
        grupo: 3,
      },
      {
        nombre: "Beto Ruiz Mora",
        posicion: "línea 4",
        correo: null,
        grupo: null,
      },
      {
        nombre: "Caro Díaz",
        posicion: "línea 5",
        correo: "caro@ejemplo.test",
        grupo: 2,
      },
    ]);
  });

  it("rechaza encabezado, correo, grupo o columnas inválidos, por línea y sin nombres", () => {
    expect(leerCsvParticipantes("nombre;correo;grupo\nAna Solís,,").errores[0]).toMatch(/^Línea 1/);
    const lista = leerCsvParticipantes(
      "nombre,correo,grupo\nAna Solís,no-es-correo,1\nBeto Ruiz,,25\nCaro Díaz,caro@ejemplo.test\n",
    );
    expect(lista.errores).toEqual([
      "línea 2: el correo no es válido.",
      expect.stringMatching(/^línea 3: el grupo/),
      expect.stringMatching(/^línea 4: debe tener 3 columnas/),
    ]);
  });

  it("el grupo de cada fila gana; sin grupo queda el pedido o «Sin grupo»", () => {
    const filas: NombreHoja[] = [
      {
        nombre: "Ana Solís",
        posicion: "línea 2",
        correo: "ana@ejemplo.test",
        grupo: 2,
      },
      { nombre: "Beto Ruiz", posicion: "línea 3", correo: null, grupo: null },
    ];
    expect(planificarAgregado(filas, [fila(1, "Eva Ríos", 1)], null)).toMatchObject({
      ok: true,
      grupos: [2, null],
      correos: ["ana@ejemplo.test", null],
    });
    expect(planificarAgregado(filas, [fila(1, "Eva Ríos", 1)], 6)).toMatchObject({ ok: true, grupos: [2, 6] });
  });

  it("rechaza un correo repetido en la hoja", () => {
    const filas: NombreHoja[] = [
      {
        nombre: "Ana Solís",
        posicion: "línea 2",
        correo: "x@ejemplo.test",
        grupo: 1,
      },
      {
        nombre: "Beto Ruiz",
        posicion: "línea 3",
        correo: "x@ejemplo.test",
        grupo: 1,
      },
    ];
    expect(planificarAgregado(filas, [fila(1, "Eva Ríos")], null)).toMatchObject({
      ok: false,
      errores: ["línea 3: repite el correo de la línea 2."],
    });
  });
});

describe("planificarAgregado con actualizarExistentes", () => {
  const guardadas = [fila(1, "Ana Solís", 1), fila(2, "Beto Ruiz Mora", 6), fila(3, "Caro Vega", 6)];
  const hoja: NombreHoja[] = [
    { nombre: "RUIZ MORA Beto", posicion: "línea 2", correo: null, grupo: 2 },
    { nombre: "Dani Mora", posicion: "línea 3", correo: "dani@ejemplo.test", grupo: 1 },
    { nombre: "Caro Vega", posicion: "línea 4", correo: null, grupo: 3 },
  ];

  it("cambia el grupo de los ya guardados y agrega solo los nuevos", () => {
    expect(planificarAgregado(hoja, guardadas, null, { actualizarExistentes: true })).toEqual({
      ok: true,
      inicio: 4,
      nombres: ["Dani Mora"],
      grupos: [1],
      correos: ["dani@ejemplo.test"],
      carnets: [null],
      ids: ["P04"],
      actualizaciones: [
        { numero: 2, grupo: 2, carnet: null },
        { numero: 3, grupo: 3, carnet: null },
      ],
    });
  });

  it("sin la opción, un nombre guardado se rechaza", () => {
    expect(planificarAgregado(hoja, guardadas, null)).toMatchObject({
      ok: false,
      errores: [
        "línea 2: ya está en la lista guardada de la jornada.",
        "línea 4: ya está en la lista guardada de la jornada.",
      ],
    });
  });

  it("rechaza un nombre que coincide con varios guardados", () => {
    const dobles = [fila(1, "Ana Solís", 1), fila(2, "Solís Ana", 2)];
    const plan = planificarAgregado([{ nombre: "Ana Solís", posicion: "línea 2", grupo: 3 }], dobles, null, {
      actualizarExistentes: true,
    });
    expect(plan).toMatchObject({ ok: false, errores: [expect.stringMatching(/^línea 2: coincide con varios/)] });
  });
});

describe("columna carnet", () => {
  it("lee el carné normalizado; vacío o «—» es sin carné", () => {
    const lista = leerCsvParticipantes(
      "nombre,correo,grupo,carnet\nAna Solís,,1,1-0000-0001\nBeto Ruiz,,2,—\nCaro Vega,,3,\nDani Mora,,4,ABC-12\n",
    );
    expect(lista.errores).toEqual([]);
    expect(lista.nombres.map((n) => n.carnet)).toEqual(["100000001", null, null, "ABC-12"]);
  });

  it("rechaza un carné inválido o una fila sin la cuarta columna", () => {
    const lista = leerCsvParticipantes("nombre,correo,grupo,carnet\nAna Solís,,1,1 0000 0001 x\nBeto Ruiz,,2\n");
    expect(lista.errores).toEqual([
      "línea 2: el carné no es válido.",
      expect.stringMatching(/^línea 3: debe tener 4 columnas/),
    ]);
  });

  const guardadas: FilaGuardada[] = [{ ...fila(1, "Ana Solís", 1), carnet: "100000001" }, fila(2, "Beto Ruiz", 2)];

  it("da el carné a los guardados y a los nuevos", () => {
    const plan = planificarAgregado(
      [
        { nombre: "Beto Ruiz", posicion: "línea 2", grupo: 2, carnet: "200000002" },
        { nombre: "Ana Solís", posicion: "línea 3", grupo: 1, carnet: "100000001" },
        { nombre: "Caro Vega", posicion: "línea 4", grupo: 3, carnet: "300000003" },
      ],
      guardadas,
      null,
      { actualizarExistentes: true },
    );
    expect(plan).toMatchObject({
      ok: true,
      nombres: ["Caro Vega"],
      carnets: ["300000003"],
      actualizaciones: [
        { numero: 2, grupo: 2, carnet: "200000002" },
        { numero: 1, grupo: 1, carnet: "100000001" },
      ],
    });
  });

  it("rechaza un carné repetido o que ya tiene otro participante", () => {
    const plan = planificarAgregado(
      [
        { nombre: "Beto Ruiz", posicion: "línea 2", grupo: 2, carnet: "100000001" },
        { nombre: "Caro Vega", posicion: "línea 3", grupo: 3, carnet: "300000003" },
        { nombre: "Dani Mora", posicion: "línea 4", grupo: 3, carnet: "300000003" },
      ],
      guardadas,
      null,
      { actualizarExistentes: true },
    );
    expect(plan).toMatchObject({
      ok: false,
      errores: ["línea 2: el carné ya lo tiene otro participante guardado.", "línea 4: repite el carné de la línea 3."],
    });
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
    await sentenciaAgregarParticipantes(db, "noche", 3, {
      nombres: ["Caro Vega", "Dani Mora"],
      grupos: [3, null],
      correos: ["caro@ejemplo.test", null],
    });

    const filas = await sentenciaLeerFilas(db, "noche");
    expect(participantesActivos(filas, 20).map((p) => [p.id, p.etiqueta, p.carnet, p.grupo])).toEqual([
      ["P01", "Ana Solís", "100000001", 1],
      ["P02", "Beto Ruiz", null, 2],
      ["P03", "Caro Vega", null, 3],
      ["P04", "Dani Mora", null, null],
    ]);
    expect(await sentenciaLeerFilas(db, "manana")).toEqual([]);
  });

  it("falla en vez de escribir sobre una fila guardada", async () => {
    await sentenciaAgregarParticipantes(db, "noche", 1, {
      nombres: ["Ana Solís"],
      grupos: [1],
    });
    await expect(
      sentenciaAgregarParticipantes(db, "noche", 1, {
        nombres: ["Caro Vega"],
        grupos: [1],
      }),
    ).rejects.toThrow();
    const filas = await sentenciaLeerFilas(db, "noche");
    expect(filas.map((f) => f.nombre)).toEqual(["Ana Solís"]);
  });

  it("cuenta las marcas de asistencia de los números nuevos, por jornada", async () => {
    await db.insert(schema.asistencia).values([
      {
        jornada: "noche",
        competenciaId: "adaptabilidad",
        evaluadorId: "x",
        participanteId: "P05",
        ausente: true,
      },
      {
        jornada: "manana",
        competenciaId: "adaptabilidad",
        evaluadorId: "x",
        participanteId: "P06",
        ausente: true,
      },
    ]);
    const [{ total }] = await sentenciaContarAsistencia(db, "noche", ["P05", "P06"]);
    expect(total).toBe(1);
  });
});
