import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { obtenerResumenGrupo } from "@/lib/db/reportes";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarSeleccionResumen } from "@/lib/validacion";

// GET /api/reportes/[competencia]/grupo?jornada=manana|noche|ambas (PRD §10,
// §11.3): the group summary as JSON, for the docente only (re-verified here,
// not only in proxy.ts).
//
// This is the single place a jornada comes from the request (PRD §5.11): it
// only selects what this read-only summary covers. It never writes and never
// re-signs the session. A missing or invalid value falls back to the
// session's jornada (validarSeleccionResumen).

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/reportes/[competencia]/grupo";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export async function GET(request: Request, { params }: RouteContext<"/api/reportes/[competencia]/grupo">) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol !== "docente") return responder({ error: TEXTOS.sesion.soloDocente }, 403);

  const jornadaPedida = new URL(request.url).searchParams.get("jornada");
  const validacion = validarSeleccionResumen((await params).competencia, jornadaPedida, sesion.jornada);
  if (!validacion.ok) return responder({ error: validacion.error }, 404);

  const inicio = Date.now();
  try {
    return responder(await obtenerResumenGrupo(validacion.datos.jornadas));
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responder({ error: TEXTOS_REPORTES.errorCarga }, 500);
  }
}
