import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MENSAJES_VALIDACION } from "@/lib/validacion";

// POST /api/jev with the session, the usage counter and the Jev client
// mocked. The counter's SQL is covered against Postgres in uso-jev-db.test.ts
// and the Jev mapping in jev.test.ts.

const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
const uso = vi.hoisted(() => ({ registrarUsoJev: vi.fn(), LIMITE_ANALISIS_POR_HORA: 60 }));
const jev = vi.hoisted(() => ({ sugerirNivel: vi.fn() }));
vi.mock("@/lib/sesion", () => sesion);
vi.mock("@/lib/db/usoJev", () => uso);
vi.mock("@/lib/jev", () => jev);

const { POST } = await import("@/app/api/jev/route");

const SID = "0123456789abcdef0123";
const TEXTO = "Reorganizó sus actividades sin ayuda cuando cambiaron las prioridades del proyecto.";
const CUERPO = { competenciaId: "adaptabilidad", indicadorId: "adaptabilidad-3", texto: TEXTO };
const SUGERENCIA = {
  nivelSugerido: 3,
  probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 },
  confianza: 0.71,
  pertinencia: 0.93,
  baja_confianza: false,
  alternativa: null,
  modelo: "jev-1.13.0",
};

function analizar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost/api/jev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
}

let registro: { info: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };

