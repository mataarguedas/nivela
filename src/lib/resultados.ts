import type { NivelValor } from "@/config/niveles";
import type { JornadaId } from "@/config/jornadas";
import type { Brecha } from "@/lib/puntajes";
import type { ReporteParticipante } from "@/lib/reportes";

// Personal results by email (PRD §5.14): the pure parts, unit-tested without
// a DB or a mail provider. What one participant's email contains, who gets
// one and who is skipped (and why), and the idempotency key of each send.
//
// The email data is built from the participant's own row of the Reporte, so
// it shows exactly the numbers the docente sees. It deliberately copies only
// that participant's own aggregates: never evaluator names, individual
// ratings, observations, AI metadata or other participants.

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

/** Everything the results email shows (lib/correos/resultados.ts). */
export type DatosResultados = {
  /** Greeting; null greets without a name. */
  nombre: string | null;
  competencia: string;
  jornada: string;
  puntajeGeneral: number;
  nivelGeneral: NivelValor;
  brecha: Brecha;
  evaluaciones: number;
  indicadores: IndicadorResultado[];
};

/**
 * The email data for one participant, or null without evaluations (there is
 * nothing to send). `nombre` comes from the participant list: the report row
 * only carries the carnet.
 */
export function datosResultados(
  fila: ReporteParticipante,
  { nombre, competencia, jornada }: { nombre: string | null; competencia: string; jornada: string },
): DatosResultados | null {
  if (fila.evaluaciones === 0 || fila.puntajeGeneral === null || fila.nivelGeneral === null || fila.brecha === null) {
    return null;
  }
  return {
    nombre,
    competencia,
    jornada,
    puntajeGeneral: fila.puntajeGeneral,
    nivelGeneral: fila.nivelGeneral,
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
  evaluaciones: number;
  ultimoEnvio: UltimoEnvio | null;
};

export type SeleccionEnvio = {
  /** An email and at least 1 evaluation (PRD §5.14), in list order. */
  destinatarios: FilaEnvio[];
  omitidos: (FilaEnvio & { motivo: MotivoOmision })[];
};

/**
 * Why a participant gets no email, or null if they are a recipient. Without
 * evaluations there is nothing to send, so that reason wins over a missing
 * email; "Ausente" (marked absent, no evaluations, §5.13) is the more
 * specific form of it.
 */
export function motivoOmision(fila: Pick<ReporteParticipante, "evaluaciones" | "asistencia">, tieneCorreo: boolean): MotivoOmision | null {
  if (fila.evaluaciones === 0) return fila.asistencia === "ausente" ? "ausente" : "sin-evaluaciones";
  return tieneCorreo ? null : "sin-correo";
}

export function seleccionarDestinatarios(
  participantes: readonly ReporteParticipante[],
  conCorreo: ReadonlySet<string>,
  envios: ReadonlyMap<string, UltimoEnvio>,
): SeleccionEnvio {
  const seleccion: SeleccionEnvio = { destinatarios: [], omitidos: [] };
  for (const p of participantes) {
    const fila: FilaEnvio = { id: p.id, etiqueta: p.etiqueta, evaluaciones: p.evaluaciones, ultimoEnvio: envios.get(p.id) ?? null };
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
 * jornada, competencia, participant and the time of their latest evaluation,
 * so a retried request never sends twice, and new evaluations make a new
 * email. A deliberate "Reenviar" appends how many sends already succeeded:
 * the same data otherwise reuses the key and Resend would silently skip it,
 * while retrying a failed re-send keeps the same key.
 */
export function claveIdempotencia(
  jornada: JornadaId,
  competenciaId: string,
  participanteId: string,
  actualizadoEn: string,
  enviadosAntes: number,
): string {
  const base = `${jornada}-${competenciaId}-${participanteId}-${Date.parse(actualizadoEn)}`;
  return enviadosAntes > 0 ? `${base}-reenvio-${enviadosAntes}` : base;
}
