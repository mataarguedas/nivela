import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generarParticipantes } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
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
const CARNETS = ["100000001", " 200000002 ", ""];
/** What the db layer receives for NOMBRES + CARNETS (no emails): trimmed, blanks as null. */
const LISTA = { nombres: ["Ana Pérez", null, "Carlos Peña"], carnets: ["100000001", "200000002", null], correos: [null, null, null] };

function guardar(cuerpo: unknown) {
  return PUT(
    new Request("http://localhost/api/admin/participantes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // The editor always names the jornada it loaded and sends a carnet and
      // an email per name; tests may override them.
      body: JSON.stringify(
        cuerpo && typeof cuerpo === "object"
          ? (() => {
              const vacios = ((cuerpo as { nombres?: unknown[] }).nombres ?? []).map(() => "");
              return { jornada: "manana", carnets: vacios, correos: vacios, ...cuerpo };
            })()
          : cuerpo,
      ),
    }),
  );
}

beforeEach(() => {
  sesion.getSesion.mockResolvedValue({ rol: "admin", sid: SID, jornada: "manana" });
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
      sesion.getSesion.mockResolvedValue({ rol, sid: SID, jornada: "manana" });
      expect((await guardar({ cantidad: 3, nombres: NOMBRES })).status).toBe(403);
    }
    expect(db.guardarParticipantes).not.toHaveBeenCalled();
  });

  it("guarda los nombres y carnés validados (vacíos como null) sin caché", async () => {
    const respuesta = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({ cantidad: 3 });
    expect(db.guardarParticipantes).toHaveBeenCalledWith("manana", LISTA, false);
  });

  it("400 con un carné inválido, repetido o con una lista de carnés de otro largo", async () => {
    const invalido = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: ["100000001", "20 00", ""] });
    expect(invalido.status).toBe(400);
    await expect(invalido.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.carnetParticipante(2) });

    const repetido = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: ["A-1", "", "a-1"] });
    expect(repetido.status).toBe(400);
    await expect(repetido.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.carnetRepetido(3) });

    const corta = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: ["1"] });
    expect(corta.status).toBe(400);
    await expect(corta.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.listaParticipantes });
    expect(db.guardarParticipantes).not.toHaveBeenCalled();
  });

  it("guarda los correos recortados y en minúsculas; 400 con uno inválido; nunca los registra (PRD §5.14)", async () => {
    const respuesta = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS, correos: [" Ana.Perez@Ejemplo.TEST ", "", "carlos@ejemplo.test"] });
    expect(respuesta.status).toBe(200);
    expect(db.guardarParticipantes).toHaveBeenCalledWith(
      "manana",
      { ...LISTA, correos: ["ana.perez@ejemplo.test", null, "carlos@ejemplo.test"] },
      false,
    );

    const invalido = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS, correos: ["", "carlos@", ""] });
    expect(invalido.status).toBe(400);
    await expect(invalido.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.correoParticipante(2) });
    const corta = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS, correos: [""] });
    expect(corta.status).toBe(400);
    await expect(corta.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.listaParticipantes });

    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    db.guardarParticipantes.mockRejectedValueOnce(new Error('Failed query: params: "carlos@ejemplo.test"'));
    await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS, correos: ["", "", "carlos@ejemplo.test"] });
    expect(consola.mock.calls.flat().join(" ")).not.toContain("carlos@ejemplo.test");
  });

  it("guarda la lista de la jornada de la sesión", async () => {
    sesion.getSesion.mockResolvedValue({ rol: "admin", sid: SID, jornada: "noche" });
    expect((await guardar({ jornada: "noche", cantidad: 3, nombres: NOMBRES, carnets: CARNETS })).status).toBe(200);
    expect(db.guardarParticipantes).toHaveBeenCalledWith("noche", LISTA, false);
  });

  it("409 sin guardar si la jornada del editor no es la de la sesión (otra pestaña)", async () => {
    sesion.getSesion.mockResolvedValue({ rol: "admin", sid: SID, jornada: "noche" });
    const respuesta = await guardar({ jornada: "manana", cantidad: 3, nombres: NOMBRES });
    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({ error: TEXTOS.jornada.distinta, jornadaDistinta: true });
    expect(db.guardarParticipantes).not.toHaveBeenCalled();
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

    expect((await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS, confirmar: true })).status).toBe(200);
    expect(db.guardarParticipantes).toHaveBeenLastCalledWith("manana", LISTA, true);
  });

  it("500 si falla la base de datos, sin registrar los nombres ni los carnés", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    db.guardarParticipantes.mockRejectedValue(new Error('Failed query: params: "Ana Pérez", "100000001"'));
    const respuesta = await guardar({ cantidad: 3, nombres: NOMBRES, carnets: CARNETS });
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: TEXTOS_ADMIN.errorGuardar });
    const registrado = consola.mock.calls.flat().join(" ");
    expect(registrado).not.toContain("Ana");
    expect(registrado).not.toContain("100000001");
  });
});
