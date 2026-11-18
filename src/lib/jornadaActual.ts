import "server-only";
import { connection } from "next/server";
import { obtenerCompetenciaHabilitada, type Competencia } from "@/config/competencias";
import { equipoDeCompetencia, type Equipo } from "@/config/equipos";
import { JORNADA_PREDETERMINADA, type JornadaId } from "@/config/jornadas";
import { getSesion, type Rol } from "@/lib/sesion";

// The session's jornada for Server Components (PRD §5.11). Reads the cookie,
// so call it behind <Suspense>; connection() keeps the JWT expiry check at
// request time (see components/ui/NavSesion.tsx). Without a session proxy.ts
// has already redirected; the default only keeps the type simple.

export async function jornadaActual(): Promise<JornadaId> {
  await connection();
  const sesion = await getSesion();
  return sesion?.jornada ?? JORNADA_PREDETERMINADA;
}

export type ContextoEvaluacion = {
  jornada: JornadaId;
  rol: Rol | null;
  /** The competencia with the session jornada's rubric (PRD Appendix A). */
  competencia: Competencia;
  /** The session jornada's team for the competencia. */
  equipo: Equipo;
  /** The signed-in evaluador's integrante id; null for the docente, who picks a team member. */
  evaluadorSesion: string | null;
};

/**
 * Who may rate this competencia in this session (PRD §5.3, §5.12): the
 * jornada's team for it, and for an evaluador their own id. Null when the
 * jornada has no team for it, or when an evaluador isn't on that team (they
 * may open only their own team's competencia). Null too when the jornada has
 * no rubric for it yet ("Próximamente"). Call behind <Suspense>.
 */
export async function contextoEvaluacion(competenciaId: string): Promise<ContextoEvaluacion | null> {
  await connection();
  const sesion = await getSesion();
  const jornada = sesion?.jornada ?? JORNADA_PREDETERMINADA;
  const competencia = obtenerCompetenciaHabilitada(jornada, competenciaId);
  const equipo = equipoDeCompetencia(jornada, competenciaId);
  if (!competencia || !equipo) return null;
  if (sesion?.rol !== "evaluador") return { jornada, rol: sesion?.rol ?? null, competencia, equipo, evaluadorSesion: null };
  const propio = equipo.integrantes.some((i) => i.id === sesion.integranteId);
  return propio && sesion.integranteId
    ? { jornada, rol: sesion.rol, competencia, equipo, evaluadorSesion: sesion.integranteId }
    : null;
}
