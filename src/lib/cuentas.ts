import "server-only";
import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { obtenerDefinicionCompetencia } from "@/config/competencias";
import { buscarIntegrante, equiposDeJornada } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import {
  codigosRecientes,
  cuentaPorCorreo,
  cuentasPorIds,
  gastarIntento,
  guardarContrasena,
  insertarCodigo,
  registrarContrasenaFallida,
  registrarIngreso,
  ultimoCodigo,
  usarCodigo,
  type Bd,
  type FilaCuenta,
  type Proposito,
} from "./db/cuentas";

// Evaluator accounts (PRD §5.12): password hashing, verification codes,
// lockout and the three sign-in flows the /api/acceso/* routes call. Every
// flow takes the db, so tests run it on PGlite. Nothing here logs: no
// emails, codes, passwords or hashes ever reach a log line.
//
// Enumeration: an email outside the roster gets the same answer as one whose
// account isn't activated yet ({ paso: "codigo" }), and so does a request
// that hits the code limits. Sending happens after the response (the route
// uses `after()`), so timing doesn't tell them apart either.

export const LARGO_MINIMO_CONTRASENA = 8;
/** Bounds the scrypt input; nobody types more. */
export const LARGO_MAXIMO_CONTRASENA = 200;
export const MINUTOS_CODIGO = 10;
export const INTENTOS_POR_CODIGO = 5;
export const CODIGOS_POR_HORA = 5;
export const SEGUNDOS_ENTRE_CODIGOS = 60;
export const FALLOS_PARA_BLOQUEO = 5;
export const MINUTOS_BLOQUEO = 15;

// ---------------------------------------------------------------------------
// Passwords: scrypt with a per-account random salt.
// N = 2^15, r = 8 needs 32 MiB (128·N·r), right at Node's default maxmem, so
// maxmem is raised explicitly. Stored as scrypt$N$r$p$salt$hash (base64).

const PARAMETROS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const LARGO_HASH = 32;
const LARGO_SAL = 16;

function derivar(contrasena: string, sal: Buffer, opciones: ScryptOptions, largo: number): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(contrasena.normalize("NFC"), sal, largo, opciones, (error, clave) => (error ? rechazar(error) : resolver(clave)));
  });
}

export async function hashContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(LARGO_SAL);
  const hash = await derivar(contrasena, sal, PARAMETROS, LARGO_HASH);
  const { N, r, p } = PARAMETROS;
  return ["scrypt", N, r, p, sal.toString("base64"), hash.toString("base64")].join("$");
}

export async function verificarContrasena(contrasena: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [N, r, p] = partes.slice(1, 4).map(Number);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const sal = Buffer.from(partes[4], "base64");
  const esperado = Buffer.from(partes[5], "base64");
  if (esperado.length === 0) return false;
  try {
    const hash = await derivar(contrasena, sal, { N, r, p, maxmem: PARAMETROS.maxmem }, esperado.length);
    return timingSafeEqual(hash, esperado);
  } catch {
    return false;
  }
}

/** Spends the same work as a real check, for accounts that don't exist. */
let hashSenuelo: Promise<string> | null = null;
async function verificarSenuelo(contrasena: string): Promise<void> {
  hashSenuelo ??= hashContrasena(randomBytes(16).toString("hex"));
  await verificarContrasena(contrasena, await hashSenuelo);
}

// ---------------------------------------------------------------------------
// Verification codes: 6 digits from a CSPRNG; only an HMAC is stored.

export function generarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function secreto(): string {
  const valor = process.env.SESSION_SECRET ?? "";
  if (Buffer.byteLength(valor) < 32) throw new Error("SESSION_SECRET must be at least 32 bytes");
  return valor;
}

/** HMAC-SHA256(SESSION_SECRET) over the account and the code, hex. */
export function hashCodigo(integranteId: string, codigo: string): string {
  return createHmac("sha256", secreto()).update(`${integranteId}:${codigo}`).digest("hex");
}

