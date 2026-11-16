import "server-only";

// Email sending (PRD §13 Email, FR-27). Two transports, chosen by CORREO_MODO:
//
// - "resend": POST https://api.resend.com/emails with RESEND_API_KEY (a
//   "Sending access" key: it can only send) from CORREO_REMITENTE, on the
//   verified domain correo.nivela.snhware.lat. Plain fetch instead of the
//   `resend` SDK: one endpoint, and fetch gives the 10 s timeout and the
//   Idempotency-Key header directly (CLAUDE.md: prefer platform APIs).
// - "consola": nothing leaves the server. The last MAXIMO_BUZON messages stay
//   in memory for /dev/correos and GET /api/dev/correos (dev only), so e2e
//   tests can read verification codes without a real inbox.
//
// The default is "consola" outside production. Production always uses
// "resend": a "consola" there would silently swallow every activation code.
//
// Logging: only the template name, transport, outcome, HTTP status, Resend's
// error slug and latency. Never the recipient, the subject or the body.

export type ModoCorreo = "resend" | "consola";

/** rechazado: Resend refused it (bad key, unverified domain, invalid address). */
export type TipoErrorCorreo = "rechazado" | "limite" | "red" | "desconocido";

export class ErrorCorreo extends Error {
  constructor(
    readonly tipo: TipoErrorCorreo,
    readonly status?: number,
    /** From Retry-After, when Resend rate-limits (tipo "limite"). */
    readonly reintentarEnSegundos?: number,
  ) {
    // No recipient or content in the message: it may reach a log.
    super(`No se pudo enviar el correo (${tipo}${status ? `, HTTP ${status}` : ""}).`);
    this.name = "ErrorCorreo";
  }
}

export type Correo = {
  /** Template name, the only content-related field that is logged. */
  plantilla: string;
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** Same key → Resend sends at most once (24 h window). */
  idempotencia?: string;
};

export type MensajeBuzon = Omit<Correo, "idempotencia"> & { id: string; enviadoEn: string };

export const URL_RESEND = "https://api.resend.com/emails";
export const TIEMPO_LIMITE_MS = 10_000;
export const MAXIMO_BUZON = 20;

export function modoCorreo(): ModoCorreo {
  if (process.env.NODE_ENV === "production") return "resend";
  return process.env.CORREO_MODO === "resend" ? "resend" : "consola";
}

/** Sends one email with the configured transport. Throws ErrorCorreo. */
export async function enviarCorreo(correo: Correo): Promise<{ id: string }> {
  const inicio = Date.now();
  const modo = modoCorreo();
  try {
    const resultado = modo === "resend" ? await enviarPorResend(correo) : guardarEnBuzon(correo);
    registrar({ plantilla: correo.plantilla, modo, estado: "enviado", ms: Date.now() - inicio });
    return resultado;
  } catch (error) {
    const fallo = error instanceof ErrorCorreo ? error : new ErrorCorreo("desconocido");
    registrar({
      plantilla: correo.plantilla,
      modo,
      estado: fallo.tipo,
      status: fallo.status,
      motivo: error instanceof ErrorResend ? error.motivo : undefined,
      ms: Date.now() - inicio,
    });
    throw fallo;
  }
}

// ---------------------------------------------------------------------------
// Resend

/** ErrorCorreo plus Resend's error slug (e.g. "validation_error"), for the log only. */
class ErrorResend extends ErrorCorreo {
  constructor(
    tipo: TipoErrorCorreo,
    status: number,
    readonly motivo: string | undefined,
    reintentarEnSegundos?: number,
  ) {
    super(tipo, status, reintentarEnSegundos);
  }
}

async function enviarPorResend(correo: Correo): Promise<{ id: string }> {
  const clave = process.env.RESEND_API_KEY;
  const remitente = process.env.CORREO_REMITENTE;
  if (!clave || !remitente) throw new ErrorCorreo("desconocido");

  let respuesta: Response;
  try {
    respuesta = await fetch(URL_RESEND, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
        ...(correo.idempotencia ? { "Idempotency-Key": correo.idempotencia } : {}),
      },
      body: JSON.stringify({
        from: remitente,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      cache: "no-store",
    });
  } catch {
    // Timeout (TimeoutError), DNS, TLS or connection failure.
    throw new ErrorCorreo("red");
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null);
  if (respuesta.ok) {
    const id = campo(cuerpo, "id");
    if (id) return { id };
    throw new ErrorResend("desconocido", respuesta.status, undefined);
  }

  // Only a fixed slug from Resend's body: its `message` can quote the address.
  const nombre = campo(cuerpo, "name");
  const motivo = nombre && /^[a-z_]{1,64}$/.test(nombre) ? nombre : undefined;
  if (respuesta.status === 429) {
    throw new ErrorResend("limite", 429, motivo, segundos(respuesta.headers.get("retry-after")));
  }
  if (respuesta.status >= 400 && respuesta.status < 500) throw new ErrorResend("rechazado", respuesta.status, motivo);
  throw new ErrorResend("desconocido", respuesta.status, motivo);
}

function campo(cuerpo: unknown, nombre: string): string | undefined {
  if (typeof cuerpo !== "object" || cuerpo === null || !(nombre in cuerpo)) return undefined;
  const valor = (cuerpo as Record<string, unknown>)[nombre];
  return typeof valor === "string" ? valor : undefined;
}

function segundos(valor: string | null): number | undefined {
  const n = valor === null ? NaN : Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.ceil(n) : undefined;
}

// ---------------------------------------------------------------------------
// "consola" outbox. On globalThis because Next can load this module more than
// once in dev (route handlers and pages are separate module graphs).

const CLAVE_BUZON = Symbol.for("nivela.buzonCorreo");

function buzon(): MensajeBuzon[] {
  const global = globalThis as typeof globalThis & { [CLAVE_BUZON]?: MensajeBuzon[] };
  global[CLAVE_BUZON] ??= [];
  return global[CLAVE_BUZON];
}

function guardarEnBuzon({ plantilla, para, asunto, html, texto }: Correo): { id: string } {
  const mensaje: MensajeBuzon = {
    id: `consola-${crypto.randomUUID()}`,
    plantilla,
    para: para.trim().toLowerCase(),
    asunto,
    html,
    texto,
    enviadoEn: new Date().toISOString(),
  };
  const mensajes = buzon();
  mensajes.unshift(mensaje);
  mensajes.length = Math.min(mensajes.length, MAXIMO_BUZON);
  return { id: mensaje.id };
}

/** The "consola" outbox, newest first. Empty in production. */
export function leerBuzon(): readonly MensajeBuzon[] {
  return modoCorreo() === "consola" ? [...buzon()] : [];
}

/** The newest "consola" message to `para`, if any. */
export function ultimoCorreoPara(para: string): MensajeBuzon | undefined {
  const destino = para.trim().toLowerCase();
  return leerBuzon().find((m) => m.para === destino);
}

/** Tests only: empties the outbox. */
export function vaciarBuzon(): void {
  buzon().length = 0;
}

// ---------------------------------------------------------------------------

function registrar(datos: {
  plantilla: string;
  modo: ModoCorreo;
  estado: "enviado" | TipoErrorCorreo;
  status?: number;
  motivo?: string;
  ms: number;
}) {
  const { plantilla, ...resto } = datos;
  const linea = JSON.stringify({ correo: plantilla, ...resto });
  if (datos.estado === "enviado") console.info(linea);
  else console.error(linea);
}
