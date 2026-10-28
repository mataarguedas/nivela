import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { generarCsv } from "@/lib/csv";
import { obtenerTodosLosParticipantes } from "@/lib/db/participantes";
import { leerFilasReporte } from "@/lib/db/reportes";
import { fechaParaArchivo } from "@/lib/formato";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarCompetenciaReporte } from "@/lib/validacion";

// GET /api/reportes/[competencia]/csv (PRD §10, FR-13): every stored rating
// of the competencia as a CSV download (format notes in lib/csv.ts), named
// nivela-{competencia}-{aaaa-mm-dd}.csv in Costa Rica time. Docente only.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/reportes/[competencia]/csv";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responderError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: SIN_CACHE });
}

export async function GET(_request: Request, { params }: RouteContext<"/api/reportes/[competencia]/csv">) {
  const sesion = await getSesion();
  if (!sesion) return responderError(TEXTOS.sesion.requerida, 401);
  if (sesion.rol !== "docente") return responderError(TEXTOS.sesion.soloDocente, 403);

  const validacion = validarCompetenciaReporte((await params).competencia);
  if (!validacion.ok) return responderError(validacion.error, 404);
  const { competencia, equipo } = validacion.datos;

  const inicio = Date.now();
  try {
    const [filas, participantes] = await Promise.all([leerFilasReporte(competencia.id), obtenerTodosLosParticipantes()]);
    const csv = generarCsv(competencia, equipo, filas, participantes);
    const nombre = `nivela-${competencia.id}-${fechaParaArchivo(new Date())}.csv`;
    return new NextResponse(csv, {
      headers: {
        ...SIN_CACHE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
    });
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responderError(TEXTOS_REPORTES.errorCsv, 500);
  }
}
