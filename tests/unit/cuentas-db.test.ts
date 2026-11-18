import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { equipoDeCompetencia } from "@/config/equipos";
import {
  activarConCodigo,
  CODIGOS_POR_HORA,
  FALLOS_PARA_BLOQUEO,
  hashCodigo,
  iniciarConContrasena,
  INTENTOS_POR_CODIGO,
  listarCuentasJornada,
  MINUTOS_CODIGO,
  SEGUNDOS_ENTRE_CODIGOS,
  solicitarCodigo,
} from "@/lib/cuentas";
import { cambiarCorreo, cuentaPorId, restablecerAcceso, type Bd } from "@/lib/db/cuentas";
import * as schema from "@/lib/db/schema";

// Evaluator accounts against a real Postgres (PGlite, built from the
// committed migrations): codes (expiry, attempts, single use, newest wins,
// hourly limit, resend gap), lockout, and email changes (PRD §5.12).

const cliente = new PGlite();
const db = drizzle({ client: cliente, schema }) as unknown as Bd;

const ID = equipoDeCompetencia("noche", "adaptabilidad")!.integrantes[0].id;
const OTRO = equipoDeCompetencia("manana", "adaptabilidad")!.integrantes[0].id;
const CORREO = "persona-uno@ejemplo.test";
const CLAVE = "clave-segura-1";

const MINUTO = 60 * 1000;
const T0 = new Date("2026-11-17T15:00:00Z");
const en = (ms: number) => new Date(T0.getTime() + ms);

