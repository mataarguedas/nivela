import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  estadoDesdeFilas,
  participantesActivos,
  sentenciaContarEvaluaciones,
  sentenciaLeerFilas,
  sentenciasGuardarParticipantes,
} from "@/lib/db/participantes";
import * as schema from "@/lib/db/schema";

// The admin's participant list against a real Postgres (PGlite, built from
// the committed migrations): saving, hiding by lowering the count, names
// coming back when it goes up again, and the count the confirmation shows.
// The same statements the route sends as a neon-http batch run here inside
// a transaction.

const cliente = new PGlite();
const db = drizzle({ client: cliente, schema });

async function guardar(nombres: (string | null)[]) {
  await db.transaction(async (tx) => {
    for (const sentencia of sentenciasGuardarParticipantes(tx, nombres)) await sentencia;
  });
}

const leer = () => sentenciaLeerFilas(db);

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  await db.execute(sql`truncate participantes, evaluaciones, calificaciones`);
});

afterAll(async () => {
  await cliente.close();
});

describe("participantes en la base de datos", () => {
  it("sin filas se usa la lista de respaldo, sin nombres", async () => {
    const filas = await leer();
    expect(participantesActivos(filas, 4).map((p) => p.etiqueta)).toEqual([
      "Participante 01",
      "Participante 02",
      "Participante 03",
      "Participante 04",
    ]);
    expect(estadoDesdeFilas(filas, 4)).toEqual({ cantidad: 4, nombres: [] });
  });

  it("guarda la cantidad y los nombres en orden (P01…)", async () => {
    await guardar(["Ana Pérez", null, "Carlos Peña"]);
    const activos = participantesActivos(await leer(), 20);
    expect(activos).toEqual([
      { id: "P01", numero: 1, nombre: "Ana Pérez", etiqueta: "Ana Pérez" },
      { id: "P02", numero: 2, nombre: null, etiqueta: "Participante 02" },
      { id: "P03", numero: 3, nombre: "Carlos Peña", etiqueta: "Carlos Peña" },
    ]);
  });

  it("bajar la cantidad oculta sin borrar; subirla de nuevo recupera los nombres", async () => {
    await guardar(["Ana", "Bea", "Carlos", "Dani"]);
    await guardar(["Ana", "Beatriz"]);

    const filas = await leer();
    expect(filas).toHaveLength(4); // never deleted
    expect(participantesActivos(filas, 20).map((p) => p.etiqueta)).toEqual(["Ana", "Beatriz"]);
    expect(estadoDesdeFilas(filas, 20)).toEqual({ cantidad: 2, nombres: ["Ana", "Beatriz", "Carlos", "Dani"] });

    await guardar(["Ana", "Beatriz", "Carlos", "Dani"]);
    expect(participantesActivos(await leer(), 20).map((p) => p.id)).toEqual(["P01", "P02", "P03", "P04"]);
  });

  it("cuenta las evaluaciones de los participantes que se ocultarían", async () => {
    await db.execute(sql`
      insert into evaluaciones (competencia_id, evaluador_id, participante_id, puntaje) values
        ('adaptabilidad', 'e1', 'P03', 3), ('adaptabilidad', 'e2', 'P03', 2),
        ('adaptabilidad', 'e1', 'P04', 4), ('adaptabilidad', 'e1', 'P01', 1)`);
    const [{ total }] = await sentenciaContarEvaluaciones(db, ["P03", "P04", "P05"]);
    expect(total).toBe(3);
  });

  it("la restricción rechaza números fuera de 1…99", async () => {
    await expect(db.execute(sql`insert into participantes (id, numero) values ('P00', 0)`)).rejects.toThrow();
  });
});
