import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { guardarEvaluacion, listarEnviadas } from "@/lib/db/evaluaciones";
import { obtenerParticipantes } from "@/lib/db/participantes";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarConsultaEnviadas, validarEvaluacion } from "@/lib/validacion";

// /api/evaluaciones (PRD §10, §5.7). Evaluador and docente may use it, not
// admin; the session is re-verified here, not only in proxy.ts.
//
// Logging: only the method, status, latency and the driver's error code (see
// lib/registro.ts), never the request body or the error message.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/evaluaciones";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

/** 401 without a session, 403 for the admin role; null when the request may go on. */
async function rechazoSesion() {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol === "admin") return responder({ error: TEXTOS.sesion.noParaAdmin }, 403);
  return null;
}

export async function POST(request: Request) {
  const rechazo = await rechazoSesion();
  if (rechazo) return rechazo;

  const cuerpo: unknown = await request.json().catch(() => null);
  const inicio = Date.now();
  try {
    const validacion = validarEvaluacion(cuerpo, await obtenerParticipantes());
    if (!validacion.ok) return responder({ error: validacion.error }, 400);
    return responder(await guardarEvaluacion(validacion.datos));
  } catch (error) {
    registrarError(RUTA, "POST", inicio, error);
    return responder({ error: TEXTOS.envio.errorGuardar }, 500);
  }
}

export async function GET(request: Request) {
  const rechazo = await rechazoSesion();
  if (rechazo) return rechazo;

  const consulta = validarConsultaEnviadas(new URL(request.url).searchParams);
  if (!consulta.ok) return responder({ error: consulta.error }, 400);

  const inicio = Date.now();
  try {
    const evaluaciones = await listarEnviadas(consulta.datos.competenciaId, consulta.datos.evaluadorId);
    return responder({ evaluaciones });
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responder({ error: TEXTOS.envio.errorConsulta }, 500);
  }
}
