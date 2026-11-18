import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { equipoDeCompetencia } from "@/config/equipos";
import { COOKIE_SESION, verificarSesion } from "@/lib/sesion";

// The evaluator email login routes (PRD §5.12, §10) with lib/cuentas, the db
// and the email transport mocked; the flows themselves run against Postgres
// in cuentas-db.test.ts. What matters here: unknown emails, accounts not yet
// activated and requests over the code limits get byte-identical answers;
// a code is emailed only when the flow returns one, after the response;
// failures wait ~400 ms; nothing personal reaches a log.

const cuentas = vi.hoisted(() => ({
  solicitarCodigo: vi.fn(),
  activarConCodigo: vi.fn(),
  iniciarConContrasena: vi.fn(),
}));
const correo = vi.hoisted(() => ({ enviarCorreo: vi.fn() }));
vi.mock("@/lib/cuentas", async (original) => ({ ...(await original<object>()), ...cuentas }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/correo", () => correo);
// `after()` needs a request scope; run the callback right away instead.
vi.mock("next/server", async (original) => ({
  ...(await original<object>()),
  after: (tarea: () => Promise<void>) => void tarea(),
}));

const { POST: pedirCorreo } = await import("@/app/api/acceso/correo/route");
const { POST: pedirRecuperar } = await import("@/app/api/acceso/recuperar/route");
const { POST: activar } = await import("@/app/api/acceso/activar/route");
const { POST: conContrasena } = await import("@/app/api/acceso/contrasena/route");

const INTEGRANTE = equipoDeCompetencia("noche", "adaptabilidad")!.integrantes[0].id;
const CORREO = "persona@ejemplo.test";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-con-al-menos-32-bytes!!");
  correo.enviarCorreo.mockResolvedValue({ id: "x" });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function pedir(cuerpo: unknown) {
  return new Request("http://localhost/api/acceso/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

async function contenido(respuesta: Response) {
  return { status: respuesta.status, cuerpo: await respuesta.text(), cookies: respuesta.headers.getSetCookie() };
}

/** Runs a request under fake timers and checks it waited ~400 ms. */
async function conRetraso(promesa: () => Promise<Response>) {
  vi.useFakeTimers();
  let resuelta = false;
  const respuesta = promesa().then((r) => {
    resuelta = true;
    return r;
  });
  await vi.advanceTimersByTimeAsync(399);
  expect(resuelta).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  return respuesta;
}

describe("POST /api/acceso/correo y /recuperar", () => {
  it("responde igual con o sin código por enviar, y solo envía cuando lo hay", async () => {
    cuentas.solicitarCodigo.mockResolvedValueOnce({ paso: "codigo" }); // unknown or over the limit
    const sinEnvio = await contenido(await pedirCorreo(pedir({ correo: "otra@ejemplo.test" })));
    expect(correo.enviarCorreo).not.toHaveBeenCalled();

    cuentas.solicitarCodigo.mockResolvedValueOnce({ paso: "codigo", envio: { para: CORREO, codigo: "123456" } });
    const conEnvio = await contenido(await pedirCorreo(pedir({ correo: CORREO })));
    expect(conEnvio).toEqual(sinEnvio);
    expect(conEnvio).toEqual({ status: 200, cuerpo: JSON.stringify({ paso: "codigo" }), cookies: [] });

    expect(correo.enviarCorreo).toHaveBeenCalledTimes(1);
    const enviado = correo.enviarCorreo.mock.calls[0][0];
    expect(enviado).toMatchObject({ plantilla: "codigoVerificacion", para: CORREO });
    expect(enviado.texto).toContain("123456");
    expect(enviado.texto).toContain("10 minutos");
  });

  it("normaliza el correo y pasa el motivo", async () => {
    cuentas.solicitarCodigo.mockResolvedValue({ paso: "contrasena" });
    const respuesta = await pedirCorreo(pedir({ correo: `  ${CORREO.toUpperCase()} ` }));
    await expect(respuesta.json()).resolves.toEqual({ paso: "contrasena" });
    expect(cuentas.solicitarCodigo).toHaveBeenCalledWith({}, CORREO, "correo");

    cuentas.solicitarCodigo.mockResolvedValue({ paso: "codigo" });
    await pedirRecuperar(pedir({ correo: CORREO }));
    expect(cuentas.solicitarCodigo).toHaveBeenLastCalledWith({}, CORREO, "recuperar");
  });

  it("un correo mal escrito espera y responde 400", async () => {
    const respuesta = await conRetraso(() => pedirCorreo(pedir({ correo: "no-es-correo" })));
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: "Ingrese un correo electrónico válido." });
    expect(cuentas.solicitarCodigo).not.toHaveBeenCalled();
  });

  it("un fallo de envío no cambia la respuesta", async () => {
    correo.enviarCorreo.mockRejectedValue(new Error("rechazado"));
    cuentas.solicitarCodigo.mockResolvedValue({ paso: "codigo", envio: { para: CORREO, codigo: "123456" } });
    const respuesta = await pedirCorreo(pedir({ correo: CORREO }));
    await expect(respuesta.json()).resolves.toEqual({ paso: "codigo" });
  });

  it("500 si falla la base de datos, sin registrar el correo", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    cuentas.solicitarCodigo.mockRejectedValue(Object.assign(new Error(`params: ${CORREO}`), { code: "57P01" }));
    const respuesta = await pedirCorreo(pedir({ correo: CORREO }));
    expect(respuesta.status).toBe(500);
    const registrado = registro.mock.calls.flat().map(String).join(" ");
    expect(registrado).toContain("57P01");
    expect(registrado).not.toContain(CORREO);
  });
});

describe("POST /api/acceso/activar", () => {
  const CUERPO = { correo: CORREO, codigo: "123456", contrasena: "clave-segura-1" };

  it("con un código válido inicia la sesión del integrante en la jornada de su equipo", async () => {
    cuentas.activarConCodigo.mockResolvedValue({ ok: true, integranteId: INTEGRANTE });
    const respuesta = await activar(pedir(CUERPO));
    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual({ rol: "evaluador" });
    const cookie = respuesta.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_SESION}=`))!;
    const token = cookie.split(";")[0].slice(COOKIE_SESION.length + 1);
    await expect(verificarSesion(token)).resolves.toMatchObject({
      rol: "evaluador",
      jornada: "noche",
      integranteId: INTEGRANTE,
    });
  });

  it("un código inválido o vencido espera ~400 ms y responde 400 sin cookie", async () => {
    cuentas.activarConCodigo.mockResolvedValue({ ok: false, motivo: "codigo" });
    const respuesta = await conRetraso(() => activar(pedir(CUERPO)));
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: "El código no es válido o expiró." });
    expect(respuesta.headers.getSetCookie()).toEqual([]);
  });

  it.each([
    [{ ...CUERPO, codigo: "12345" }, "El código no es válido o expiró."],
    [{ ...CUERPO, contrasena: "corta" }, "Debe tener al menos 8 caracteres."],
    [{ ...CUERPO, correo: "x" }, "Ingrese un correo electrónico válido."],
  ])("valida el cuerpo antes de tocar las cuentas (%j)", async (cuerpo, error) => {
    const respuesta = await conRetraso(() => activar(pedir(cuerpo)));
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error });
    expect(cuentas.activarConCodigo).not.toHaveBeenCalled();
  });
});

describe("POST /api/acceso/contrasena", () => {
  const CUERPO = { correo: CORREO, contrasena: "clave-segura-1" };

  it("con la contraseña correcta inicia la sesión", async () => {
    cuentas.iniciarConContrasena.mockResolvedValue({ ok: true, integranteId: INTEGRANTE });
    const respuesta = await conContrasena(pedir(CUERPO));
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(respuesta.headers.getSetCookie().some((c) => c.startsWith(`${COOKIE_SESION}=`))).toBe(true);
  });

  it("correo o contraseña incorrectos: 401 con el mismo mensaje, tras ~400 ms", async () => {
    cuentas.iniciarConContrasena.mockResolvedValue({ ok: false, motivo: "credenciales" });
    const respuesta = await conRetraso(() => conContrasena(pedir(CUERPO)));
    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({ error: "Correo o contraseña incorrectos." });
  });

  it("cuenta bloqueada: 429 «Demasiados intentos…»", async () => {
    cuentas.iniciarConContrasena.mockResolvedValue({ ok: false, motivo: "bloqueada" });
    const respuesta = await conRetraso(() => conContrasena(pedir(CUERPO)));
    expect(respuesta.status).toBe(429);
    await expect(respuesta.json()).resolves.toEqual({ error: "Demasiados intentos. Intente de nuevo en 15 minutos." });
  });

  it("un integrante que ya no está en la configuración no inicia sesión", async () => {
    cuentas.iniciarConContrasena.mockResolvedValue({ ok: true, integranteId: "ya-no-existe" });
    const respuesta = await conRetraso(() => conContrasena(pedir(CUERPO)));
    expect(respuesta.status).toBe(401);
  });
});
