import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEXTOS } from "@/config/textos";
import { COOKIE_SESION, firmarSesion, type Rol, verificarSesion } from "@/lib/sesion";

// POST /api/jornada (PRD §5.11) with a real signed cookie: docente and admin
// get the cookie re-signed with the new jornada (same rol and sid); an
// evaluador's jornada can't change.

const galletas = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (galletas.token ? { value: galletas.token } : undefined) }),
}));

const { POST } = await import("@/app/api/jornada/route");

const SID = "0f3c2a4e-1b5d-4c6e-9f70-8a1b2c3d4e5f";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-con-al-menos-32-bytes!!");
});

afterEach(() => {
  vi.unstubAllEnvs();
  galletas.token = undefined;
});

async function conSesion(rol: Rol) {
  galletas.token = await firmarSesion({
    rol,
    sid: SID,
    jornada: "manana",
    integranteId: rol === "evaluador" ? "jimena-salgado" : undefined,
  });
}

function cambiar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost/api/jornada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
  );
}

function tokenDe(respuesta: Response): string | undefined {
  const cookie = respuesta.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_SESION}=`));
  return cookie?.split(";")[0].slice(COOKIE_SESION.length + 1);
}

describe("POST /api/jornada", () => {
  it("401 sin sesión", async () => {
    const respuesta = await cambiar({ jornada: "noche" });
    expect(respuesta.status).toBe(401);
    expect(tokenDe(respuesta)).toBeUndefined();
  });

  it("403 para el evaluador: su jornada la fija el código", async () => {
    await conSesion("evaluador");
    const respuesta = await cambiar({ jornada: "noche" });
    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({ error: TEXTOS.jornada.soloDocenteOAdmin });
    expect(tokenDe(respuesta)).toBeUndefined();
  });

  it.each(["docente", "admin"] as const)("%s: vuelve a firmar la cookie con la nueva jornada", async (rol) => {
    await conSesion(rol);
    const respuesta = await cambiar({ jornada: "noche" });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({ jornada: "noche" });
    await expect(verificarSesion(tokenDe(respuesta))).resolves.toEqual({ rol, sid: SID, jornada: "noche" });
  });

  it.each([{ jornada: "tarde" }, {}, null])("400 para el cuerpo %j", async (cuerpo) => {
    await conSesion("docente");
    const respuesta = await cambiar(cuerpo);
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: TEXTOS.jornada.invalida });
  });
});
