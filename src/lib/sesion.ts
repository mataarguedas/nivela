import "server-only";
import { timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { buscarIntegrante } from "@/config/equipos";
import { IDS_JORNADA, JORNADA_PREDETERMINADA, type JornadaId } from "@/config/jornadas";

// Session cookie (PRD §5.1, §5.11, §5.12, FR-1, CLAUDE.md → Sessions and access).
// `nivela_sesion` holds an HS256 JWT { rol, sid, jornada, integranteId? }
// signed with SESSION_SECRET. `sid` is a random id used only for the Jev
// usage cap; it is never sent to Jev. `jornada` scopes every read and write
// to one cohort. `integranteId` is the signed-in evaluador (their account);
// docente and admin have none. Used by proxy.ts (Node runtime), route
// handlers and Server Components.

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

const esquemaSesion = z
  .object({
    rol: z.enum(ROLES),
    sid: z.string().min(16).max(64),
    // Tokens signed before jornadas existed carry none: they are morning sessions.
    jornada: z.enum(IDS_JORNADA).default(JORNADA_PREDETERMINADA),
    integranteId: z.string().min(1).max(100).optional(),
  })
  // Since v1.2 an evaluador is a person (PRD §5.1): a token without a known
  // integrante, or whose jornada isn't that integrante's team's (class-code
  // sessions, renamed ids), is invalid and reads as expired. Docente and
  // admin carry no integrante.
  .refine((s) => {
    if (s.rol !== "evaluador") return s.integranteId === undefined;
    const encontrado = s.integranteId ? buscarIntegrante(s.integranteId) : undefined;
    return encontrado !== undefined && encontrado.equipo.jornada === s.jornada;
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
  const datos = { rol: sesion.rol, sid: sesion.sid, jornada: sesion.jornada };
  return new SignJWT(sesion.integranteId ? { ...datos, integranteId: sesion.integranteId } : datos)
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

export type Acceso = { rol: Rol; jornada: JornadaId };

/**
 * Maps an access code to a role: CODIGO_ADMIN first, then CODIGO_DOCENTE.
 * Both start in the default jornada and switch in the app. Evaluadores sign
 * in with email + password instead (PRD §5.12); the class codes are gone.
 * Both comparisons always run. An unset or empty env code never matches; if
 * the two codes are equal, admin wins, so keep them distinct.
 */
export function accesoParaCodigo(codigo: string): Acceso | null {
  const coincide = (valor: string | undefined) => (valor ?? "") !== "" && codigosIguales(codigo, valor ?? "");
  const esAdmin = coincide(process.env.CODIGO_ADMIN);
  const esDocente = coincide(process.env.CODIGO_DOCENTE);
  if (esAdmin) return { rol: "admin", jornada: JORNADA_PREDETERMINADA };
  if (esDocente) return { rol: "docente", jornada: JORNADA_PREDETERMINADA };
  return null;
}

/** Docente and admin may switch jornada (PRD §5.11); an evaluador's is fixed by their account. */
export function puedeCambiarJornada(rol: Rol): boolean {
  return rol === "docente" || rol === "admin";
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

/**
 * A JSON response that signs the user in: the session cookie plus the
 * "had a session" marker (see COOKIE_SESION_PREVIA). Never cached.
 */
export async function respuestaConSesion(sesion: Omit<Sesion, "sid">, cuerpo: unknown): Promise<NextResponse> {
  const token = await firmarSesion({ ...sesion, sid: nuevoSid() });
  const respuesta = NextResponse.json(cuerpo);
  respuesta.cookies.set(COOKIE_SESION, token, opcionesCookieSesion());
  respuesta.cookies.set(COOKIE_SESION_PREVIA, "1", opcionesCookiePrevia());
  respuesta.headers.set("Cache-Control", "no-store");
  return respuesta;
}

/** The evaluador session for an account's integrante: role, jornada of their team, identity. */
export function sesionDeIntegrante(integranteId: string): Omit<Sesion, "sid"> | null {
  const encontrado = buscarIntegrante(integranteId);
  if (!encontrado) return null;
  return { rol: "evaluador", jornada: encontrado.equipo.jornada, integranteId };
}
