import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generarParticipantes } from "@/config/participantes";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import { MENSAJES_VALIDACION } from "@/lib/validacion";

// PUT /api/admin/participantes with the db layer and the session mocked. The
// SQL (hiding, names kept, evaluation count) is covered against a real
// Postgres in participantes-db.test.ts.

const db = vi.hoisted(() => ({ guardarParticipantes: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/db/participantes", () => db);
vi.mock("@/lib/sesion", () => sesion);

const { PUT } = await import("@/app/api/admin/participantes/route");

const SID = "0123456789abcdef0123";
const NOMBRES = ["Ana Pérez", "", "Carlos Peña"];

function guardar(cuerpo: unknown) {
  return PUT(
    new Request("http://localhost/api/admin/participantes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
  );
}

beforeEach(() => {
  sesion.getSesion.mockResolvedValue({ rol: "admin", sid: SID });
  db.guardarParticipantes.mockResolvedValue({ ok: true, participantes: generarParticipantes(3) });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("PUT /api/admin/participantes", () => {
  it("401 sin sesión y 403 para evaluador o docente, sin tocar la base de datos", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await guardar({ cantidad: 3, nombres: NOMBRES })).status).toBe(401);
    for (const rol of ["evaluador", "docente"]) {
      sesion.getSesion.mockResolvedValue({ rol, sid: SID });
      expect((await guardar({ cantidad: 3, nombres: NOMBRES })).status).toBe(403);
    }
    expect(db.guardarParticipantes).not.toHaveBeenCalled();
  });

  it("guarda los nombres validados (vacíos como null) sin caché", async () => {
    const respuesta = await guardar({ cantidad: 3, nombres: NOMBRES });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({ cantidad: 3 });
    expect(db.guardarParticipantes).toHaveBeenCalledWith(["Ana Pérez", null, "Carlos Peña"], false);
  });

  it("400 con un nombre que parece un correo", async () => {
    const respuesta = await guardar({ cantidad: 2, nombres: ["Ana", "ana@ejemplo.com"] });
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.nombreParticipante(2) });
    expect(db.guardarParticipantes).not.toHaveBeenCalled();
  });

  it("409 con los conteos si se ocultarían participantes con evaluaciones; con confirmar pasa", async () => {
    db.guardarParticipantes.mockResolvedValueOnce({ ok: false, ocultos: 2, evaluacionesAfectadas: 9 });
    const respuesta = await guardar({ cantidad: 3, nombres: NOMBRES });
    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: TEXTOS_ADMIN.confirmarDescripcion(2, 9),
      ocultos: 2,
      evaluacionesAfectadas: 9,
    });

    expect((await guardar({ cantidad: 3, nombres: NOMBRES, confirmar: true })).status).toBe(200);
    expect(db.guardarParticipantes).toHaveBeenLastCalledWith(["Ana Pérez", null, "Carlos Peña"], true);
  });

  it("500 si falla la base de datos, sin registrar los nombres", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    db.guardarParticipantes.mockRejectedValue(new Error('Failed query: params: "Ana Pérez"'));
    const respuesta = await guardar({ cantidad: 3, nombres: NOMBRES });
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: TEXTOS_ADMIN.errorGuardar });
    const registrado = consola.mock.calls.flat().join(" ");
    expect(registrado).not.toContain("Ana");
  });
});