beforeEach(() => {
  sesion.getSesion.mockResolvedValue({ rol: "evaluador", sid: SID });
  uso.registrarUsoJev.mockResolvedValue({ conteo: 1, segundosRestantes: 1800 });
  jev.sugerirNivel.mockResolvedValue({ ok: true, sugerencia: SUGERENCIA });
  registro = {
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
  };
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

function registrado(): string {
  return [...registro.info.mock.calls, ...registro.error.mock.calls].flat().map(String).join(" ");
}

describe("POST /api/jev", () => {
  it("401 sin sesión, sin contar uso ni llamar a Jev", async () => {
    sesion.getSesion.mockResolvedValue(null);
    const respuesta = await analizar(CUERPO);
    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({ error: "Debe ingresar el código de acceso para continuar." });
    expect(uso.registrarUsoJev).not.toHaveBeenCalled();
    expect(jev.sugerirNivel).not.toHaveBeenCalled();
  });

  it("200 con el contrato de la sugerencia, sin caché; cuenta el uso de esta sesión", async () => {
    const respuesta = await analizar(CUERPO);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual(SUGERENCIA);
    expect(uso.registrarUsoJev).toHaveBeenCalledWith(SID);
  });

  it("busca la rúbrica en la configuración y solo pasa el texto recortado", async () => {
    await analizar({ ...CUERPO, texto: `  ${TEXTO}  `, participanteId: "P07", criterios: ["inyectado"] });
    const [competencia, indicador, texto] = jev.sugerirNivel.mock.calls[0];
    expect(competencia.id).toBe("adaptabilidad");
    expect(indicador.titulo).toBe("Ajusta las prioridades.");
    expect(texto).toBe(TEXTO);
  });

  it("acepta también el rol docente", async () => {
    sesion.getSesion.mockResolvedValue({ rol: "docente", sid: SID });
    expect((await analizar(CUERPO)).status).toBe(200);
  });

  it.each([
    ["JSON inválido", "{no es json", MENSAJES_VALIDACION.solicitudIa],
    ["texto corto", { ...CUERPO, texto: "Muy corto." }, MENSAJES_VALIDACION.descripcion],
    ["solo espacios alrededor de un texto corto", { ...CUERPO, texto: `   ${"a".repeat(19)}   ` }, MENSAJES_VALIDACION.descripcion],
    ["texto de más de 1500", { ...CUERPO, texto: "a".repeat(1501) }, MENSAJES_VALIDACION.descripcion],
    ["sin indicador", { competenciaId: "adaptabilidad", texto: TEXTO }, MENSAJES_VALIDACION.solicitudIa],
    ["indicador ajeno", { ...CUERPO, indicadorId: "adaptabilidad-9" }, MENSAJES_VALIDACION.indicador],
    ["competencia deshabilitada", { ...CUERPO, competenciaId: "pensamiento-critico" }, MENSAJES_VALIDACION.competencia],
  ])("400 con mensaje en español: %s", async (_caso, cuerpo, mensaje) => {
    const respuesta = await analizar(cuerpo);
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: mensaje });
    expect(uso.registrarUsoJev).not.toHaveBeenCalled();
    expect(jev.sugerirNivel).not.toHaveBeenCalled();
  });

  it("acepta exactamente 20 y 1500 caracteres", async () => {
    expect((await analizar({ ...CUERPO, texto: "a".repeat(20) })).status).toBe(200);
    expect((await analizar({ ...CUERPO, texto: "a".repeat(1500) })).status).toBe(200);
  });

  describe("límite por sesión (60 por hora)", () => {
    it("el análisis 60 todavía pasa", async () => {
      uso.registrarUsoJev.mockResolvedValue({ conteo: 60, segundosRestantes: 900 });
      expect((await analizar(CUERPO)).status).toBe(200);
      expect(jev.sugerirNivel).toHaveBeenCalledTimes(1);
    });

    it("el 61 es 429 con Retry-After hasta el fin de la ventana, sin llamar a Jev", async () => {
      uso.registrarUsoJev.mockResolvedValue({ conteo: 61, segundosRestantes: 900 });
      const respuesta = await analizar(CUERPO);
      expect(respuesta.status).toBe(429);
      expect(respuesta.headers.get("retry-after")).toBe("900");
      await expect(respuesta.json()).resolves.toEqual({
        error: "Alcanzó el límite de análisis por hora. Seleccione el nivel manualmente o intente más tarde.",
      });
      expect(jev.sugerirNivel).not.toHaveBeenCalled();
    });

    it("si no se puede consultar el límite, falla cerrado con 500 y no llama a Jev", async () => {
      uso.registrarUsoJev.mockRejectedValue(new Error(`Failed query: insert ... params: ${SID}`));
      const respuesta = await analizar(CUERPO);
      expect(respuesta.status).toBe(500);
      await expect(respuesta.json()).resolves.toHaveProperty("error");
      expect(jev.sugerirNivel).not.toHaveBeenCalled();
      expect(registrado()).not.toContain(SID);
    });
  });

  it("un 429 de Jev pasa con su Retry-After", async () => {
    jev.sugerirNivel.mockResolvedValue({ ok: false, status: 429, error: "No fue posible…", retryAfterS: 7, statusJev: 429 });
    const respuesta = await analizar(CUERPO);
    expect(respuesta.status).toBe(429);
    expect(respuesta.headers.get("retry-after")).toBe("7");
    await expect(respuesta.json()).resolves.toEqual({ error: "No fue posible…" });
  });

  it.each([502, 504])("los errores de Jev (%i) pasan con su mensaje y sin Retry-After", async (status) => {
    jev.sugerirNivel.mockResolvedValue({ ok: false, status, error: "Mensaje" });
    const respuesta = await analizar(CUERPO);
    expect(respuesta.status).toBe(status);
    expect(respuesta.headers.get("retry-after")).toBeNull();
    await expect(respuesta.json()).resolves.toEqual({ error: "Mensaje" });
  });

  it("registra estado, latencia y modelo, nunca el texto ni la sesión", async () => {
    await analizar(CUERPO);
    jev.sugerirNivel.mockResolvedValue({ ok: false, status: 502, error: "x", statusJev: 529 });
    await analizar(CUERPO);
    const lineas = registrado();
    expect(lineas).toContain('"status":200');
    expect(lineas).toContain('"modelo":"jev-1.13.0"');
    expect(lineas).toContain('"statusJev":529');
    expect(lineas).not.toContain(TEXTO);
    expect(lineas).not.toContain("Reorganizó");
    expect(lineas).not.toContain(SID);
  });
});
