import "server-only";
import { notFound } from "next/navigation";
import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import { leerUltimosEnvios } from "@/lib/db/envios";
import { obtenerReporte, obtenerResumenGrupo } from "@/lib/db/reportes";
import { cargarContextoEnvio, type ContextoEnvio } from "@/lib/envioResultados";
import { registrarError } from "@/lib/registro";
import type { Reporte, ResumenGrupo } from "@/lib/reportes";
import type { UltimoEnvio } from "@/lib/resultados";
import { validarCompetenciaReporte, type JornadaResumen } from "@/lib/validacion";

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

/**
 * The group summary (PRD §11.3) for the jornadas validarSeleccionResumen()
 * resolved. Like cargarReporte, a DB failure becomes `null` and is logged
 * without PII.
 */
export async function cargarResumenGrupo(jornadas: readonly JornadaResumen[], ruta: string): Promise<ResumenGrupo | null> {
  const inicio = Date.now();
  try {
    return await obtenerResumenGrupo(jornadas);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/**
 * The send page's data (PRD §5.14) for the session's jornada; like
 * cargarReporte, a DB failure becomes `null`, logged without PII.
 */
export async function cargarEnvio(
  jornada: JornadaId,
  competencia: Competencia,
  equipo: Equipo,
  ruta: string,
): Promise<ContextoEnvio | null> {
  const inicio = Date.now();
  try {
    return await cargarContextoEnvio(jornada, competencia, equipo);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/**
 * Each participant's latest results-email status, for the Reporte general's
 * "Correo" column (PRD §11.2). Null on a DB failure: the column then reads "—".
 */
export async function cargarEstadosCorreo(
  jornada: JornadaId,
  competenciaId: string,
  ruta: string,
): Promise<Map<string, UltimoEnvio> | null> {
  const inicio = Date.now();
  try {
    return await leerUltimosEnvios(jornada, competenciaId);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}
