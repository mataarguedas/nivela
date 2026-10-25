import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION, COOKIE_SESION_PREVIA, firmarSesion, type Rol } from "@/lib/sesion";
import { proxy } from "@/proxy";

const ORIGEN = "http://localhost:3000";
const SID = "0f3c2a4e-1b5d-4c6e-9f70-8a1b2c3d4e5f";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-con-al-menos-32-bytes!!");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function solicitud(ruta: string, opciones: { rol?: Rol; token?: string; previa?: boolean } = {}) {
  const cookies: string[] = [];
  const token = opciones.token ?? (opciones.rol ? await firmarSesion({ rol: opciones.rol, sid: SID }) : undefined);
  if (token) cookies.push(`${COOKIE_SESION}=${token}`);
  if (opciones.previa) cookies.push(`${COOKIE_SESION_PREVIA}=1`);
  return new NextRequest(new URL(ruta, ORIGEN), { headers: cookies.length ? { cookie: cookies.join("; ") } : {} });
}

function destino(respuesta: Response): URL {
  const ubicacion = respuesta.headers.get("location");
  expect(ubicacion).toBeTruthy();
  return new URL(ubicacion!);
}

function dejaPasar(respuesta: Response) {
  expect(respuesta.headers.get("x-middleware-next")).toBe("1");
}

describe("proxy sin sesión", () => {
  it("redirige las páginas a /acceso conservando la ruta en next", async () => {
    const respuesta = await proxy(await solicitud("/adaptabilidad/P07?x=1"));
    expect(respuesta.status).toBe(307);
    const url = destino(respuesta);
    expect(url.pathname).toBe("/acceso");
    expect(url.searchParams.get("next")).toBe("/adaptabilidad/P07?x=1");
    expect(url.searchParams.has("motivo")).toBe(false);
  });

  it("no agrega next para Inicio", async () => {
    const url = destino(await proxy(await solicitud("/")));
    expect(url.pathname).toBe("/acceso");
    expect(url.search).toBe("");
  });

  it("responde 401 JSON en /api/*", async () => {
    const respuesta = await proxy(await solicitud("/api/evaluaciones"));
    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({ error: expect.any(String) });
  });

  it("deja pasar /acceso, /api/acceso y /api/salir", async () => {
    dejaPasar(await proxy(await solicitud("/acceso")));
    dejaPasar(await proxy(await solicitud("/api/acceso")));
    dejaPasar(await proxy(await solicitud("/api/salir")));
  });

  it('marca "expirada" si el dispositivo ya tuvo una sesión', async () => {
    const url = destino(await proxy(await solicitud("/", { previa: true })));
    expect(url.searchParams.get("motivo")).toBe("expirada");
  });

  it("borra una cookie inválida", async () => {
    const respuesta = await proxy(await solicitud("/", { token: "alterado.token.x", previa: true }));
    expect(destino(respuesta).searchParams.get("motivo")).toBe("expirada");
    expect(respuesta.headers.get("set-cookie")).toMatch(new RegExp(`${COOKIE_SESION}=;`));
  });
});

describe("proxy con sesión", () => {
  it("deja pasar al evaluador en las páginas de evaluación y la API", async () => {
    dejaPasar(await proxy(await solicitud("/", { rol: "evaluador" })));
    dejaPasar(await proxy(await solicitud("/adaptabilidad", { rol: "evaluador" })));
    dejaPasar(await proxy(await solicitud("/api/jev", { rol: "evaluador" })));
  });

  it("bloquea /reportes/** al evaluador", async () => {
    for (const ruta of ["/reportes", "/reportes/adaptabilidad/P01"]) {
      const url = destino(await proxy(await solicitud(ruta, { rol: "evaluador" })));
      expect(url.pathname).toBe("/acceso");
      expect(url.searchParams.get("motivo")).toBe("docente");
      expect(url.searchParams.get("next")).toBe(ruta);
    }
  });

  it("responde 403 en /api/reportes/** al evaluador", async () => {
    const respuesta = await proxy(await solicitud("/api/reportes/adaptabilidad/csv", { rol: "evaluador" }));
    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({ error: expect.any(String) });
  });

  it("no confunde rutas que solo empiezan igual", async () => {
    dejaPasar(await proxy(await solicitud("/reportesx", { rol: "evaluador" })));
  });

  it("deja pasar al docente en los reportes", async () => {
    dejaPasar(await proxy(await solicitud("/reportes", { rol: "docente" })));
    dejaPasar(await proxy(await solicitud("/api/reportes/adaptabilidad", { rol: "docente" })));
  });
});
