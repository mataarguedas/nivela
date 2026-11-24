import { idParticipante } from "@/config/participantes";
import type { NombreHoja } from "./agregarParticipantes";
import { claveNombre, type FilaGuardada } from "./distribucion";

// `npm run participantes:conservar` (PRD §5.10, v1.19): the docentes' final
// list says who is evaluated in a jornada, and everyone else leaves the
// list. The list must stay P01…Pn with no gaps (the admin editor, the
// count and hiding all rely on it), so the people on the sheet are
// renumbered first, P01…Pk in their current order, and everyone else comes
// after them, hidden. Rows are never deleted: hidden participants keep their
// names, carnets, emails and evaluations, and come back if the admin raises
// the count. Evaluations, absence marks and sent-email records follow their
// participant to the new number. Pure, so it is unit-tested with fake names;
// messages name positions, never people.

export type Renumeracion = { de: number; a: number; activo: boolean };

export type PlanConservar =
  | {
      ok: true;
      /** One entry per stored row: its numero now, its numero after, and whether it stays visible. */
      mapa: Renumeracion[];
      conservados: number;
      ocultados: number;
      /** Rows whose numero changes, so their evaluations, attendance and email records move. */
      cambios: { deId: string; aId: string }[];
    }
  | { ok: false; errores: string[] };

/**
 * Every sheet row must match exactly one active stored participant
 * (claveNombre: order, accents and case ignored), and no two rows the same
 * one. The kept participants take P01…Pk in their current numero order; the
 * rest (active or already hidden) follow in their current order, hidden.
 */
export function planificarConservar(nombres: readonly NombreHoja[], filas: readonly FilaGuardada[]): PlanConservar {
  const errores: string[] = [];
  if (nombres.length === 0) return { ok: false, errores: ["La hoja no tiene nombres."] };
  const porClave = new Map<string, FilaGuardada[]>();
  for (const f of filas) {
    if (!f.nombre || !f.activo) continue;
    const clave = claveNombre(f.nombre);
    porClave.set(clave, [...(porClave.get(clave) ?? []), f]);
  }
  const elegidos = new Map<number, string>();
  for (const n of nombres) {
    const coincidencias = porClave.get(claveNombre(n.nombre)) ?? [];
    if (coincidencias.length === 0) {
      errores.push(`${n.posicion}: no coincide con ningún participante visible de la lista guardada.`);
    } else if (coincidencias.length > 1) {
      errores.push(`${n.posicion}: coincide con varios participantes de la lista guardada.`);
    } else {
      const numero = coincidencias[0].numero;
      const anterior = elegidos.get(numero);
      if (anterior) errores.push(`${n.posicion}: es el mismo participante que la ${anterior}.`);
      else elegidos.set(numero, n.posicion);
    }
  }
  if (errores.length > 0) return { ok: false, errores };

  const ordenadas = [...filas].sort((a, b) => a.numero - b.numero);
  const conservadas = ordenadas.filter((f) => elegidos.has(f.numero));
  const resto = ordenadas.filter((f) => !elegidos.has(f.numero));
  const mapa: Renumeracion[] = [
    ...conservadas.map((f, i) => ({ de: f.numero, a: i + 1, activo: true })),
    ...resto.map((f, i) => ({ de: f.numero, a: conservadas.length + i + 1, activo: false })),
  ];
  return {
    ok: true,
    mapa,
    conservados: conservadas.length,
    ocultados: resto.filter((f) => f.activo).length,
    cambios: mapa.filter((m) => m.de !== m.a).map((m) => ({ deId: idParticipante(m.de), aId: idParticipante(m.a) })),
  };
}
