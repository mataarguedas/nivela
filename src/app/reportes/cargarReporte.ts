import "server-only";
import { notFound } from "next/navigation";
import type { Competencia } from "@/config/competencias";
import { obtenerReporte } from "@/lib/db/reportes";
import { registrarError } from "@/lib/registro";
import type { Reporte } from "@/lib/reportes";
import { validarCompetenciaReporte } from "@/lib/validacion";

// Loads the report for a report page. A DB failure becomes `null` (the page
// shows "No se pudo cargar el reporte…") and is logged without PII; an
// unknown competencia was already a 404 in the layout.

export async function cargarReporte(
  competenciaId: string,
  ruta: string,
): Promise<{ competencia: Competencia; reporte: Reporte | null }> {
  const validacion = validarCompetenciaReporte(competenciaId);
  if (!validacion.ok) notFound();
  const { competencia, equipo } = validacion.datos;
  const inicio = Date.now();
  try {
    return { competencia, reporte: await obtenerReporte(competencia, equipo) };
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return { competencia, reporte: null };
  }
}
