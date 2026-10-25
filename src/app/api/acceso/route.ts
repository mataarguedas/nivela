import { NextResponse } from "next/server";
import { z } from "zod";
import { TEXTOS } from "@/config/textos";
import {
  COOKIE_SESION,
  COOKIE_SESION_PREVIA,
  firmarSesion,
  nuevoSid,
  opcionesCookiePrevia,
  opcionesCookieSesion,
  rolParaCodigo,
} from "@/lib/sesion";

// POST /api/acceso (PRD §5.1, §10): verify a code, set the session cookie,
// return { rol }. Every failure waits ~400 ms to slow down guessing.

// Runs on Node.js, the default. CLAUDE.md asks for `export const runtime = "nodejs"`,
// but Next 16 rejects any `runtime` export while cacheComponents is on.

const RETRASO_FALLO_MS = 400;

const esquemaCuerpo = z.object({
  codigo: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  const cuerpo = esquemaCuerpo.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    await esperar(RETRASO_FALLO_MS);
    return NextResponse.json({ error: TEXTOS.acceso.codigoRequerido }, { status: 400 });
  }

  const rol = rolParaCodigo(cuerpo.data.codigo);
  if (!rol) {
    await esperar(RETRASO_FALLO_MS);
    return NextResponse.json({ error: TEXTOS.acceso.error }, { status: 401 });
  }

  const token = await firmarSesion({ rol, sid: nuevoSid() });
  const respuesta = NextResponse.json({ rol });
  respuesta.cookies.set(COOKIE_SESION, token, opcionesCookieSesion());
  respuesta.cookies.set(COOKIE_SESION_PREVIA, "1", opcionesCookiePrevia());
  respuesta.headers.set("Cache-Control", "no-store");
  return respuesta;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