beforeAll(async () => {
  await migrate(drizzle({ client: cliente, schema }), { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-con-al-menos-32-bytes!!");
  await db.execute(sql`truncate cuentas cascade`);
  await cambiarCorreo(db, ID, CORREO);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await cliente.close();
});

/** Asks for a code and returns it (as the email would carry it). */
async function pedirCodigo(cuando = T0, motivo: "correo" | "recuperar" = "correo") {
  const resultado = await solicitarCodigo(db, CORREO, motivo, cuando);
  expect(resultado.paso).toBe("codigo");
  return resultado.envio?.codigo;
}

async function activar(cuando = T0) {
  const codigo = await pedirCodigo(cuando);
  const resultado = await activarConCodigo(db, CORREO, codigo!, CLAVE, cuando);
  expect(resultado).toEqual({ ok: true, integranteId: ID });
}

describe("paso 1: correo", () => {
  it("una cuenta sin activar recibe un código; el código guardado es un HMAC", async () => {
    const resultado = await solicitarCodigo(db, CORREO, "correo", T0);
    expect(resultado).toEqual({ paso: "codigo", envio: { para: CORREO, codigo: expect.stringMatching(/^\d{6}$/) } });
    const [fila] = await db.select().from(schema.codigosVerificacion);
    expect(fila.codigoHash).toBe(hashCodigo(ID, resultado.envio!.codigo));
    expect(fila.proposito).toBe("activar");
    expect(fila.expiraEn.getTime() - T0.getTime()).toBe(MINUTOS_CODIGO * MINUTO);
  });

  it("un correo fuera de la lista recibe la misma respuesta y no se envía nada", async () => {
    await expect(solicitarCodigo(db, "nadie@ejemplo.test", "correo", T0)).resolves.toEqual({ paso: "codigo" });
    await expect(solicitarCodigo(db, "nadie@ejemplo.test", "recuperar", T0)).resolves.toEqual({ paso: "codigo" });
    expect(await db.select().from(schema.codigosVerificacion)).toHaveLength(0);
  });

  it("una cuenta activa pasa a la contraseña sin enviar código", async () => {
    await activar();
    await expect(solicitarCodigo(db, CORREO, "correo", en(5 * MINUTO))).resolves.toEqual({ paso: "contrasena" });
  });

  it(`espera ${SEGUNDOS_ENTRE_CODIGOS} s entre códigos y permite ${CODIGOS_POR_HORA} por hora, con la misma respuesta`, async () => {
    expect(await pedirCodigo(T0)).toBeDefined();
    // Too soon: same answer, nothing sent.
    expect(await pedirCodigo(en(30 * 1000))).toBeUndefined();
    for (let i = 1; i < CODIGOS_POR_HORA; i++) expect(await pedirCodigo(en(i * 2 * MINUTO))).toBeDefined();
    expect(await pedirCodigo(en(CODIGOS_POR_HORA * 2 * MINUTO))).toBeUndefined();
    // An hour after the first one, a slot frees up.
    expect(await pedirCodigo(en(61 * MINUTO))).toBeDefined();
  });
});

describe("activación con código", () => {
  it("activa, guarda la contraseña con scrypt y registra el ingreso", async () => {
    await activar();
    const cuenta = await cuentaPorId(db, ID);
    expect(cuenta?.contrasenaHash).toMatch(/^scrypt\$/);
    expect(cuenta?.activadaEn?.toISOString()).toBe(T0.toISOString());
    expect(cuenta?.ultimoAcceso?.toISOString()).toBe(T0.toISOString());
    await expect(iniciarConContrasena(db, CORREO, CLAVE, en(MINUTO))).resolves.toEqual({ ok: true, integranteId: ID });
  });

  it("el código se usa una sola vez", async () => {
    const codigo = await pedirCodigo();
    await expect(activarConCodigo(db, CORREO, codigo!, CLAVE, T0)).resolves.toMatchObject({ ok: true });
    await expect(activarConCodigo(db, CORREO, codigo!, "otra-clave-9", T0)).resolves.toEqual({ ok: false, motivo: "codigo" });
  });

  it(`vence a los ${MINUTOS_CODIGO} minutos`, async () => {
    const codigo = await pedirCodigo();
    const despues = en(MINUTOS_CODIGO * MINUTO);
    await expect(activarConCodigo(db, CORREO, codigo!, CLAVE, despues)).resolves.toEqual({ ok: false, motivo: "codigo" });
  });

  it(`admite ${INTENTOS_POR_CODIGO} intentos; después ni el correcto sirve`, async () => {
    const codigo = await pedirCodigo();
    const malo = codigo === "000000" ? "111111" : "000000";
    for (let i = 0; i < INTENTOS_POR_CODIGO; i++) {
      await expect(activarConCodigo(db, CORREO, malo, CLAVE, T0)).resolves.toEqual({ ok: false, motivo: "codigo" });
    }
    await expect(activarConCodigo(db, CORREO, codigo!, CLAVE, T0)).resolves.toEqual({ ok: false, motivo: "codigo" });
  });

  it("un código nuevo invalida el anterior", async () => {
    const primero = await pedirCodigo(T0);
    const segundo = await pedirCodigo(en(2 * MINUTO));
    if (primero !== segundo) {
      await expect(activarConCodigo(db, CORREO, primero!, CLAVE, en(3 * MINUTO))).resolves.toMatchObject({ ok: false });
    }
    await expect(activarConCodigo(db, CORREO, segundo!, CLAVE, en(3 * MINUTO))).resolves.toMatchObject({ ok: true });
  });

  it("el código de una cuenta no sirve para otra", async () => {
    await cambiarCorreo(db, OTRO, "persona-dos@ejemplo.test");
    const codigo = await pedirCodigo();
    await expect(activarConCodigo(db, "persona-dos@ejemplo.test", codigo!, CLAVE, T0)).resolves.toMatchObject({ ok: false });
  });

  it("«¿Olvidó su contraseña?» envía un código de recuperación que cambia la contraseña", async () => {
    await activar();
    const codigo = await pedirCodigo(en(2 * MINUTO), "recuperar");
    const [fila] = await db
      .select()
      .from(schema.codigosVerificacion)
      .orderBy(sql`created_at desc`)
      .limit(1);
    expect(fila.proposito).toBe("recuperar");
    await expect(activarConCodigo(db, CORREO, codigo!, "nueva-clave-2", en(3 * MINUTO))).resolves.toMatchObject({ ok: true });
    await expect(iniciarConContrasena(db, CORREO, CLAVE, en(4 * MINUTO))).resolves.toMatchObject({ ok: false });
    await expect(iniciarConContrasena(db, CORREO, "nueva-clave-2", en(4 * MINUTO))).resolves.toMatchObject({ ok: true });
  });
});

describe("contraseña y bloqueo", () => {
  it("correo desconocido o cuenta sin activar: «credenciales», igual que una contraseña mala", async () => {
    await expect(iniciarConContrasena(db, "nadie@ejemplo.test", CLAVE, T0)).resolves.toEqual({ ok: false, motivo: "credenciales" });
    await expect(iniciarConContrasena(db, CORREO, CLAVE, T0)).resolves.toEqual({ ok: false, motivo: "credenciales" });
  });

  it(`${FALLOS_PARA_BLOQUEO} contraseñas malas seguidas bloquean 15 minutos, incluso con la correcta`, async () => {
    await activar();
    for (let i = 1; i < FALLOS_PARA_BLOQUEO; i++) {
      await expect(iniciarConContrasena(db, CORREO, "mala", en(MINUTO))).resolves.toEqual({ ok: false, motivo: "credenciales" });
    }
    await expect(iniciarConContrasena(db, CORREO, "mala", en(MINUTO))).resolves.toEqual({ ok: false, motivo: "bloqueada" });
    await expect(iniciarConContrasena(db, CORREO, CLAVE, en(10 * MINUTO))).resolves.toEqual({ ok: false, motivo: "bloqueada" });
    // After the lock, the right password works and the count restarts.
    await expect(iniciarConContrasena(db, CORREO, CLAVE, en(17 * MINUTO))).resolves.toMatchObject({ ok: true });
    expect((await cuentaPorId(db, ID))?.intentosFallidos).toBe(0);
  });

  it("un ingreso correcto reinicia el conteo de fallos", async () => {
    await activar();
    for (let i = 1; i < FALLOS_PARA_BLOQUEO; i++) await iniciarConContrasena(db, CORREO, "mala", en(MINUTO));
    await expect(iniciarConContrasena(db, CORREO, CLAVE, en(MINUTO))).resolves.toMatchObject({ ok: true });
    await expect(iniciarConContrasena(db, CORREO, "mala", en(2 * MINUTO))).resolves.toEqual({ ok: false, motivo: "credenciales" });
  });
});

describe("administración", () => {
  it("cambiar el correo vuelve la cuenta a «Pendiente de activar» y borra los códigos", async () => {
    await activar();
    await pedirCodigo(en(2 * MINUTO), "recuperar");
    expect(await cambiarCorreo(db, ID, CORREO)).toBe(false);
    expect(await cambiarCorreo(db, ID, "nuevo@ejemplo.test")).toBe(true);
    const cuenta = await cuentaPorId(db, ID);
    expect(cuenta).toMatchObject({ correo: "nuevo@ejemplo.test", contrasenaHash: null, activadaEn: null });
    expect(await db.select().from(schema.codigosVerificacion)).toHaveLength(0);
    await expect(iniciarConContrasena(db, CORREO, CLAVE, en(3 * MINUTO))).resolves.toMatchObject({ ok: false });
  });

  it("el correo es único", async () => {
    await expect(cambiarCorreo(db, OTRO, CORREO)).rejects.toThrow();
  });

  it("«Restablecer acceso» borra la contraseña; se activa de nuevo con un código", async () => {
    await activar();
    await restablecerAcceso(db, ID);
    await expect(solicitarCodigo(db, CORREO, "correo", en(5 * MINUTO))).resolves.toMatchObject({ paso: "codigo" });
  });

  it("lista las cuentas por equipo de la jornada, en su propio orden de números", async () => {
    await activar();
    const grupos = await listarCuentasJornada(db, "noche");
    expect(grupos.map((g) => g.numero)).toEqual([...grupos.map((g) => g.numero)].sort((a, b) => a - b));
    const adaptabilidad = grupos.find((g) => g.competencia === "Adaptabilidad");
    expect(adaptabilidad?.numero).toBe(equipoDeCompetencia("noche", "adaptabilidad")!.numero);
    const fila = adaptabilidad?.cuentas.find((c) => c.integranteId === ID);
    expect(fila).toMatchObject({ correo: CORREO, estado: "activa", ultimoAcceso: T0.toISOString() });
    const sinCuenta = adaptabilidad?.cuentas.find((c) => c.integranteId !== ID);
    expect(sinCuenta).toMatchObject({ correo: null, estado: "sin-correo", ultimoAcceso: null });
    // Only that jornada's members.
    expect(grupos.flatMap((g) => g.cuentas).some((c) => c.integranteId === OTRO)).toBe(false);
  });
});
