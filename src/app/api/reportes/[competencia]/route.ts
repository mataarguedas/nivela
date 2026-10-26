import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { obtenerReporte } from "@/lib/db/reportes";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarCompetenciaReporte } from "@/lib/validacion";

// GET /api/reportes/[competencia] (PRD §10, §11): the aggregated report as
// JSON, for the docente only. It includes evaluator names and observations,
// so the role is re-verified here, not only in proxy.ts.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/reportes/[competencia]";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export async function GET(_request: Request, { params }: RouteContext<"/api/reportes/[competencia]">) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol !== "docente") return responder({ error: TEXTOS.sesion.soloDocente }, 403);

  const validacion = validarCompetenciaReporte((await params).competencia);
  if (!validacion.ok) return responder({ error: validacion.error }, 404);

  const inicio = Date.now();
  try {
    return responder(await obtenerReporte(validacion.datos.competencia, validacion.datos.equipo));
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responder({ error: TEXTOS_REPORTES.errorCarga }, 500);
  }
}
