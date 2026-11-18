import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { estaAusente, listarAusentes } from "@/lib/db/asistencia";
import { guardarEvaluacion, listarEnviadas } from "@/lib/db/evaluaciones";
import { obtenerParticipantes } from "@/lib/db/participantes";
import { registrarError } from "@/lib/registro";
import { getSesion, type Sesion } from "@/lib/sesion";
import { validarConsultaEnviadas, validarEvaluacion } from "@/lib/validacion";

// /api/evaluaciones (PRD §10, §5.7). Evaluador and docente may use it, not
// admin; the session is re-verified here, not only in proxy.ts. Everything is
// scoped to the session's jornada, never one named in the request.
//
// Identity (PRD §5.12): an evaluador acts only as the session's integrante.
// Any other evaluadorId is a 403, checked before anything else; only the
// docente chooses which team member it rates as.
//
// Logging: only the method, status, latency and the driver's error code (see
// lib/registro.ts), never the request body or the error message.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/evaluaciones";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

/** The session, or the 401 (none) / 403 (admin role) response to answer with. */
async function sesionPermitida(): Promise<Sesion | Response> {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol === "admin") return responder({ error: TEXTOS.sesion.noParaAdmin }, 403);
  return sesion;
}

/**
 * The docente may name any team member; an evaluador only themself. A
 * request that names no evaluator at all fails validation (400) instead.
 */
function esPropio(sesion: Sesion, evaluadorId: unknown): boolean {
  return sesion.rol !== "evaluador" || evaluadorId == null || evaluadorId === sesion.integranteId;
}

function evaluadorDe(cuerpo: unknown): unknown {
  return typeof cuerpo === "object" && cuerpo !== null && "evaluadorId" in cuerpo ? cuerpo.evaluadorId : undefined;
}

export async function POST(request: Request) {
  const sesion = await sesionPermitida();
  if (sesion instanceof Response) return sesion;
  const { jornada } = sesion;

  const cuerpo: unknown = await request.json().catch(() => null);
  if (!esPropio(sesion, evaluadorDe(cuerpo))) return responder({ error: TEXTOS.sesion.otroEvaluador }, 403);
  const inicio = Date.now();
  try {
    const validacion = validarEvaluacion(cuerpo, await obtenerParticipantes(jornada), jornada);
    if (!validacion.ok) return responder({ error: validacion.error }, 400);
    // PRD §10: not for a participant this evaluator marked absent (§5.13).
    if (await estaAusente(jornada, validacion.datos)) return responder({ error: TEXTOS.asistencia.noEnviarAusente }, 409);
    return responder(await guardarEvaluacion(jornada, validacion.datos));
  } catch (error) {
    registrarError(RUTA, "POST", inicio, error);
    return responder({ error: TEXTOS.envio.errorGuardar }, 500);
  }
}

export async function GET(request: Request) {
  const sesion = await sesionPermitida();
  if (sesion instanceof Response) return sesion;
  const { jornada } = sesion;

  const parametros = new URL(request.url).searchParams;
  if (!esPropio(sesion, parametros.get("evaluador"))) return responder({ error: TEXTOS.sesion.otroEvaluador }, 403);
  const consulta = validarConsultaEnviadas(parametros, jornada);
  if (!consulta.ok) return responder({ error: consulta.error }, 400);

  const inicio = Date.now();
  try {
    const { competenciaId, evaluadorId } = consulta.datos;
    // Sent evaluations and this evaluator's absent marks in one request (PRD §5.4).
    const [evaluaciones, ausentes] = await Promise.all([
      listarEnviadas(jornada, competenciaId, evaluadorId),
      listarAusentes(jornada, competenciaId, evaluadorId),
    ]);
    return responder({ evaluaciones, ausentes });
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responder({ error: TEXTOS.envio.errorConsulta }, 500);
  }
}
