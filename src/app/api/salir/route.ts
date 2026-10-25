import { NextResponse } from "next/server";
import { RUTA_ACCESO } from "@/lib/destino";
import { COOKIE_SESION, COOKIE_SESION_PREVIA } from "@/lib/sesion";

// POST /api/salir: clears the session and answers 303 → /acceso, so the nav's
// plain HTML form works without JS (fetch callers just follow the redirect).
// It also clears the "had a session" marker, so /acceso doesn't say the
// session expired after a voluntary exit. proxy.ts lets it through without a
// valid session: logging out of an expired session must still work.

// Runs on Node.js, the default. CLAUDE.md asks for `export const runtime = "nodejs"`,
// but Next 16 rejects any `runtime` export while cacheComponents is on.

export async function POST() {
  // Relative Location: behind `next dev -H 0.0.0.0` request.url carries the
  // bind address, which a phone on the LAN can't reach.
  const respuesta = new NextResponse(null, { status: 303, headers: { Location: RUTA_ACCESO } });
  respuesta.cookies.delete(COOKIE_SESION);
  respuesta.cookies.delete(COOKIE_SESION_PREVIA);
  respuesta.headers.set("Cache-Control", "no-store");
  return respuesta;
}
