import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { equipoDeCompetencia } from "@/config/equipos";
import {
  accesoParaCodigo,
  codigosIguales,
  DURACION_SESION_S,
  firmarSesion,
  nuevoSid,
  opcionesCookieSesion,
  puedeCambiarJornada,
  verificarSesion,
} from "@/lib/sesion";

const SECRETO = "secreto-de-prueba-con-al-menos-32-bytes!!";
const SID = "0f3c2a4e-1b5d-4c6e-9f70-8a1b2c3d4e5f";
// Real members, looked up by jornada + competencia (never by team number).
const DE_MANANA = equipoDeCompetencia("manana", "adaptabilidad")!.integrantes[0].id;
const DE_NOCHE = equipoDeCompetencia("noche", "adaptabilidad")!.integrantes[0].id;
const EVALUADOR = { rol: "evaluador", sid: SID, jornada: "manana", integranteId: DE_MANANA } as const;

function base64url(objeto: object): string {
  return Buffer.from(JSON.stringify(objeto)).toString("base64url");
}

/** Signs any payload with the test secret, bypassing firmarSesion's types. */
function firmar(datos: Record<string, unknown>): Promise<string> {
  return new SignJWT(datos)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRETO));
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRETO);
  vi.stubEnv("CODIGO_DOCENTE", "docente-2026");
  vi.stubEnv("CODIGO_ADMIN", "admin-2026");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("firmarSesion / verificarSesion", () => {
  it("firma y verifica { rol, sid, jornada, integranteId } de un evaluador", async () => {
    const sesion = { rol: "evaluador", sid: SID, jornada: "noche", integranteId: DE_NOCHE } as const;
    await expect(verificarSesion(await firmarSesion(sesion))).resolves.toEqual(sesion);
  });

  it("docente y admin no llevan integranteId", async () => {
    const token = await firmarSesion({ rol: "docente", sid: SID, jornada: "noche" });
    await expect(verificarSesion(token)).resolves.toEqual({ rol: "docente", sid: SID, jornada: "noche" });
    const [, cuerpo] = token.split(".");
    expect(JSON.parse(Buffer.from(cuerpo, "base64url").toString())).not.toHaveProperty("integranteId");
  });

  it("un token de docente sin jornada (anterior a v1.1) es de la mañana", async () => {
    const token = await firmar({ rol: "docente", sid: SID });
    await expect(verificarSesion(token)).resolves.toEqual({ rol: "docente", sid: SID, jornada: "manana" });
  });

  it("un token de evaluador sin integranteId (código de clase, antes de v1.2) cuenta como vencido", async () => {
    await expect(verificarSesion(await firmar({ rol: "evaluador", sid: SID, jornada: "manana" }))).resolves.toBeNull();
    await expect(verificarSesion(await firmar({ rol: "evaluador", sid: SID }))).resolves.toBeNull();
  });

  it("rechaza un integrante desconocido o de otra jornada, y un docente con integranteId", async () => {
    await expect(verificarSesion(await firmar({ ...EVALUADOR, integranteId: "nadie" }))).resolves.toBeNull();
    await expect(verificarSesion(await firmar({ ...EVALUADOR, integranteId: DE_NOCHE }))).resolves.toBeNull();
    await expect(verificarSesion(await firmar({ rol: "docente", sid: SID, jornada: "manana", integranteId: DE_MANANA }))).resolves.toBeNull();
  });

  it("rechaza una jornada desconocida y un cambio de jornada alterado", async () => {
    const token = await firmar({ ...EVALUADOR, jornada: "tarde" });
    await expect(verificarSesion(token)).resolves.toBeNull();

    const [cabecera, cuerpo, firma] = (await firmarSesion(EVALUADOR)).split(".");
    const alterado = base64url({ ...JSON.parse(Buffer.from(cuerpo, "base64url").toString()), jornada: "noche" });
    await expect(verificarSesion(`${cabecera}.${alterado}.${firma}`)).resolves.toBeNull();
  });

  it("usa HS256 y expira a las 12 h", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T08:00:00Z"));
    const token = await firmarSesion({ rol: "docente", sid: SID, jornada: "manana" });
    const [cabecera, cuerpo] = token.split(".");
    expect(JSON.parse(Buffer.from(cabecera, "base64url").toString())).toMatchObject({ alg: "HS256" });
    const { iat, exp } = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
    expect(exp - iat).toBe(DURACION_SESION_S);
    expect(DURACION_SESION_S).toBe(12 * 60 * 60);
  });

  it("acepta la sesión justo antes de expirar y la rechaza después", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const inicio = new Date("2026-10-25T08:00:00Z").getTime();
    vi.setSystemTime(inicio);
    const token = await firmarSesion(EVALUADOR);

    vi.setSystemTime(inicio + (DURACION_SESION_S - 1) * 1000);
    await expect(verificarSesion(token)).resolves.not.toBeNull();

    vi.setSystemTime(inicio + (DURACION_SESION_S + 1) * 1000);
    await expect(verificarSesion(token)).resolves.toBeNull();
  });

  it("rechaza un payload alterado (evaluador → docente, u otro integrante)", async () => {
    const token = await firmarSesion(EVALUADOR);
    const [cabecera, cuerpo, firma] = token.split(".");
    const original = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
    const alterado = base64url({ ...original, rol: "docente" });
    await expect(verificarSesion(`${cabecera}.${alterado}.${firma}`)).resolves.toBeNull();
    const otro = equipoDeCompetencia("manana", "adaptabilidad")!.integrantes[1].id;
    const suplantado = base64url({ ...original, integranteId: otro });
    await expect(verificarSesion(`${cabecera}.${suplantado}.${firma}`)).resolves.toBeNull();
  });

  it("rechaza una firma alterada", async () => {
    const token = await firmarSesion(EVALUADOR);
    // Alter the signature's FIRST character: the last one of a 32-byte
    // signature holds 2 padding bits, so swapping it (e.g. "B" → "A") can
    // decode to the same bytes and leave the token valid.
    const inicioFirma = token.lastIndexOf(".") + 1;
    const otro = token[inicioFirma] === "A" ? "B" : "A";
    const alterado = token.slice(0, inicioFirma) + otro + token.slice(inicioFirma + 1);
    await expect(verificarSesion(alterado)).resolves.toBeNull();
  });

  it("rechaza un token firmado con otro secreto", async () => {
    const token = await firmarSesion({ rol: "docente", sid: SID, jornada: "manana" });
    vi.stubEnv("SESSION_SECRET", "otro-secreto-distinto-tambien-de-32-bytes");
    await expect(verificarSesion(token)).resolves.toBeNull();
  });

  it('rechaza alg "none"', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    const token = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ rol: "docente", sid: SID, iat: ahora, exp: ahora + 60 })}.`;
    await expect(verificarSesion(token)).resolves.toBeNull();
  });

  it("rechaza un payload bien firmado pero con forma inválida", async () => {
    const clave = new TextEncoder().encode(SECRETO);
    const token = await new SignJWT({ rol: "superusuario", sid: SID })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(clave);
    await expect(verificarSesion(token)).resolves.toBeNull();
  });

  it("rechaza tokens vacíos o mal formados", async () => {
    await expect(verificarSesion(undefined)).resolves.toBeNull();
    await expect(verificarSesion("")).resolves.toBeNull();
    await expect(verificarSesion("no-es-un-jwt")).resolves.toBeNull();
  });

  it("exige un SESSION_SECRET de al menos 32 bytes", async () => {
    vi.stubEnv("SESSION_SECRET", "corto");
    await expect(firmarSesion(EVALUADOR)).rejects.toThrow(/32 bytes/);
  });

  it("genera sid aleatorios", () => {
    expect(nuevoSid()).not.toBe(nuevoSid());
    expect(nuevoSid().length).toBeGreaterThanOrEqual(16);
  });
});

describe("codigosIguales", () => {
  it("compara en tiempo constante con relleno", () => {
    expect(codigosIguales("clase-2026", "clase-2026")).toBe(true);
    expect(codigosIguales("clase-2025", "clase-2026")).toBe(false);
    expect(codigosIguales("clase", "clase-2026")).toBe(false);
    expect(codigosIguales("clase-2026-extra", "clase-2026")).toBe(false);
    expect(codigosIguales("Clase-2026", "clase-2026")).toBe(false);
  });

  it("no confunde un código con su versión rellenada con ceros", () => {
    expect(codigosIguales("abc\0", "abc")).toBe(false);
  });

  it("maneja cadenas vacías y caracteres acentuados", () => {
    expect(codigosIguales("", "")).toBe(true);
    expect(codigosIguales("", "x")).toBe(false);
    expect(codigosIguales("Psicología", "Psicología")).toBe(true);
    expect(codigosIguales("Psicologia", "Psicología")).toBe(false);
  });
});

describe("accesoParaCodigo", () => {
  it("solo hay códigos de docente y de administración (los de clase se retiraron en v1.2)", () => {
    expect(accesoParaCodigo("docente-2026")).toEqual({ rol: "docente", jornada: "manana" });
    expect(accesoParaCodigo("admin-2026")).toEqual({ rol: "admin", jornada: "manana" });
    vi.stubEnv("CODIGO_ACCESO", "clase-2026");
    vi.stubEnv("CODIGO_ACCESO_NOCHE", "noche-2026");
    expect(accesoParaCodigo("clase-2026")).toBeNull();
    expect(accesoParaCodigo("noche-2026")).toBeNull();
    expect(accesoParaCodigo("otro")).toBeNull();
  });

  it("si ambos códigos coinciden, gana administración", () => {
    vi.stubEnv("CODIGO_DOCENTE", "admin-2026");
    expect(accesoParaCodigo("admin-2026")?.rol).toBe("admin");
  });

  it("un código sin configurar nunca coincide", () => {
    vi.stubEnv("CODIGO_DOCENTE", "");
    vi.stubEnv("CODIGO_ADMIN", "");
    expect(accesoParaCodigo("")).toBeNull();
    expect(accesoParaCodigo("docente-2026")).toBeNull();
  });

  it("solo docente y admin pueden cambiar de jornada", () => {
    expect(puedeCambiarJornada("docente")).toBe(true);
    expect(puedeCambiarJornada("admin")).toBe(true);
    expect(puedeCambiarJornada("evaluador")).toBe(false);
  });
});

describe("opcionesCookieSesion", () => {
  it("httpOnly, SameSite=Lax, 12 h y Secure solo en producción", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(opcionesCookieSesion()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 43_200,
    });
    vi.stubEnv("NODE_ENV", "production");
    expect(opcionesCookieSesion().secure).toBe(true);
  });
});
