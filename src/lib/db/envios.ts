import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { JornadaId } from "@/config/jornadas";
import type { UltimoEnvio } from "@/lib/resultados";
import { getDb } from "./index";
import { enviosResultados } from "./schema";

// envios_resultados (PRD §5.14, §9.2): one row per send attempt, for one
// jornada + competencia. Never the address or the body: only the outcome and
// an error category.

export type EstadoEnvio = "enviado" | "error";

/** Rows in time order → each participant's latest attempt, plus how many succeeded. Pure, unit-tested. */
export function ultimosEnvios(
  filas: readonly { participanteId: string; estado: EstadoEnvio; enviadoEn: Date }[],
): Map<string, UltimoEnvio> {
  const ultimos = new Map<string, UltimoEnvio>();
  for (const f of filas) {
    const previo = ultimos.get(f.participanteId);
    const enviados = (previo?.enviados ?? 0) + (f.estado === "enviado" ? 1 : 0);
    ultimos.set(f.participanteId, { estado: f.estado, enviadoEn: f.enviadoEn.toISOString(), enviados });
  }
  return ultimos;
}

/** Each participant's latest send for the competencia in the jornada. */
export async function leerUltimosEnvios(jornada: JornadaId, competenciaId: string): Promise<Map<string, UltimoEnvio>> {
  const filas = await getDb()
    .select({ participanteId: enviosResultados.participanteId, estado: enviosResultados.estado, enviadoEn: enviosResultados.enviadoEn })
    .from(enviosResultados)
    .where(and(eq(enviosResultados.jornada, jornada), eq(enviosResultados.competenciaId, competenciaId)))
    .orderBy(asc(enviosResultados.enviadoEn));
  return ultimosEnvios(filas);
}

export async function registrarEnvio(
  jornada: JornadaId,
  competenciaId: string,
  participanteId: string,
  estado: EstadoEnvio,
  /** Error category only (TipoErrorCorreo); null when sent. */
  motivo: string | null,
): Promise<void> {
  await getDb().insert(enviosResultados).values({ jornada, competenciaId, participanteId, estado, motivo });
}
