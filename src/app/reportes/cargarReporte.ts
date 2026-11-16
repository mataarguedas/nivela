import "server-only";
import { notFound } from "next/navigation";
import type { Competencia } from "@/config/competencias";
import type { JornadaId } from "@/config/jornadas";
import { obtenerReporte } from "@/lib/db/reportes";
import { registrarError } from "@/lib/registro";
import type { Reporte } from "@/lib/reportes";
import { validarCompetenciaReporte } from "@/lib/validacion";

// Loads the report of the session's jornada for a report page. A DB failure
// becomes `null` (the page shows "No se pudo cargar el reporte…") and is
// logged without PII; an unknown competencia was already a 404 in the layout,
// and one without a team in this jornada is a 404 here.

export async function cargarReporte(
  jornada: JornadaId,
  competenciaId: string,
  ruta: string,
): Promise<{ competencia: Competencia; reporte: Reporte | null }> {
  const validacion = validarCompetenciaReporte(competenciaId, jornada);
  if (!validacion.ok) notFound();
  const { competencia, equipo } = validacion.datos;
  const inicio = Date.now();
  try {
    return { competencia, reporte: await obtenerReporte(jornada, competencia, equipo) };
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return { competencia, reporte: null };
  }
}
