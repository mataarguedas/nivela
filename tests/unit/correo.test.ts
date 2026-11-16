import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enviarCorreo,
  ErrorCorreo,
  leerBuzon,
  MAXIMO_BUZON,
  modoCorreo,
  TIEMPO_LIMITE_MS,
  ultimoCorreoPara,
  URL_RESEND,
  vaciarBuzon,
  type Correo,
} from "@/lib/correo";

// Email layer (PRD §13 Email, FR-27): transports, error mapping, outbox, and
// logs that never carry the recipient, subject or body.

const CORREO: Correo = {
  plantilla: "codigoVerificacion",
  para: "Persona.Prueba@Ejemplo.test",
  asunto: "Asunto secreto",
  html: "<p>cuerpo secreto</p>",
  texto: "cuerpo secreto",
};

function respuesta(status: number, cuerpo: unknown, encabezados: Record<string, string> = {}) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json", ...encabezados } });
}

let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

function lineasDeLog(): string {
  return [...info.mock.calls, ...error.mock.calls].map((c) => String(c[0])).join("\n");
}

beforeEach(() => {
  vaciarBuzon();
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("modoCorreo", () => {
  it("es consola por defecto fuera de producción", () => {
    vi.stubEnv("CORREO_MODO", "");
    expect(modoCorreo()).toBe("consola");
    vi.stubEnv("CORREO_MODO", "algo");
    expect(modoCorreo()).toBe("consola");
  });

  it("es resend si CORREO_MODO lo pide", () => {
    vi.stubEnv("CORREO_MODO", "resend");
    expect(modoCorreo()).toBe("resend");
  });

  it("en producción siempre es resend, aunque diga consola", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CORREO_MODO", "consola");
    expect(modoCorreo()).toBe("resend");
    expect(leerBuzon()).toEqual([]);
  });
});

describe("transporte consola", () => {
  beforeEach(() => vi.stubEnv("CORREO_MODO", "consola"));

  it("no llama a la red y guarda el mensaje con el destinatario en minúsculas", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const { id } = await enviarCorreo(CORREO);

    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(id).toMatch(/^consola-/);
    const mensaje = ultimoCorreoPara("persona.prueba@ejemplo.test");
    expect(mensaje).toMatchObject({ id, para: "persona.prueba@ejemplo.test", asunto: "Asunto secreto", texto: "cuerpo secreto" });
  });

  it("guarda solo los últimos mensajes, el más reciente primero", async () => {
    for (let i = 0; i < MAXIMO_BUZON + 5; i++) await enviarCorreo({ ...CORREO, asunto: `n.º ${i}` });
    const buzon = leerBuzon();
    expect(buzon).toHaveLength(MAXIMO_BUZON);
    expect(buzon[0].asunto).toBe(`n.º ${MAXIMO_BUZON + 4}`);
    expect(ultimoCorreoPara(CORREO.para)?.asunto).toBe(`n.º ${MAXIMO_BUZON + 4}`);
  });

  it("ultimoCorreoPara no confunde destinatarios", async () => {
    await enviarCorreo({ ...CORREO, para: "a@ejemplo.test", asunto: "para A" });
    await enviarCorreo({ ...CORREO, para: "b@ejemplo.test", asunto: "para B" });
    expect(ultimoCorreoPara("a@ejemplo.test")?.asunto).toBe("para A");
    expect(ultimoCorreoPara("c@ejemplo.test")).toBeUndefined();
  });
});

