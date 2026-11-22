import type { NivelValor } from "@/config/niveles";
import type { JornadaId } from "@/config/jornadas";
import { brechaSiguienteNivel, nivelGeneral, puntajeEntreCompetencias, type Brecha } from "@/lib/puntajes";
import type { EntradaConsolidado, ParticipanteConsolidado, ReporteParticipante } from "@/lib/reportes";

// Personal results by email (PRD §5.14, v1.13): the pure parts, unit-tested
// without a DB or a mail provider. Since v1.13 each participant gets one
// email with their results in every competencia of the jornada plus the
// overall result (promedio entre competencias, §7), instead of one email per
// competencia. This file decides what that email contains, who gets one and
// who is skipped (and why), and the idempotency key of each send.
//
// The email data is built from the participant's own rows of each
// competencia's Reporte (the same aggregation as the Reporte consolidado), so
// it shows exactly the numbers the docente sees. It deliberately copies only
// that participant's own aggregates: never evaluator names, individual
// ratings, observations, AI metadata or other participants.

/**
 * envios_resultados.competencia_id of the all-competencias email (v1.13). The
 * column predates it; rows with a real competencia id are the per-competencia
 * emails sent before v1.13, kept as history and no longer read.
 */
export const ENVIO_CONSOLIDADO = "consolidado";

/** One indicator in the results email. */
export type IndicadorResultado = {
  numero: number;
  titulo: string;
  media: number;
  nivel: NivelValor;
  brecha: Brecha;
  /** The rubric's description of the next level; null at Experto. */
  descripcionSiguiente: string | null;
};

/** A competencia where the participant has evaluations. */
export type ResultadoCompetencia = {
  puntaje: number;
  nivel: NivelValor;
  brecha: Brecha;
  evaluaciones: number;
  indicadores: IndicadorResultado[];
};

/** A competencia with a rubric in the jornada; `resultado` is null without evaluations there. */
export type CompetenciaResultado = { id: string; nombre: string; resultado: ResultadoCompetencia | null };

/** Everything the results email shows (lib/correos/resultados.ts). */
export type DatosResultados = {
  /** Greeting; null greets without a name. */
  nombre: string | null;
  jornada: string;
  /** Promedio entre competencias (PRD §7) and its nivel and gap. */
  promedio: number;
  nivel: NivelValor;
  brecha: Brecha;
  competenciasEvaluadas: number;
  competenciasDisponibles: number;
  /** Evaluations received, summed over the competencias. */
  evaluaciones: number;
  /** Every competencia with a rubric in the jornada, in config order. */
  competencias: CompetenciaResultado[];
};

/** One competencia's part of the email, or null without evaluations there. */
function resultadoCompetencia(fila: ReporteParticipante | undefined): ResultadoCompetencia | null {
  if (!fila || fila.evaluaciones === 0 || fila.puntajeGeneral === null || fila.nivelGeneral === null || fila.brecha === null) {
    return null;
  }
  return {
    puntaje: fila.puntajeGeneral,
    nivel: fila.nivelGeneral,
    brecha: fila.brecha,
    evaluaciones: fila.evaluaciones,
    indicadores: fila.indicadores.flatMap((i): IndicadorResultado[] =>
      i.media === null || i.brecha === null
        ? []
        : [
            {
              numero: i.numero,
              titulo: i.titulo,
              media: i.media,
              nivel: i.brecha.nivelActual,
              brecha: i.brecha,
              descripcionSiguiente: i.descripcionSiguiente,
            },
          ],
    ),
  };
}

/**
 * The email data for one participant across the jornada's competencias, or
 * null without evaluations in any of them (there is nothing to send).
 * `nombre` comes from the participant list: the report rows only carry the
 * carnet. A competencia without a rubric in the jornada (`reporte: null`) is
 * left out of the email.
 */
export function datosResultados(
  entradas: readonly EntradaConsolidado[],
  participanteId: string,
  { nombre, jornada }: { nombre: string | null; jornada: string },
): DatosResultados | null {
  const competencias = entradas.flatMap(({ id, nombre: nombreCompetencia, reporte }): CompetenciaResultado[] =>
    reporte === null
      ? []
      : [{ id, nombre: nombreCompetencia, resultado: resultadoCompetencia(reporte.participantes.find((p) => p.id === participanteId)) }],
  );
  const evaluadas = competencias.flatMap((c) => (c.resultado ? [c.resultado] : []));
  const promedio = puntajeEntreCompetencias(evaluadas.map((r) => r.puntaje));
  if (promedio === null) return null;
  return {
    nombre,
    jornada,
    promedio,
    nivel: nivelGeneral(promedio),
    brecha: brechaSiguienteNivel(promedio),
    competenciasEvaluadas: evaluadas.length,
    competenciasDisponibles: competencias.length,
    evaluaciones: evaluadas.reduce((suma, r) => suma + r.evaluaciones, 0),
    competencias,
  };
}

