import "server-only";
import { nombreJornada, type JornadaId } from "@/config/jornadas";
import { enviarCorreo, ErrorCorreo, type TipoErrorCorreo } from "@/lib/correo";
import { PLANTILLA_RESULTADOS, resultados } from "@/lib/correos/resultados";
import type { PlantillaCorreo } from "@/lib/correos/plantilla";
import { leerUltimosEnvios, registrarEnvio } from "@/lib/db/envios";
import { obtenerCorreosParticipantes } from "@/lib/db/participantes";
import { leerEntradasConsolidado } from "@/lib/db/reportes";
import { agregarConsolidado, type EntradaConsolidado, type ReporteConsolidado } from "@/lib/reportes";
import {
  claveIdempotencia,
  datosResultados,
  ENVIO_CONSOLIDADO,
  motivoOmision,
  seleccionarDestinatarios,
  ultimaEvaluacion,
  yaEnviado,
  type MotivoOmision,
  type SeleccionEnvio,
  type UltimoEnvio,
} from "@/lib/resultados";

// Sending each participant their general report (PRD §5.14, v1.13): one
// email with every competencia of the session's jornada and the overall
// result. The server recomputes every result from the DB (the same
// aggregation as the Reporte consolidado): the client only names
// participants, never sends a score.
//
// Pacing: Resend allows a few requests per second per team, so sends go one
// at a time with PAUSA_ENTRE_ENVIOS_MS between them; a rate-limit answer
// waits (Retry-After, capped) and retries once. Each send carries an
// Idempotency-Key (lib/resultados.ts), so a retried request never sends the
// same email twice. Every attempt is recorded in envios_resultados under
// ENVIO_CONSOLIDADO.
//
// Never logged: addresses, names, subjects or bodies (enviarCorreo logs only
// the template name, status and latency).

export const PAUSA_ENTRE_ENVIOS_MS = 600;
const ESPERA_MAXIMA_LIMITE_S = 5;

export type ContextoEnvio = {
  jornada: JornadaId;
  /** Each competencia's Reporte (null without a rubric in the jornada). */
  entradas: EntradaConsolidado[];
  consolidado: ReporteConsolidado;
  /** By participant id (this jornada): the name for the greeting; null without one. */
  nombres: Map<string, string | null>;
  /** By participant id: active participants with an email only. */
  correos: Map<string, string>;
  envios: Map<string, UltimoEnvio>;
  seleccion: SeleccionEnvio;
};

/** Builds the context from data already read; pure, so the tests build it without a DB. */
export function contextoEnvio(
  jornada: JornadaId,
  participantes: readonly { id: string; nombre: string | null; etiquetaReporte: string }[],
  entradas: EntradaConsolidado[],
  correos: Map<string, string>,
  envios: Map<string, UltimoEnvio>,
): ContextoEnvio {
  const consolidado = agregarConsolidado(participantes, entradas);
  return {
    jornada,
    entradas,
    consolidado,
    nombres: new Map(participantes.map((p) => [p.id, p.nombre])),
    correos,
    envios,
    seleccion: seleccionarDestinatarios(consolidado.participantes, new Set(correos.keys()), envios),
  };
}

/** Everything the send page and the send route need, read in parallel. */
export async function cargarContextoEnvio(jornada: JornadaId): Promise<ContextoEnvio> {
  const [{ participantes, entradas }, correos, envios] = await Promise.all([
    leerEntradasConsolidado(jornada),
    obtenerCorreosParticipantes(jornada),
    leerUltimosEnvios(jornada, ENVIO_CONSOLIDADO),
  ]);
  return contextoEnvio(jornada, participantes, entradas, correos, envios);
}

/** The exact email a participant would receive, or null if they get none (no evaluations, or unknown). */
export function plantillaParaParticipante(
  contexto: ContextoEnvio,
  participanteId: string,
  { prueba = false }: { prueba?: boolean } = {},
): PlantillaCorreo | null {
  if (!contexto.nombres.has(participanteId)) return null;
  const datos = datosResultados(contexto.entradas, participanteId, {
    nombre: contexto.nombres.get(participanteId) ?? null,
    jornada: nombreJornada(contexto.jornada),
  });
  return datos && resultados(datos, { prueba });
}