function hashesIguales(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

// ---------------------------------------------------------------------------
// Flows

/** An account whose integrante still exists in config; anything else counts as unknown. */
async function cuentaValida(db: Bd, correo: string): Promise<FilaCuenta | undefined> {
  const cuenta = await cuentaPorCorreo(db, correo);
  return cuenta && buscarIntegrante(cuenta.integranteId) ? cuenta : undefined;
}

export type Paso = "contrasena" | "codigo";
/** A code to email once the response is out. Never logged. */
export type CodigoPorEnviar = { para: string; codigo: string };
export type ResultadoSolicitud = { paso: Paso; envio?: CodigoPorEnviar };

/**
 * Step 1 of /acceso ("correo") and "¿Olvidó su contraseña?" ("recuperar").
 * An activated account answers "contrasena" on step 1; everything else
 * answers "codigo", with a code to send only when the account exists and the
 * limits allow (at most CODIGOS_POR_HORA per hour, one per SEGUNDOS_ENTRE_CODIGOS).
 */
export async function solicitarCodigo(
  db: Bd,
  correo: string,
  motivo: "correo" | "recuperar",
  ahora = new Date(),
): Promise<ResultadoSolicitud> {
  const cuenta = await cuentaValida(db, correo);
  if (cuenta?.contrasenaHash && motivo === "correo") return { paso: "contrasena" };
  if (!cuenta?.correo) return { paso: "codigo" };

  const recientes = await codigosRecientes(db, cuenta.integranteId, new Date(ahora.getTime() - 60 * 60 * 1000));
  const muyPronto = recientes.ultimo !== null && ahora.getTime() - recientes.ultimo.getTime() < SEGUNDOS_ENTRE_CODIGOS * 1000;
  if (recientes.total >= CODIGOS_POR_HORA || muyPronto) return { paso: "codigo" };

  const codigo = generarCodigo();
  const proposito: Proposito = cuenta.contrasenaHash ? "recuperar" : "activar";
  await insertarCodigo(db, {
    integranteId: cuenta.integranteId,
    proposito,
    codigoHash: hashCodigo(cuenta.integranteId, codigo),
    expiraEn: new Date(ahora.getTime() + MINUTOS_CODIGO * 60 * 1000),
    creadoEn: ahora,
  });
  return { paso: "codigo", envio: { para: cuenta.correo, codigo } };
}

export type ResultadoIngreso =
  | { ok: true; integranteId: string }
  | { ok: false; motivo: "credenciales" | "bloqueada" | "codigo" };

/**
 * Activation and recovery: a valid code sets the password and signs in.
 * Only the account's newest code counts; it must be unused, unexpired and
 * have attempts left. Every check, right or wrong, spends one attempt.
 */
export async function activarConCodigo(
  db: Bd,
  correo: string,
  codigo: string,
  contrasena: string,
  ahora = new Date(),
): Promise<ResultadoIngreso> {
  const fallo = { ok: false, motivo: "codigo" } as const;
  const cuenta = await cuentaValida(db, correo);
  if (!cuenta) return fallo;

  const vigente = await ultimoCodigo(db, cuenta.integranteId);
  if (!vigente || vigente.usadoEn || vigente.expiraEn.getTime() <= ahora.getTime()) return fallo;
  if (!(await gastarIntento(db, vigente.id, INTENTOS_POR_CODIGO))) return fallo;
  if (!hashesIguales(hashCodigo(cuenta.integranteId, codigo), vigente.codigoHash)) return fallo;
  if (!(await usarCodigo(db, vigente.id, ahora))) return fallo;

  await guardarContrasena(db, cuenta.integranteId, await hashContrasena(contrasena), ahora);
  return { ok: true, integranteId: cuenta.integranteId };
}

/**
 * Email + password. A locked account answers "bloqueada" even with the right
 * password; the FALLOS_PARA_BLOQUEO-th wrong one in a row locks it for
 * MINUTOS_BLOQUEO. Unknown emails spend the same scrypt work.
 */
export async function iniciarConContrasena(
  db: Bd,
  correo: string,
  contrasena: string,
  ahora = new Date(),
): Promise<ResultadoIngreso> {
  const cuenta = await cuentaValida(db, correo);
  if (!cuenta?.contrasenaHash) {
    await verificarSenuelo(contrasena);
    return { ok: false, motivo: "credenciales" };
  }
  if (cuenta.bloqueadaHasta && cuenta.bloqueadaHasta.getTime() > ahora.getTime()) {
    return { ok: false, motivo: "bloqueada" };
  }
  if (!(await verificarContrasena(contrasena, cuenta.contrasenaHash))) {
    const hasta = new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60 * 1000);
    const resultado = await registrarContrasenaFallida(db, cuenta.integranteId, FALLOS_PARA_BLOQUEO, hasta);
    const bloqueada = resultado?.bloqueadaHasta && resultado.bloqueadaHasta.getTime() > ahora.getTime();
    return { ok: false, motivo: bloqueada ? "bloqueada" : "credenciales" };
  }
  await registrarIngreso(db, cuenta.integranteId, ahora);
  return { ok: true, integranteId: cuenta.integranteId };
}

/** Account status shown to the admin (PRD §5.12) and in the reports (§11.2). */
export type EstadoCuenta = "sin-correo" | "pendiente" | "activa";

export function estadoCuenta(cuenta: Pick<FilaCuenta, "correo" | "contrasenaHash"> | undefined): EstadoCuenta {
  if (!cuenta?.correo) return "sin-correo";
  return cuenta.contrasenaHash ? "activa" : "pendiente";
}

// ---------------------------------------------------------------------------
// Admin: "Cuentas de evaluadores" (PRD §5.12)

/** One member as the admin sees them. The email reaches only the admin's own page. */
export type CuentaAdmin = {
  integranteId: string;
  nombre: string;
  curso: string;
  correo: string | null;
  estado: EstadoCuenta;
  /** ISO, or null if they never signed in. */
  ultimoAcceso: string | null;
};

export type GrupoCuentas = { numero: number; competencia: string; cuentas: CuentaAdmin[] };

export function cuentaAdmin(
  integrante: { id: string; nombre: string; curso: string },
  fila: FilaCuenta | undefined,
): CuentaAdmin {
  return {
    integranteId: integrante.id,
    nombre: integrante.nombre,
    curso: integrante.curso,
    correo: fila?.correo ?? null,
    estado: estadoCuenta(fila),
    ultimoAcceso: fila?.ultimoAcceso ? fila.ultimoAcceso.toISOString() : null,
  };
}

/**
 * The jornada's members grouped by its teams in their own number order
 * (equiposDeJornada; a number is only a label), each with their account.
 */
export async function listarCuentasJornada(db: Bd, jornada: JornadaId): Promise<GrupoCuentas[]> {
  const equipos = equiposDeJornada(jornada).filter((e) => e.integrantes.length > 0);
  const filas = await cuentasPorIds(
    db,
    equipos.flatMap((e) => e.integrantes.map((i) => i.id)),
  );
  const porId = new Map(filas.map((f) => [f.integranteId, f]));
  return equipos.map((equipo) => ({
    numero: equipo.numero,
    competencia: obtenerDefinicionCompetencia(equipo.competenciaId)?.nombre ?? equipo.competenciaId,
    cuentas: equipo.integrantes.map((i) => cuentaAdmin(i, porId.get(i.id))),
  }));
}
