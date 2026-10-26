import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { leerUso, sentenciaRegistrarUso } from "@/lib/db/usoJev";
import * as schema from "@/lib/db/schema";

// The per-session Jev cap's counter against a real Postgres (PGlite, built
// from the committed migrations): the atomic upsert-increment is a property
// of the SQL, which a mocked db layer couldn't show.

const cliente = new PGlite();
const db = drizzle({ client: cliente, schema });

const registrar = async (sid: string) => leerUso(await sentenciaRegistrarUso(db, sid));
const filas = async () =>
  (await db.execute<{ sesion_id: string; conteo: number }>(sql`select sesion_id, conteo from uso_jev order by sesion_id, ventana`)).rows;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  await db.execute(sql`truncate uso_jev`);
});

describe("sentenciaRegistrarUso (uso_jev)", () => {
  it("la primera vez crea la fila de la hora con 1; luego incrementa", async () => {
    expect((await registrar("sesion-a")).conteo).toBe(1);
    expect((await registrar("sesion-a")).conteo).toBe(2);
    expect((await registrar("sesion-a")).conteo).toBe(3);
    expect(await filas()).toEqual([{ sesion_id: "sesion-a", conteo: 3 }]);
  });

  it("la ventana es la hora truncada del reloj de la base de datos", async () => {
    await registrar("sesion-a");
    const { rows } = await db.execute<{ ok: boolean }>(sql`select ventana = date_trunc('hour', now()) as ok from uso_jev`);
    expect(rows[0].ok).toBe(true);
  });

  it("devuelve los segundos hasta el fin de la ventana (1 a 3600)", async () => {
    const { segundosRestantes } = await registrar("sesion-a");
    expect(segundosRestantes).toBeGreaterThanOrEqual(1);
    expect(segundosRestantes).toBeLessThanOrEqual(3600);
  });

  it("cada sesión tiene su propio contador", async () => {
    await registrar("sesion-a");
    await registrar("sesion-a");
    expect((await registrar("sesion-b")).conteo).toBe(1);
  });

  it("una hora anterior no cuenta para la ventana actual", async () => {
    await db.execute(
      sql`insert into uso_jev (sesion_id, ventana, conteo) values ('sesion-a', date_trunc('hour', now()) - interval '1 hour', 60)`,
    );
    expect((await registrar("sesion-a")).conteo).toBe(1);
  });

  // PGlite runs these one at a time; on Neon, ON CONFLICT DO UPDATE locks the
  // row, so truly concurrent increments serialize the same way.
  it("solicitudes simultáneas no se pierden: 10 incrementos dan 10", async () => {
    const conteos = await Promise.all(Array.from({ length: 10 }, () => registrar("sesion-a")));
    expect(conteos.map((c) => c.conteo).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(await filas()).toEqual([{ sesion_id: "sesion-a", conteo: 10 }]);
  });
});

afterAll(async () => {
  await cliente.close();
});
