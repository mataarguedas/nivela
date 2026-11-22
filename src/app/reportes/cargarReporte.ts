import "server-only";
import { notFound } from "next/navigation";
import type { Competencia } from "@/config/competencias";
import type { JornadaId } from "@/config/jornadas";
import { leerUltimosEnvios } from "@/lib/db/envios";
import {
  obtenerParticipanteConsolidado,
  obtenerReporte,
  obtenerReporteConsolidado,
  obtenerResumenGrupo,
  obtenerUsoAplicacion,
} from "@/lib/db/reportes";
import { cargarContextoEnvio, type ContextoEnvio } from "@/lib/envioResultados";
import { registrarError } from "@/lib/registro";
import type { Reporte, ReporteConsolidado, ReporteParticipanteConsolidado, ResumenGrupo, UsoAplicacion } from "@/lib/reportes";
import { ENVIO_CONSOLIDADO, type UltimoEnvio } from "@/lib/resultados";
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
 * The Reporte consolidado (PRD §11.4) of the session's jornada. Like
 * cargarReporte, a DB failure becomes `null` and is logged without PII.
 */
export async function cargarConsolidado(jornada: JornadaId, ruta: string): Promise<ReporteConsolidado | null> {
  const inicio = Date.now();
  try {
    return await obtenerReporteConsolidado(jornada);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/**
 * The Reporte del participante (PRD §11.5) of the session's jornada. A DB
 * failure becomes `null` (logged without PII); an id that isn't active in the
 * jornada is a 404.
 */
export async function cargarParticipanteConsolidado(
  jornada: JornadaId,
  participanteId: string,
  ruta: string,
): Promise<{ reporte: ReporteParticipanteConsolidado; lista: { id: string; etiqueta: string }[] } | null> {
  const inicio = Date.now();
  let datos: Awaited<ReturnType<typeof obtenerParticipanteConsolidado>>;
  try {
    datos = await obtenerParticipanteConsolidado(jornada, participanteId);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
  if (datos.reporte === null) notFound();
  return { reporte: datos.reporte, lista: datos.lista };
}

/**
 * The send page's data (PRD §5.14, v1.13: every competencia of the session's
 * jornada); like cargarReporte, a DB failure becomes `null`, logged without PII.
 */
export async function cargarEnvio(jornada: JornadaId, ruta: string): Promise<ContextoEnvio | null> {
  const inicio = Date.now();
  try {
    return await cargarContextoEnvio(jornada);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/**
 * Each participant's latest results-email status (the one general report,
 * v1.13), for the Reporte general's "Correo" column (PRD §11.2). Null on a DB
 * failure: the column then reads "—".
 */
export async function cargarEstadosCorreo(jornada: JornadaId, ruta: string): Promise<Map<string, UltimoEnvio> | null> {
  const inicio = Date.now();
  try {
    return await leerUltimosEnvios(jornada, ENVIO_CONSOLIDADO);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}

/**
 * "Uso de la aplicación" (PRD §11.6) of the session's jornada. Like
 * cargarReporte, a DB failure becomes `null` and is logged without PII.
 */
export async function cargarUsoAplicacion(jornada: JornadaId, ruta: string): Promise<UsoAplicacion | null> {
  const inicio = Date.now();
  try {
    return await obtenerUsoAplicacion(jornada);
  } catch (error) {
    registrarError(ruta, "GET", inicio, error);
    return null;
  }
}
