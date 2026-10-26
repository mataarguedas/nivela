import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  codigosIguales,
  DURACION_SESION_S,
  firmarSesion,
  nuevoSid,
  opcionesCookieSesion,
  rolParaCodigo,
  verificarSesion,
} from "@/lib/sesion";

const SECRETO = "secreto-de-prueba-con-al-menos-32-bytes!!";
const SID = "0f3c2a4e-1b5d-4c6e-9f70-8a1b2c3d4e5f";

function base64url(objeto: object): string {
  return Buffer.from(JSON.stringify(objeto)).toString("base64url");
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRETO);
  vi.stubEnv("CODIGO_ACCESO", "clase-2026");
  vi.stubEnv("CODIGO_DOCENTE", "docente-2026");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("firmarSesion / verificarSesion", () => {
  it("firma y verifica { rol, sid }", async () => {
    const token = await firmarSesion({ rol: "evaluador", sid: SID });
    await expect(verificarSesion(token)).resolves.toEqual({ rol: "evaluador", sid: SID });
  });

  it("usa HS256 y expira a las 12 h", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T08:00:00Z"));
    const token = await firmarSesion({ rol: "docente", sid: SID });
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
    const token = await firmarSesion({ rol: "evaluador", sid: SID });

    vi.setSystemTime(inicio + (DURACION_SESION_S - 1) * 1000);
    await expect(verificarSesion(token)).resolves.not.toBeNull();

    vi.setSystemTime(inicio + (DURACION_SESION_S + 1) * 1000);
    await expect(verificarSesion(token)).resolves.toBeNull();
  });

  it("rechaza un payload alterado (evaluador → docente)", async () => {
    const token = await firmarSesion({ rol: "evaluador", sid: SID });
    const [cabecera, cuerpo, firma] = token.split(".");
    const original = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
    const alterado = base64url({ ...original, rol: "docente" });
    await expect(verificarSesion(`${cabecera}.${alterado}.${firma}`)).resolves.toBeNull();
  });

  it("rechaza una firma alterada", async () => {
    const token = await firmarSesion({ rol: "evaluador", sid: SID });
    // Alter the signature's FIRST character: the last one of a 32-byte
    // signature holds 2 padding bits, so swapping it (e.g. "B" → "A") can
    // decode to the same bytes and leave the token valid.
    const inicioFirma = token.lastIndexOf(".") + 1;
    const otro = token[inicioFirma] === "A" ? "B" : "A";
    const alterado = token.slice(0, inicioFirma) + otro + token.slice(inicioFirma + 1);
    await expect(verificarSesion(alterado)).resolves.toBeNull();
  });

  it("rechaza un token firmado con otro secreto", async () => {
    const token = await firmarSesion({ rol: "docente", sid: SID });
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
    const token = await new SignJWT({ rol: "admin", sid: SID })
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
    await expect(firmarSesion({ rol: "evaluador", sid: SID })).rejects.toThrow(/32 bytes/);
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

describe("rolParaCodigo", () => {
  it("asigna evaluador y docente según el código", () => {
    expect(rolParaCodigo("clase-2026")).toBe("evaluador");
    expect(rolParaCodigo("docente-2026")).toBe("docente");
    expect(rolParaCodigo("otro")).toBeNull();
  });

  it("revisa primero el código docente", () => {
    vi.stubEnv("CODIGO_ACCESO", "mismo");
    vi.stubEnv("CODIGO_DOCENTE", "mismo");
    expect(rolParaCodigo("mismo")).toBe("docente");
  });

  it("un código sin configurar nunca coincide", () => {
    vi.stubEnv("CODIGO_ACCESO", "");
    vi.stubEnv("CODIGO_DOCENTE", "");
    expect(rolParaCodigo("")).toBeNull();
    expect(rolParaCodigo("clase-2026")).toBeNull();
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
