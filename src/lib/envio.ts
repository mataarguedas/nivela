import type { EntradaParticipante } from "@/lib/borrador";
import type { CuerpoEvaluacion } from "@/lib/validacion";

// Client side of "Enviar evaluación" (PRD §5.7). Types only from validacion.ts
// so zod stays out of the rating page's bundle; the server validates again.

export type RespuestaEnvio = { ok: true; actualizadoEn: string } | { ok: false; status: number };

/**
 * The POST /api/evaluaciones body for one participant's draft, or null while
 * an indicator still has no level. Observations are trimmed and blank ones
 * dropped; `ia` metadata goes along whenever the draft has it.
 */
export function cuerpoEvaluacion(
  ids: { competenciaId: string; evaluadorId: string; participanteId: string },
  entrada: EntradaParticipante | undefined,
  indicadorIds: readonly string[],
): CuerpoEvaluacion | null {
  const calificaciones: CuerpoEvaluacion["calificaciones"] = [];
  for (const indicadorId of indicadorIds) {
    const calificacion = entrada?.calificaciones[indicadorId];
    if (calificacion?.nivel === undefined) return null;
    const observacion = calificacion.observacion?.trim();
    calificaciones.push({
      indicadorId,
      nivel: calificacion.nivel,
      origen: calificacion.origen ?? "manual",
      ...(observacion ? { observacion } : {}),
      ...(calificacion.ia ? { ia: calificacion.ia } : {}),
    });
  }
  return { ...ids, calificaciones };
}

/** Sends one evaluation. Never throws: a network failure is `{ ok: false, status: 0 }`. */
export async function enviarEvaluacion(cuerpo: CuerpoEvaluacion): Promise<RespuestaEnvio> {
  try {
    const respuesta = await fetch("/api/evaluaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
    if (!respuesta.ok) return { ok: false, status: respuesta.status };
    const datos: unknown = await respuesta.json();
    if (typeof datos === "object" && datos !== null && "actualizadoEn" in datos && typeof datos.actualizadoEn === "string") {
      return { ok: true, actualizadoEn: datos.actualizadoEn };
    }
    return { ok: false, status: respuesta.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** GET /api/evaluaciones: server `updated_at` by participanteId. Null on any failure. */
export async function consultarEnviadas(
  competenciaId: string,
  evaluadorId: string,
  senal?: AbortSignal,
): Promise<Record<string, string> | null> {
  try {
    const parametros = new URLSearchParams({ competencia: competenciaId, evaluador: evaluadorId });
    const respuesta = await fetch(`/api/evaluaciones?${parametros}`, { cache: "no-store", signal: senal });
    if (!respuesta.ok) return null;
    const datos: unknown = await respuesta.json();
    if (typeof datos !== "object" || datos === null || !("evaluaciones" in datos) || !Array.isArray(datos.evaluaciones)) {
      return null;
    }
    const enviadas: Record<string, string> = {};
    for (const fila of datos.evaluaciones as unknown[]) {
      if (
        typeof fila === "object" &&
        fila !== null &&
        "participanteId" in fila &&
        "actualizadoEn" in fila &&
        typeof fila.participanteId === "string" &&
        typeof fila.actualizadoEn === "string"
      ) {
        enviadas[fila.participanteId] = fila.actualizadoEn;
      }
    }
    return enviadas;
  } catch {
    return null;
  }
}
