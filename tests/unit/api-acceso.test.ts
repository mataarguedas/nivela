import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as acceder } from "@/app/api/acceso/route";
import { POST as salir } from "@/app/api/salir/route";
import { COOKIE_SESION, COOKIE_SESION_PREVIA, verificarSesion } from "@/lib/sesion";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-con-al-menos-32-bytes!!");
  vi.stubEnv("CODIGO_ACCESO", "clase-2026");
  vi.stubEnv("CODIGO_DOCENTE", "docente-2026");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function pedir(cuerpo: unknown) {
  return new Request("http://localhost/api/acceso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

/** Runs a failing request under fake timers and checks it waited ~400 ms. */
async function conRetraso(peticion: Request) {
  vi.useFakeTimers();
  let resuelta = false;
  const promesa = acceder(peticion).then((r) => {
    resuelta = true;
    return r;
  });
  await vi.advanceTimersByTimeAsync(399);
  expect(resuelta).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  return promesa;
}

function cookieDe(respuesta: Response, nombre: string): string | undefined {
  return respuesta.headers.getSetCookie().find((c) => c.startsWith(`${nombre}=`));
}

describe("POST /api/acceso", () => {
  it("el código de clase da rol evaluador y una cookie httpOnly de 12 h", async () => {
    const respuesta = await acceder(pedir({ codigo: "  clase-2026 " }));
    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual({ rol: "evaluador" });

    const cookie = cookieDe(respuesta, COOKIE_SESION)!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=43200/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/i);

    const token = cookie.split(";")[0].slice(COOKIE_SESION.length + 1);
    await expect(verificarSesion(token)).resolves.toMatchObject({ rol: "evaluador" });
    expect(cookieDe(respuesta, COOKIE_SESION_PREVIA)).toBeDefined();
  });

  it("el código docente da rol docente", async () => {
    const respuesta = await acceder(pedir({ codigo: "docente-2026" }));
    await expect(respuesta.json()).resolves.toEqual({ rol: "docente" });
  });

  it("marca la cookie como Secure en producción", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const respuesta = await acceder(pedir({ codigo: "clase-2026" }));
    expect(cookieDe(respuesta, COOKIE_SESION)).toMatch(/Secure/i);
  });

  it("un código incorrecto espera ~400 ms y responde 401 en español sin cookie", async () => {
    const respuesta = await conRetraso(pedir({ codigo: "clase-2025" }));
    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({ error: "El código no es válido. Verifique con su docente." });
    expect(cookieDe(respuesta, COOKIE_SESION)).toBeUndefined();
  });

  it.each([[{}], [{ codigo: "" }], [{ codigo: "   " }], [{ codigo: 123 }], ["no es json"]])(
    "un cuerpo inválido (%j) espera y responde 400",
    async (cuerpo) => {
      const respuesta = await conRetraso(pedir(cuerpo));
      expect(respuesta.status).toBe(400);
      await expect(respuesta.json()).resolves.toEqual({ error: expect.any(String) });
    },
  );
});

describe("POST /api/salir", () => {
  it("borra la cookie de sesión y la marca de sesión previa, y redirige a /acceso", async () => {
    const respuesta = await salir();
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.get("location")).toBe("/acceso");
    expect(cookieDe(respuesta, COOKIE_SESION)).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
    expect(cookieDe(respuesta, COOKIE_SESION_PREVIA)).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
  });
});
