import { NextResponse, type NextRequest } from "next/server";
import { TEXTOS } from "@/config/textos";
import { RUTA_ACCESO, RUTA_ADMIN, type MotivoAcceso } from "@/lib/destino";
import { COOKIE_SESION, COOKIE_SESION_PREVIA, verificarSesion } from "@/lib/sesion";

// Session gate (CLAUDE.md → Sessions and access). Next 16 runs proxy on the
// Node runtime. Roles: /reportes needs docente; /admin needs admin, and an
// admin session is sent back to /admin from everywhere else. Route handlers and pages re-verify the session themselves;
// this is the first line, not the only one.

// /api/salir only clears cookies, and must work once the session has expired.
const RUTAS_PUBLICAS = new Set([RUTA_ACCESO, "/api/acceso", "/api/salir"]);

// Open to every signed-in role, admin included; the route checks the role
// itself (an evaluador's jornada can't change).
const RUTAS_TODOS_LOS_ROLES = new Set(["/api/jornada"]);

function requiereDocente(ruta: string): boolean {
  return /^\/(api\/)?reportes(\/|$)/.test(ruta);
}

function esRutaAdmin(ruta: string): boolean {
  return /^\/(api\/)?admin(\/|$)/.test(ruta);
}

// Dev only: e2e tests read verification codes here before signing in. The
// route itself answers 404 in production, and this exception is off there.
const RUTA_CORREOS_DEV = "/api/dev/correos";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (RUTAS_PUBLICAS.has(pathname)) return NextResponse.next();
  if (pathname === RUTA_CORREOS_DEV && process.env.NODE_ENV !== "production") return NextResponse.next();

  const esApi = pathname.startsWith("/api/");
  const token = request.cookies.get(COOKIE_SESION)?.value;
  const sesion = await verificarSesion(token);

  if (!sesion) {
    if (esApi) return NextResponse.json({ error: TEXTOS.sesion.requerida }, { status: 401 });
    const motivo = request.cookies.has(COOKIE_SESION_PREVIA) ? "expirada" : null;
    const respuesta = redirigirAAcceso(request, pathname + search, motivo);
    // A cookie that fails verification (tampered, old secret) is useless.
    if (token) respuesta.cookies.delete(COOKIE_SESION);
    return respuesta;
  }

  if (RUTAS_TODOS_LOS_ROLES.has(pathname)) return NextResponse.next();

  // The admin area is admin-only, and the admin code opens nothing else.
  if (esRutaAdmin(pathname) !== (sesion.rol === "admin")) {
    if (sesion.rol === "admin") {
      if (esApi) return NextResponse.json({ error: TEXTOS.sesion.noParaAdmin }, { status: 403 });
      return NextResponse.redirect(new URL(RUTA_ADMIN, request.url));
    }
    if (esApi) return NextResponse.json({ error: TEXTOS.sesion.soloAdmin }, { status: 403 });
    return redirigirAAcceso(request, pathname + search, "admin");
  }

  if (requiereDocente(pathname) && sesion.rol !== "docente") {
    if (esApi) return NextResponse.json({ error: TEXTOS.sesion.soloDocente }, { status: 403 });
    return redirigirAAcceso(request, pathname + search, "docente");
  }

  return NextResponse.next();
}

function redirigirAAcceso(request: NextRequest, siguiente: string, motivo: MotivoAcceso | null) {
  const url = new URL(RUTA_ACCESO, request.url);
  if (siguiente !== "/") url.searchParams.set("next", siguiente);
  if (motivo) url.searchParams.set("motivo", motivo);
  return NextResponse.redirect(url);
}

export const config = {
  // Static assets never need a session: Next build output, PWA files, icons.
  // /acceso and /api/acceso are skipped in code above (exact matches).
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icons/|robots\\.txt).*)",
  ],
};
