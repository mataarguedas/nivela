import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { generarCsvConsolidado } from "@/lib/csv";
import { obtenerTodosLosParticipantes } from "@/lib/db/participantes";
import { obtenerReporteConsolidado } from "@/lib/db/reportes";
import { fechaParaArchivo } from "@/lib/formato";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";

// GET /api/reportes/consolidado/csv (PRD §10, §11.4): the Reporte
// consolidado of the session's jornada as a CSV download, one row per
// participant with every competencia side by side (format notes in
// lib/csv.ts), named nivela-consolidado-{jornada}-{aaaa-mm-dd}.csv in Costa
// Rica time. Docente only. The static "consolidado" segment takes precedence
// over /api/reportes/[competencia]; no competencia has that id.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/reportes/consolidado/csv";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responderError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: SIN_CACHE });
}

export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return responderError(TEXTOS.sesion.requerida, 401);
  if (sesion.rol !== "docente") return responderError(TEXTOS.sesion.soloDocente, 403);

  const { jornada } = sesion;
  const inicio = Date.now();
  try {
    const [reporte, participantes] = await Promise.all([
      obtenerReporteConsolidado(jornada),
      obtenerTodosLosParticipantes(jornada),
    ]);
    const csv = generarCsvConsolidado(jornada, reporte, participantes);
    const nombre = `nivela-consolidado-${jornada}-${fechaParaArchivo(new Date())}.csv`;
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