export type MotivoError = MotivoOmision | "ya-enviado" | "no-existe" | TipoErrorCorreo;
export type ResultadoEnvio = { enviados: number; errores: { participanteId: string; motivo: MotivoError }[] };

type Opciones = { pausaMs?: number; dormir?: (ms: number) => Promise<void> };

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/**
 * Sends the listed participants their general report. A participant who
 * isn't a recipient (no email, no evaluations, absent, unknown) or was
 * already sent (without `reenviar`) is reported in `errores` and not sent.
 * Provider failures are recorded and reported per participant; one failure
 * never stops the rest.
 */
export async function enviarResultados(
  contexto: ContextoEnvio,
  participantes: readonly string[],
  reenviar: boolean,
  { pausaMs = PAUSA_ENTRE_ENVIOS_MS, dormir = esperar }: Opciones = {},
): Promise<ResultadoEnvio> {
  const resultado: ResultadoEnvio = { enviados: 0, errores: [] };
  let intentos = 0;

  for (const participanteId of new Set(participantes)) {
    const fila = contexto.consolidado.participantes.find((p) => p.id === participanteId);
    const para = contexto.correos.get(participanteId);
    const omision = fila ? motivoOmision(fila, para !== undefined) : "no-existe";
    const actualizadoEn = ultimaEvaluacion(contexto.entradas, participanteId);
    if (omision || !fila || !para || !actualizadoEn) {
      resultado.errores.push({ participanteId, motivo: omision ?? "no-existe" });
      continue;
    }
    const ultimo = contexto.envios.get(participanteId) ?? null;
    if (yaEnviado(ultimo) && !reenviar) {
      resultado.errores.push({ participanteId, motivo: "ya-enviado" });
      continue;
    }
    const plantilla = plantillaParaParticipante(contexto, participanteId);
    if (!plantilla) {
      resultado.errores.push({ participanteId, motivo: "sin-evaluaciones" });
      continue;
    }

    if (intentos > 0) await dormir(pausaMs);
    intentos += 1;
    const correo = {
      plantilla: PLANTILLA_RESULTADOS,
      para,
      ...plantilla,
      idempotencia: claveIdempotencia(contexto.jornada, participanteId, actualizadoEn, ultimo?.enviados ?? 0),
    };
    const fallo = await enviarConReintento(correo, dormir);
    await registrarEnvio(contexto.jornada, ENVIO_CONSOLIDADO, participanteId, fallo ? "error" : "enviado", fallo);
    if (fallo) resultado.errores.push({ participanteId, motivo: fallo });
    else resultado.enviados += 1;
  }
  return resultado;
}

/** Sends once, and once more after a rate limit. Returns the failure category, or null when sent. */
async function enviarConReintento(
  correo: Parameters<typeof enviarCorreo>[0],
  dormir: (ms: number) => Promise<void>,
): Promise<TipoErrorCorreo | null> {
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      await enviarCorreo(correo);
      return null;
    } catch (error) {
      const tipo = error instanceof ErrorCorreo ? error.tipo : "desconocido";
      if (tipo !== "limite" || intento === 1) return tipo;
      const espera = Math.min(error instanceof ErrorCorreo ? (error.reintentarEnSegundos ?? 1) : 1, ESPERA_MAXIMA_LIMITE_S);
      await dormir(espera * 1000);
    }
  }
  return "desconocido";
}

/**
 * "Enviarme una prueba": the participant's exact email, marked "[Prueba]" in
 * the subject, to an address the docente typed. Not stored, not recorded, no
 * idempotency key (a second test is a deliberate one). Throws ErrorCorreo.
 */
export async function enviarPrueba(contexto: ContextoEnvio, participanteId: string, para: string): Promise<boolean> {
  const plantilla = plantillaParaParticipante(contexto, participanteId, { prueba: true });
  if (!plantilla) return false;
  await enviarCorreo({ plantilla: `${PLANTILLA_RESULTADOS}-prueba`, para, ...plantilla });
  return true;
}
