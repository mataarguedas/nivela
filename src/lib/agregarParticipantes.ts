import {
  CANTIDAD_MAXIMA_PARTICIPANTES,
  esGrupoValido,
  esNombreValido,
  GRUPO_MAXIMO,
  idParticipante,
} from "@/config/participantes";
import { claveNombre, limpiarNombre, type FilaGuardada } from "./distribucion";

// `npm run participantes:agregar` (PRD §5.10, v1.17): extra students who join
// a jornada whose list is already set (the night jornada's Contabilidad
// students) are appended after the current participants, all in one group.
// The sheet is a single column of names written first name first, one per
// row ("Ana Lucía Mora Solís"); a leading "1." is ignored. Pure, so it is
// unit-tested with fake names. The sheets are PII: they stay in the
// gitignored privado/ folder, and nothing here returns a name in a message.

export type NombreHoja = {
  nombre: string;
  /** "fila 3": a position to report without printing the name. */
  posicion: string;
};

export type ListaNombres = { nombres: NombreHoja[]; errores: string[] };

const NUMERACION = /^\s*\d{1,3}\s*[.)-]\s*/;

/** "B11" → { columna: 2, fila: 11 }. */
function referencia(ref: string): { columna: number; fila: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  const columna = [...m[1]].reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0);
  return { columna, fila: Number(m[2]) };
}

/**
 * The names of a one-column sheet, in row order. Every non-empty cell must
 * be in the same column, so a sheet in another layout (a COFI distribution
 * sheet, a roster with emails) is refused instead of misread.
 */
export function leerListaNombres(celdas: ReadonlyMap<string, string>): ListaNombres {
  const errores: string[] = [];
  const entradas: { columna: number; fila: number; texto: string }[] = [];
  for (const [ref, valor] of celdas) {
    const r = referencia(ref);
    const texto = limpiarNombre(valor.replace(NUMERACION, ""));
    if (r && texto) entradas.push({ ...r, texto });
  }
  if (entradas.length === 0) return { nombres: [], errores: ["La hoja no tiene nombres."] };
  const columnas = new Set(entradas.map((e) => e.columna));
  if (columnas.size > 1) {
    return {
      nombres: [],
      errores: ["La hoja debe tener una sola columna con un nombre por fila (¿es una hoja de distribución COFI?)."],
    };
  }
  entradas.sort((a, b) => a.fila - b.fila);
  const nombres = entradas.map((e) => ({ nombre: e.texto, posicion: `fila ${e.fila}` }));
  for (const n of nombres) {
    if (!esNombreValido(n.nombre) || n.nombre.split(" ").length < 2) {
      errores.push(`${n.posicion}: no parece un nombre (nombre y apellidos, sin correos ni números de teléfono).`);
    }
  }
  return { nombres, errores };
}

export type PlanAgregar =
  | {
      ok: true;
      /** The first new numero (P{inicio}): right after the current active list. */
      inicio: number;
      nombres: string[];
      grupo: number;
      /** The new ids, to check that none already has evaluations or absence marks. */
      ids: string[];
    }
  | { ok: false; errores: string[] };

/**
 * Where the new names go (PRD §5.10, v1.17). They are appended as
 * P{n+1}…, after the n active participants, each with `grupo` (by default the
 * next group number after the ones in use). Refused, by position and never
 * by name, when:
 * - the jornada has no saved list yet (there is nothing to append to: use
 *   /admin or participantes:importar);
 * - it has hidden participants (rows above n): appending would write over
 *   their stored names, carnets and evaluations;
 * - a name repeats within the sheet or matches a stored participant
 *   (claveNombre: order, accents and case ignored);
 * - the list would pass 99, or the group is not 1–20.
 */
export function planificarAgregado(
  nombres: readonly NombreHoja[],
  filas: readonly FilaGuardada[],
  grupoPedido?: number,
): PlanAgregar {
  const errores: string[] = [];
  if (filas.length === 0) {
    return {
      ok: false,
      errores: ["La jornada aún no tiene una lista guardada. Créela en /admin o con participantes:importar."],
    };
  }
  const activas = filas.filter((f) => f.activo);
  const ocultas = filas.filter((f) => !f.activo);
  if (ocultas.length > 0) {
    errores.push(
      `La jornada tiene ${ocultas.length} participante(s) oculto(s) después del ${activas.length}; ` +
        "los nuevos ocuparían sus números. Revise la cantidad en /admin antes de agregar.",
    );
  }

  const guardados = new Set(filas.filter((f) => f.nombre).map((f) => claveNombre(f.nombre!)));
  const vistos = new Map<string, string>();
  for (const n of nombres) {
    const clave = claveNombre(n.nombre);
    const anterior = vistos.get(clave);
    if (anterior) errores.push(`${n.posicion}: repite el nombre de la ${anterior}.`);
    else vistos.set(clave, n.posicion);
    if (guardados.has(clave)) errores.push(`${n.posicion}: ya está en la lista guardada de la jornada.`);
  }

  const inicio = activas.length + 1;
  const total = activas.length + nombres.length;
  if (total > CANTIDAD_MAXIMA_PARTICIPANTES) {
    errores.push(`La lista tendría ${total} participantes; el máximo es ${CANTIDAD_MAXIMA_PARTICIPANTES}.`);
  }

  const enUso = filas.flatMap((f) => (f.grupo == null ? [] : [f.grupo]));
  const grupo = grupoPedido ?? (enUso.length > 0 ? Math.max(...enUso) + 1 : 1);
  if (!Number.isInteger(grupo) || !esGrupoValido(grupo)) {
    errores.push(`El grupo debe ser un número entre 1 y ${GRUPO_MAXIMO}.`);
  }

  if (errores.length > 0) return { ok: false, errores };
  return {
    ok: true,
    inicio,
    nombres: nombres.map((n) => n.nombre),
    grupo,
    ids: nombres.map((_, i) => idParticipante(inicio + i)),
  };
}
