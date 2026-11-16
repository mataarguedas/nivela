import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// connection() needs a real request scope; outside Next it only has to resolve.
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/dev/correos/route";
import { enviarCorreo, vaciarBuzon } from "@/lib/correo";

// GET /api/dev/correos (PRD §10, dev only): the newest "consola" email to `para`.

function pedir(consulta: string) {
  return GET(new Request(`http://localhost:3000/api/dev/correos${consulta}`));
}

beforeEach(() => {
  vaciarBuzon();
  vi.stubEnv("CORREO_MODO", "consola");
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/dev/correos", () => {
  it("devuelve el último correo para esa dirección, sin importar mayúsculas", async () => {
    await enviarCorreo({ plantilla: "codigoVerificacion", para: "ana@ejemplo.test", asunto: "Primero", html: "<p>1</p>", texto: "1" });
    await enviarCorreo({ plantilla: "codigoVerificacion", para: "ana@ejemplo.test", asunto: "Segundo", html: "<p>2</p>", texto: "Su código de Nivela es 654321." });

    const respuesta = await pedir("?para=ANA@ejemplo.test");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    const cuerpo = await respuesta.json();
    expect(cuerpo).toMatchObject({ para: "ana@ejemplo.test", asunto: "Segundo", plantilla: "codigoVerificacion" });
    expect(cuerpo.texto.match(/\d{6}/)?.[0]).toBe("654321");
  });

  it("404 si no hay correos para esa dirección", async () => {
    expect((await pedir("?para=nadie@ejemplo.test")).status).toBe(404);
  });

  it("400 sin un correo válido", async () => {
    expect((await pedir("")).status).toBe(400);
    expect((await pedir("?para=no-es-correo")).status).toBe(400);
  });

  it("404 en producción", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await pedir("?para=ana@ejemplo.test")).status).toBe(404);
  });
});
