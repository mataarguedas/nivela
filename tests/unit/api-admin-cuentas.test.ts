import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { equipoDeCompetencia } from "@/config/equipos";

// /api/admin/cuentas (PRD §5.12, §10) with the db layer and the session
// mocked: admin only, scoped to the session's jornada, email edits (409 when
// another account has it) and "Restablecer acceso". The SQL is covered in
// cuentas-db.test.ts.

const db = vi.hoisted(() => ({
  cambiarCorreo: vi.fn(),
  cuentaPorCorreo: vi.fn(),
  cuentaPorId: vi.fn(),
  restablecerAcceso: vi.fn(),
}));
const cuentas = vi.hoisted(() => ({ listarCuentasJornada: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/db/cuentas", () => db);
vi.mock("@/lib/cuentas", async (original) => ({ ...(await original<object>()), ...cuentas }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/sesion", () => sesion);

const { GET, PUT } = await import("@/app/api/admin/cuentas/route");

const SID = "0123456789abcdef0123";
const DE_NOCHE = equipoDeCompetencia("noche", "adaptabilidad")!.integrantes[0];
const DE_MANANA = equipoDeCompetencia("manana", "adaptabilidad")!.integrantes[0];

function cambiar(cuerpo: unknown) {
  return PUT(
    new Request("http://localhost/api/admin/cuentas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
  );
}

beforeEach(() => {
  sesion.getSesion.mockResolvedValue({ rol: "admin", sid: SID, jornada: "noche" });
  db.cambiarCorreo.mockResolvedValue(true);
  db.cuentaPorCorreo.mockResolvedValue(undefined);
  db.cuentaPorId.mockResolvedValue({ integranteId: DE_NOCHE.id, correo: "nuevo@ejemplo.test", contrasenaHash: null, ultimoAcceso: null });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("/api/admin/cuentas", () => {
  it("401 sin sesión y 403 para docente y evaluador", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    sesion.getSesion.mockResolvedValue({ rol: "docente", sid: SID, jornada: "noche" });
    expect((await GET()).status).toBe(403);
    expect((await cambiar({ integranteId: DE_NOCHE.id, correo: "x@ejemplo.test" })).status).toBe(403);
    expect(db.cambiarCorreo).not.toHaveBeenCalled();
  });

  it("GET lista las cuentas de la jornada de la sesión", async () => {
    cuentas.listarCuentasJornada.mockResolvedValue([]);
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(cuentas.listarCuentasJornada).toHaveBeenCalledWith({}, "noche");
  });

  it("guarda un correo normalizado y devuelve la cuenta como «Pendiente de activar»", async () => {
    const respuesta = await cambiar({ integranteId: DE_NOCHE.id, correo: "  Nuevo@Ejemplo.TEST " });
    expect(respuesta.status).toBe(200);
    expect(db.cambiarCorreo).toHaveBeenCalledWith({}, DE_NOCHE.id, "nuevo@ejemplo.test");
    await expect(respuesta.json()).resolves.toEqual({
      cuenta: {
        integranteId: DE_NOCHE.id,
        nombre: DE_NOCHE.nombre,
        curso: DE_NOCHE.curso,
        correo: "nuevo@ejemplo.test",
        estado: "pendiente",
        ultimoAcceso: null,
      },
    });
  });

  it("un correo vacío quita el correo", async () => {
    await cambiar({ integranteId: DE_NOCHE.id, correo: "" });
    expect(db.cambiarCorreo).toHaveBeenCalledWith({}, DE_NOCHE.id, null);
  });

  it("409 si el correo ya es de otra cuenta", async () => {
    db.cuentaPorCorreo.mockResolvedValue({ integranteId: "otra-persona" });
    const respuesta = await cambiar({ integranteId: DE_NOCHE.id, correo: "repetido@ejemplo.test" });
    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({ error: "Ese correo ya está asignado a otra cuenta." });
    expect(db.cambiarCorreo).not.toHaveBeenCalled();
  });

  it("restablece el acceso", async () => {
    const respuesta = await cambiar({ integranteId: DE_NOCHE.id, restablecer: true });
    expect(respuesta.status).toBe(200);
    expect(db.restablecerAcceso).toHaveBeenCalledWith({}, DE_NOCHE.id);
  });

  it("rechaza integrantes de la otra jornada o desconocidos, y datos inválidos", async () => {
    expect((await cambiar({ integranteId: DE_MANANA.id, correo: "x@ejemplo.test" })).status).toBe(400);
    expect((await cambiar({ integranteId: "nadie", restablecer: true })).status).toBe(400);
    const malo = await cambiar({ integranteId: DE_NOCHE.id, correo: "no-es-correo" });
    expect(malo.status).toBe(400);
    await expect(malo.json()).resolves.toEqual({ error: "Ingrese un correo electrónico válido." });
    expect((await cambiar({ integranteId: DE_NOCHE.id, restablecer: false })).status).toBe(400);
    expect(db.cambiarCorreo).not.toHaveBeenCalled();
    expect(db.restablecerAcceso).not.toHaveBeenCalled();
  });

  it("500 sin registrar el correo", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    db.cambiarCorreo.mockRejectedValue(Object.assign(new Error("params: nuevo@ejemplo.test"), { code: "57P01" }));
    expect((await cambiar({ integranteId: DE_NOCHE.id, correo: "nuevo@ejemplo.test" })).status).toBe(500);
    expect(registro.mock.calls.flat().map(String).join(" ")).not.toContain("@");
  });
});
