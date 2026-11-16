// Cohorts (PRD §2, §5.11). Each jornada has its own teams (equipos.ts), its
// own participant list (the `participantes` table) and its own evaluations.
// The session carries the jornada: an evaluador's comes from the class code
// and never changes; docente and admin switch it in the app. Ids are stored
// in the DB, so never change an existing one.

export const JORNADAS = [
  { id: "manana", nombre: "Mañana" },
  { id: "noche", nombre: "Noche" },
] as const;

export type JornadaId = (typeof JORNADAS)[number]["id"];

export const IDS_JORNADA = JORNADAS.map((j) => j.id) as [JornadaId, ...JornadaId[]];

/** Docente and admin sessions start here; sessions signed before jornadas existed are morning ones. */
export const JORNADA_PREDETERMINADA: JornadaId = "manana";

export function esJornada(valor: unknown): valor is JornadaId {
  return typeof valor === "string" && (IDS_JORNADA as readonly string[]).includes(valor);
}

export function nombreJornada(id: JornadaId): string {
  return JORNADAS.find((j) => j.id === id)?.nombre ?? id;
}
