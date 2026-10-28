// Where to send the user after /acceso. The `next` query param comes from the
// URL, so only same-origin relative page paths are accepted; anything else
// (absolute URLs, protocol-relative "//host", backslash tricks, API routes,
// /acceso itself) falls back to Inicio. Safe on server and client.

export const RUTA_ACCESO = "/acceso";
const BASE = "http://nivela.invalid";

export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return "/";
  let url: URL;
  try {
    url = new URL(valor, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE) return "/";
  if (url.pathname === RUTA_ACCESO || url.pathname.startsWith("/api/")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Why the user landed on /acceso, shown above the form. */
export type MotivoAcceso = "expirada" | "docente" | "admin";

export function motivoAcceso(valor: string | null | undefined): MotivoAcceso | null {
  return valor === "expirada" || valor === "docente" || valor === "admin" ? valor : null;
}

export const RUTA_ADMIN = "/admin";

/**
 * Where to go after a successful /acceso: the admin always lands on /admin
 * (it can't open anything else); other roles go to the safe `next`.
 */
export function destinoTrasAcceso(rol: string | undefined, siguiente: string | null | undefined): string {
  const destino = destinoSeguro(siguiente);
  if (rol !== "admin") return destino;
  return destino === RUTA_ADMIN || destino.startsWith(`${RUTA_ADMIN}/`) || destino.startsWith(`${RUTA_ADMIN}?`) ? destino : RUTA_ADMIN;
}
