import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ENVIO } from "@/config/textosReportes";
import { ErrorCorreo } from "@/lib/correo";
import { cargarContextoEnvio, enviarPrueba, enviarResultados } from "@/lib/envioResultados";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarCompetenciaReporte, validarEnvioResultados } from "@/lib/validacion";

// POST /api/reportes/[competencia]/enviar (PRD §10, §5.14): the docente sends
// each listed participant their results, for the session's jornada only.
// Docente only, re-verified here (not only in proxy.ts). The body names
// participants and nothing else: every score is recomputed on the server.
// Answers { enviados, errores: [{ participanteId, motivo }] }; a provider
// failure for one participant is reported, never a 5xx for the batch.
//
// { prueba, participanteId } sends that participant's email, marked as a
// test, to the address the docente typed; it isn't stored or recorded.
//
// Sends are paced to stay under Resend's rate limit (lib/envioResultados.ts),
// so a full list takes up to about a minute and a half: maxDuration leaves
// room for that plus retries. Never logs addresses or bodies.

export const maxDuration = 300;

const RUTA = "/api/reportes/[competencia]/enviar";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export async function POST(request: Request, { params }: RouteContext<"/api/reportes/[competencia]/enviar">) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol !== "docente") return responder({ error: TEXTOS.sesion.soloDocente }, 403);

  const { jornada } = sesion;
  const competencia = validarCompetenciaReporte((await params).competencia, jornada);
  if (!competencia.ok) return responder({ error: competencia.error }, 404);
  const cuerpo = validarEnvioResultados(await request.json().catch(() => null));
  if (!cuerpo.ok) return responder({ error: cuerpo.error }, 400);

  const inicio = Date.now();
  try {
    const contexto = await cargarContextoEnvio(jornada, competencia.datos.competencia, competencia.datos.equipo);
    if (cuerpo.datos.tipo === "prueba") {
      const enviada = await enviarPrueba(contexto, cuerpo.datos.participanteId, cuerpo.datos.para);
      return enviada ? responder({ enviada: true }) : responder({ error: TEXTOS_ENVIO.sinEvaluaciones }, 400);
    }
    return responder(await enviarResultados(contexto, cuerpo.datos.participantes, cuerpo.datos.reenviar));
  } catch (error) {
    if (error instanceof ErrorCorreo) return responder({ error: TEXTOS_ENVIO.pruebaError }, 502);
    registrarError(RUTA, "POST", inicio, error);
    return responder({ error: TEXTOS_ENVIO.errorEnvio }, 500);
  }
}
