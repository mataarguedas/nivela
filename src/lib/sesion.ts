import "server-only";
import { timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";

// Session cookie (PRD §5.1, FR-1, CLAUDE.md → Sessions and access).
// `nivela_sesion` holds an HS256 JWT { rol, sid } signed with SESSION_SECRET.
// `sid` is a random id used only for the Jev usage cap; it is never sent to Jev.
// Used by proxy.ts (Node runtime), route handlers and Server Components.

export const COOKIE_SESION = "nivela_sesion";
/**
 * Marks that this device had a session, so an expired one can be told apart
 * from a first visit ("Su sesión expiró…"). The browser drops `nivela_sesion`
 * at the same moment the JWT expires, so without this marker the server can't
 * know a session existed. Holds no identity: its value is always "1".
 * /api/salir clears it, so a voluntary exit doesn't show the expired notice.
 */
export const COOKIE_SESION_PREVIA = "nivela_previa";

export const DURACION_SESION_S = 12 * 60 * 60;
const DURACION_PREVIA_S = 30 * 24 * 60 * 60;
const BYTES_MINIMOS_SECRETO = 32;

export const ROLES = ["evaluador", "docente", "admin"] as const;
export type Rol = (typeof ROLES)[number];

const esquemaSesion = z.object({
  rol: z.enum(ROLES),
  sid: z.string().min(16).max(64),
});
export type Sesion = z.infer<typeof esquemaSesion>;

/** SESSION_SECRET as bytes. Throws if it's missing or shorter than 32 bytes. */
function clave(): Uint8Array {
  const bytes = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
  if (bytes.length < BYTES_MINIMOS_SECRETO) {
    throw new Error(`SESSION_SECRET must be at least ${BYTES_MINIMOS_SECRETO} bytes`);
  }
  return bytes;
}

export function nuevoSid(): string {
  return crypto.randomUUID();
}

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return new SignJWT({ rol: sesion.rol, sid: sesion.sid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_S}s`)
    .sign(clave());
}

/**
 * Returns the session if the token is well-signed, unexpired and well-formed;
 * otherwise null. Never throws for a bad token (only for a missing secret).
 */
export async function verificarSesion(token: string | undefined | null): Promise<Sesion | null> {
  if (!token) return null;
  const llave = clave();
  try {
    // Pinning the algorithm rejects "alg: none" and any asymmetric-key confusion.
    const { payload } = await jwtVerify(token, llave, { algorithms: ["HS256"] });
    const sesion = esquemaSesion.safeParse(payload);
    return sesion.success ? sesion.data : null;
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie. For route handlers and Server Components. */
export async function getSesion(): Promise<Sesion | null> {
  const almacen = await cookies();
  return verificarSesion(almacen.get(COOKIE_SESION)?.value);
}

/**
 * Constant-time string comparison. Both values are padded to the same length
 * before `timingSafeEqual`, and the real lengths are compared afterwards, so
 * the time taken doesn't reveal how much of the code matched.
 */
export function codigosIguales(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  const largo = Math.max(a.length, b.length, 1);
  const aRelleno = Buffer.alloc(largo);
  const bRelleno = Buffer.alloc(largo);
  a.copy(aRelleno);
  b.copy(bRelleno);
  const iguales = timingSafeEqual(aRelleno, bRelleno);
  return iguales && a.length === b.length;
}

/**
 * Maps an access code to a role: CODIGO_ADMIN first, then CODIGO_DOCENTE,
 * then CODIGO_ACCESO. All comparisons always run. An unset or empty env code
 * never matches.
 */
export function rolParaCodigo(codigo: string): Rol | null {
  const admin = process.env.CODIGO_ADMIN ?? "";
  const docente = process.env.CODIGO_DOCENTE ?? "";
  const acceso = process.env.CODIGO_ACCESO ?? "";
  const esAdmin = admin !== "" && codigosIguales(codigo, admin);
  const esDocente = docente !== "" && codigosIguales(codigo, docente);
  const esEvaluador = acceso !== "" && codigosIguales(codigo, acceso);
  if (esAdmin) return "admin";
  if (esDocente) return "docente";
  if (esEvaluador) return "evaluador";
  return null;
}

type OpcionesCookie = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function opcionesCookieSesion(): OpcionesCookie {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_S,
  };
}

export function opcionesCookiePrevia(): OpcionesCookie {
  return { ...opcionesCookieSesion(), maxAge: DURACION_PREVIA_S };
}
