import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sinRubrica } from "./sinRubrica";

// POST /api/reportes/[competencia]/enviar (PRD §10, §5.14) with the send
// layer mocked: docente only, the session's jornada only (never one from the
// request), body validation (participant ids only: never scores), the test
// send, and error handling. The sending itself is covered in
// envio-resultados.test.ts.

const envio = vi.hoisted(() => ({ cargarContextoEnvio: vi.fn(), enviarResultados: vi.fn(), enviarPrueba: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/envioResultados", () => envio);
vi.mock("@/lib/sesion", () => sesion);

const { ErrorCorreo } = await import("@/lib/correo");
const { POST, maxDuration } = await import("@/app/api/reportes/[competencia]/enviar/route");

const DOCENTE = { rol: "docente", sid: "0123456789abcdef0123", jornada: "noche" };
const CONTEXTO = { marcador: "contexto" };

function pedir(cuerpo: unknown, competencia = "adaptabilidad") {
  return POST(
    new Request(`http://localhost/api/reportes/${competencia}/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
    { params: Promise.resolve({ competencia }) },
  );
}

beforeEach(() => {
  sesion.getSesion.mockResolvedValue(DOCENTE);
  envio.cargarContextoEnvio.mockResolvedValue(CONTEXTO);
  envio.enviarResultados.mockResolvedValue({ enviados: 2, errores: [{ participanteId: "P04", motivo: "sin-correo" }] });
  envio.enviarPrueba.mockResolvedValue(true);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/reportes/[competencia]/enviar", () => {
  it("401 sin sesión y 403 para evaluador o admin, sin enviar nada", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await pedir({ participantes: ["P01"] })).status).toBe(401);
    for (const rol of ["evaluador", "admin"]) {
      sesion.getSesion.mockResolvedValue({ ...DOCENTE, rol, integranteId: "gabriela-salgado" });
      expect((await pedir({ participantes: ["P01"] })).status).toBe(403);
    }
    expect(envio.cargarContextoEnvio).not.toHaveBeenCalled();
  });

  it("envía con la jornada de la sesión y su propio equipo, y responde { enviados, errores }", async () => {
    const respuesta = await pedir({ participantes: ["P01", "P02", "P04"], reenviar: true });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({ enviados: 2, errores: [{ participanteId: "P04", motivo: "sin-correo" }] });
    const [jornada, competencia, equipo] = envio.cargarContextoEnvio.mock.calls[0];
    expect(jornada).toBe("noche");
    expect(competencia.id).toBe("adaptabilidad");
    expect(equipo).toMatchObject({ jornada: "noche", competenciaId: "adaptabilidad" });
    expect(envio.enviarResultados).toHaveBeenCalledWith(CONTEXTO, ["P01", "P02", "P04"], true);
  });

  it("ignora cualquier jornada o puntaje en el cuerpo: «reenviar» es falso si no se indica", async () => {
    await pedir({ participantes: ["P01"], jornada: "manana", puntaje: 4 });
    expect(envio.cargarContextoEnvio.mock.calls[0][0]).toBe("noche");
    expect(envio.enviarResultados).toHaveBeenCalledWith(CONTEXTO, ["P01"], false);
  });

  it("404 para una competencia sin plantilla en la jornada de la sesión", async () => {
    sinRubrica("noche", "pensamiento-critico"); // no real night-less rubric since v1.7
    const respuesta = await pedir({ participantes: ["P01"] }, "pensamiento-critico");
    expect(respuesta.status).toBe(404);
    expect(envio.cargarContextoEnvio).not.toHaveBeenCalled();
  });

  it.each([null, {}, { participantes: [] }, { participantes: ["X1"] }, { participantes: ["P01"], reenviar: "sí" }])(
    "400 con un cuerpo inválido (%j)",
    async (cuerpo) => {
      const respuesta = await pedir(cuerpo);
      expect(respuesta.status).toBe(400);
      await expect(respuesta.json()).resolves.toEqual({ error: "Los datos del envío no son válidos." });
      expect(envio.enviarResultados).not.toHaveBeenCalled();
    },
  );

  it("«Enviarme una prueba»: valida la dirección y envía la del participante indicado", async () => {
    const invalida = await pedir({ prueba: "docente@", participanteId: "P01" });
    expect(invalida.status).toBe(400);
    await expect(invalida.json()).resolves.toEqual({ error: "Ingrese un correo electrónico válido para la prueba." });

    const respuesta = await pedir({ prueba: " Docente@Ejemplo.TEST ", participanteId: "P02" });
    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual({ enviada: true });
    expect(envio.enviarPrueba).toHaveBeenCalledWith(CONTEXTO, "P02", "docente@ejemplo.test");
    expect(envio.enviarResultados).not.toHaveBeenCalled();

    envio.enviarPrueba.mockResolvedValue(false);
    expect((await pedir({ prueba: "docente@ejemplo.test", participanteId: "P05" })).status).toBe(400);

    envio.enviarPrueba.mockRejectedValue(new ErrorCorreo("red"));
    const fallo = await pedir({ prueba: "docente@ejemplo.test", participanteId: "P02" });
    expect(fallo.status).toBe(502);
    await expect(fallo.json()).resolves.toEqual({ error: "No se pudo enviar la prueba. Intente de nuevo." });
  });

  it("500 si falla la base de datos, sin registrar direcciones", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    envio.cargarContextoEnvio.mockRejectedValue(new Error('Failed query: params: "p01@ejemplo.test"'));
    const respuesta = await pedir({ participantes: ["P01"] });
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "No se pudieron enviar los resultados. Intente de nuevo." });
    expect(consola.mock.calls.flat().join(" ")).not.toContain("@ejemplo.test");
  });

  it("deja tiempo para enviar una lista completa a ritmo de Resend", () => {
    expect(maxDuration).toBeGreaterThanOrEqual(120);
  });
});
