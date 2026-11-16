import { NextResponse } from "next/server";
import { z } from "zod";
import { IDS_JORNADA } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import {
  COOKIE_SESION,
  firmarSesion,
  getSesion,
  opcionesCookieSesion,
  puedeCambiarJornada,
} from "@/lib/sesion";

// POST /api/jornada (PRD §5.11): docente and admin switch the jornada their
// reports or participant list show. The cookie is re-signed with the same
// rol and sid; only the jornada changes. An evaluador's jornada comes from
// their class code and can't be changed here (403). Re-verifies the session
// itself, not only in proxy.ts.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const SIN_CACHE = { "Cache-Control": "no-store" };

const esquemaCuerpo = z.object({ jornada: z.enum(IDS_JORNADA) });

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export async function POST(request: Request) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (!puedeCambiarJornada(sesion.rol)) return responder({ error: TEXTOS.jornada.soloDocenteOAdmin }, 403);

  const cuerpo = esquemaCuerpo.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) return responder({ error: TEXTOS.jornada.invalida }, 400);

  const { jornada } = cuerpo.data;
  const respuesta = responder({ jornada });
  respuesta.cookies.set(COOKIE_SESION, await firmarSesion({ ...sesion, jornada }), opcionesCookieSesion());
  return respuesta;
}
