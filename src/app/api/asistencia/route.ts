import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { marcarAsistencia } from "@/lib/db/asistencia";
import { obtenerParticipantes } from "@/lib/db/participantes";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarAsistencia } from "@/lib/validacion";

// PUT /api/asistencia (PRD §5.13, §10): one evaluator marks a participant
// absent or present again, saved immediately (nothing is stored offline).
// Evaluador and docente, not admin; the session is re-verified here.
//
// - Jornada: always the session's. The participant must be active in it.
// - Identity (PRD §5.12): an evaluador acts only as the session's
//   integranteId (403 for another id; omitting it means "me"). The docente
//   names the team member it rates as, like in /api/evaluaciones.
// - Marking absent after that evaluator sent the evaluation is a 409
//   "Ya envió una evaluación para esta persona." (checked atomically in
//   the INSERT, see db/asistencia.ts).
//
// Logging: method, status, latency and the driver's error code only.

const RUTA = "/api/asistencia";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

function evaluadorDe(cuerpo: unknown): unknown {
  return typeof cuerpo === "object" && cuerpo !== null && "evaluadorId" in cuerpo ? cuerpo.evaluadorId : undefined;
}

export async function PUT(request: Request) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol === "admin") return responder({ error: TEXTOS.sesion.noParaAdmin }, 403);
  const { jornada } = sesion;
  // getSesion() never returns an evaluador without integranteId.
  const evaluadorSesion = sesion.rol === "evaluador" ? (sesion.integranteId ?? null) : null;

  const cuerpo: unknown = await request.json().catch(() => null);
  const nombrado = evaluadorDe(cuerpo);
  if (evaluadorSesion && nombrado != null && nombrado !== evaluadorSesion) {
    return responder({ error: TEXTOS.sesion.otroEvaluador }, 403);
  }

  const inicio = Date.now();
  try {
    const validacion = validarAsistencia(cuerpo, await obtenerParticipantes(jornada), jornada, evaluadorSesion);
    if (!validacion.ok) return responder({ error: validacion.error }, 400);
    const { ausente, ...clave } = validacion.datos;
    const resultado = await marcarAsistencia(jornada, clave, ausente);
    if (!resultado.ok) return responder({ error: TEXTOS.asistencia.yaEnviada }, 409);
    return responder({ participanteId: clave.participanteId, ausente, actualizadoEn: resultado.actualizadoEn });
  } catch (error) {
    registrarError(RUTA, "PUT", inicio, error);
    return responder({ error: TEXTOS.asistencia.error }, 500);
  }
}