/**
 * The time of the participant's latest evaluation in any competencia (ISO),
 * or null without evaluations. New or edited evaluations anywhere make a new
 * email (claveIdempotencia).
 */
export function ultimaEvaluacion(entradas: readonly EntradaConsolidado[], participanteId: string): string | null {
  let ultima: string | null = null;
  for (const { reporte } of entradas) {
    const actualizado = reporte?.participantes.find((p) => p.id === participanteId)?.actualizadoEn ?? null;
    if (actualizado && (ultima === null || Date.parse(actualizado) > Date.parse(ultima))) ultima = actualizado;
  }
  return ultima;
}

/** A participant's latest send (envios_resultados), as the send page and the Reporte general need it. */
export type UltimoEnvio = {
  estado: "enviado" | "error";
  /** ISO. */
  enviadoEn: string;
  /** Successful sends before now, any time: numbers a deliberate re-send. */
  enviados: number;
};

export type MotivoOmision = "sin-evaluaciones" | "ausente" | "sin-correo";

export type FilaEnvio = {
  id: string;
  /** The report label: the carnet, or "Participante NN" (never the name). */
  etiqueta: string;
  /** Evaluations received, summed over the competencias. */
  evaluaciones: number;
  /** Competencias with at least 1 evaluation. */
  competenciasEvaluadas: number;
  ultimoEnvio: UltimoEnvio | null;
};

export type SeleccionEnvio = {
  /** An email and at least 1 evaluation in some competencia (PRD §5.14), in list order. */
  destinatarios: FilaEnvio[];
  omitidos: (FilaEnvio & { motivo: MotivoOmision })[];
};

type FilaConsolidada = Pick<ParticipanteConsolidado, "celdas">;

/** Evaluations received over every competencia of the jornada. */
export function evaluacionesRecibidas(fila: FilaConsolidada): number {
  return fila.celdas.reduce((suma, c) => suma + (c?.evaluaciones ?? 0), 0);
}

/**
 * Why a participant gets no email, or null if they are a recipient. Without
 * evaluations in any competencia there is nothing to send, so that reason
 * wins over a missing email; "Ausente" (marked absent in some competencia and
 * evaluated in none, §5.13) is the more specific form of it.
 */
export function motivoOmision(fila: FilaConsolidada, tieneCorreo: boolean): MotivoOmision | null {
  if (evaluacionesRecibidas(fila) === 0) {
    return fila.celdas.some((c) => c?.asistencia === "ausente") ? "ausente" : "sin-evaluaciones";
  }
  return tieneCorreo ? null : "sin-correo";
}

export function seleccionarDestinatarios(
  participantes: readonly ParticipanteConsolidado[],
  conCorreo: ReadonlySet<string>,
  envios: ReadonlyMap<string, UltimoEnvio>,
): SeleccionEnvio {
  const seleccion: SeleccionEnvio = { destinatarios: [], omitidos: [] };
  for (const p of participantes) {
    const fila: FilaEnvio = {
      id: p.id,
      etiqueta: p.etiqueta,
      evaluaciones: evaluacionesRecibidas(p),
      competenciasEvaluadas: p.competenciasEvaluadas,
      ultimoEnvio: envios.get(p.id) ?? null,
    };
    const motivo = motivoOmision(p, conCorreo.has(p.id));
    if (motivo) seleccion.omitidos.push({ ...fila, motivo });
    else seleccion.destinatarios.push(fila);
  }
  return seleccion;
}

/**
 * Already sent: the latest attempt succeeded. Such a participant is left out
 * unless the docente ticks "Reenviar". After an error the next send retries
 * on its own.
 */
export function yaEnviado(ultimo: UltimoEnvio | null): boolean {
  return ultimo?.estado === "enviado";
}

/**
 * Resend's Idempotency-Key for one participant's results (PRD §5.14):
 * jornada, participant and the time of their latest evaluation in any
 * competencia, so a retried request never sends twice, and new evaluations
 * make a new email. A deliberate "Reenviar" appends how many sends already
 * succeeded: the same data otherwise reuses the key and Resend would silently
 * skip it, while retrying a failed re-send keeps the same key.
 */
export function claveIdempotencia(
  jornada: JornadaId,
  participanteId: string,
  actualizadoEn: string,
  enviadosAntes: number,
): string {
  const base = `${jornada}-${ENVIO_CONSOLIDADO}-${participanteId}-${Date.parse(actualizadoEn)}`;
  return enviadosAntes > 0 ? `${base}-reenvio-${enviadosAntes}` : base;
}