describe("transporte resend", () => {
  beforeEach(() => {
    vi.stubEnv("CORREO_MODO", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_clave_de_prueba");
    vi.stubEnv("CORREO_REMITENTE", "Nivela <no-responder@correo.ejemplo.test>");
  });

  it("éxito: POST a Resend con clave, remitente, texto, HTML, idempotencia y tiempo límite", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(respuesta(200, { id: "re-123" }));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(enviarCorreo({ ...CORREO, idempotencia: "manana-adaptabilidad-P01" })).resolves.toEqual({ id: "re-123" });

    const [url, init] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL_RESEND);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_clave_de_prueba",
      "Content-Type": "application/json",
      "Idempotency-Key": "manana-adaptabilidad-P01",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({
      from: "Nivela <no-responder@correo.ejemplo.test>",
      to: ["Persona.Prueba@Ejemplo.test"],
      subject: "Asunto secreto",
      html: "<p>cuerpo secreto</p>",
      text: "cuerpo secreto",
    });
    expect(TIEMPO_LIMITE_MS).toBe(10_000);
    // Resend mode keeps nothing in memory.
    expect(leerBuzon()).toEqual([]);
  });

  it("sin clave de idempotencia no envía ese encabezado", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(respuesta(200, { id: "re-1" }));
    vi.stubGlobal("fetch", fetchSimulado);
    await enviarCorreo(CORREO);
    expect((fetchSimulado.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("Idempotency-Key");
  });

  it("429: tipo limite con los segundos de Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuesta(429, { name: "rate_limit_exceeded", message: "Too many requests" }, { "Retry-After": "2" })),
    );
    const fallo = await enviarCorreo(CORREO).catch((e: unknown) => e);
    expect(fallo).toBeInstanceOf(ErrorCorreo);
    expect(fallo).toMatchObject({ tipo: "limite", status: 429, reintentarEnSegundos: 2 });
  });

  it.each([
    [403, "validation_error", "dominio sin verificar"],
    [422, "validation_error", "dirección inválida"],
    [401, "missing_api_key", "clave inválida"],
  ])("%i (%s, %s): tipo rechazado", async (status, name) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(status, { name, message: `Invalid to: ${CORREO.para}` })));
    await expect(enviarCorreo(CORREO)).rejects.toMatchObject({ tipo: "rechazado", status });
  });

  it("5xx: tipo desconocido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(500, { name: "internal_server_error" })));
    await expect(enviarCorreo(CORREO)).rejects.toMatchObject({ tipo: "desconocido", status: 500 });
  });

  it("tiempo límite agotado: tipo red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError")));
    await expect(enviarCorreo(CORREO)).rejects.toMatchObject({ tipo: "red" });
  });

  it("falla de conexión: tipo red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(enviarCorreo(CORREO)).rejects.toMatchObject({ tipo: "red" });
  });

  it("200 sin id: tipo desconocido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200, {})));
    await expect(enviarCorreo(CORREO)).rejects.toMatchObject({ tipo: "desconocido" });
  });

  it("sin RESEND_API_KEY o CORREO_REMITENTE no intenta enviar", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    vi.stubEnv("CORREO_REMITENTE", "");
    await expect(enviarCorreo(CORREO)).rejects.toMatchObject({ tipo: "desconocido" });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

describe("registro", () => {
  it("registra plantilla, modo, estado, status, motivo y ms; nunca destinatario, asunto ni cuerpo", async () => {
    vi.stubEnv("CORREO_MODO", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_clave_de_prueba");
    vi.stubEnv("CORREO_REMITENTE", "Nivela <no-responder@correo.ejemplo.test>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(422, { name: "validation_error", message: `Invalid to: ${CORREO.para}` })));

    await enviarCorreo(CORREO).catch(() => {});

    const linea = JSON.parse(String(error.mock.calls[0][0]));
    expect(linea).toEqual({
      correo: "codigoVerificacion",
      modo: "resend",
      estado: "rechazado",
      status: 422,
      motivo: "validation_error",
      ms: expect.any(Number),
    });
    const todo = lineasDeLog();
    for (const secreto of [CORREO.para, CORREO.para.toLowerCase(), "Asunto secreto", "cuerpo secreto", "re_clave_de_prueba"]) {
      expect(todo).not.toContain(secreto);
    }
  });

  it("un envío correcto se registra como info", async () => {
    vi.stubEnv("CORREO_MODO", "consola");
    await enviarCorreo(CORREO);
    expect(JSON.parse(String(info.mock.calls[0][0]))).toMatchObject({ correo: "codigoVerificacion", modo: "consola", estado: "enviado" });
    expect(lineasDeLog()).not.toContain("ejemplo.test");
  });

  it("el mensaje del error no incluye el destinatario", async () => {
    vi.stubEnv("CORREO_MODO", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_clave_de_prueba");
    vi.stubEnv("CORREO_REMITENTE", "Nivela <no-responder@correo.ejemplo.test>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(422, { name: "validation_error", message: CORREO.para })));
    const fallo = (await enviarCorreo(CORREO).catch((e: unknown) => e)) as Error;
    expect(fallo.message).not.toContain("ejemplo.test");
  });
});
