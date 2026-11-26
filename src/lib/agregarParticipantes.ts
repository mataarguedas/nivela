import {
  CANTIDAD_MAXIMA_PARTICIPANTES,
  esCarnetValido,
  esGrupoValido,
  esNombreValido,
  GRUPO_MAXIMO,
  idParticipante,
  normalizarCarnet,
} from "@/config/participantes";
import { claveNombre, limpiarNombre, type FilaGuardada } from "./distribucion";
import { esquemaCorreo } from "./validacion";

// `npm run participantes:agregar` (PRD §5.10, v1.17): extra students who join
// a jornada whose list is already set (the night jornada's Contabilidad
// students) are appended after the current participants. Two inputs:
// - an .xlsx with a single column of names written first name first, one per
//   row ("Ana Lucía Mora Solís"; a leading "1." is ignored), all in one group;
// - a .csv `nombre,correo,grupo` (correo and grupo may be empty), for a
//   course's participant export where each student has a group and an
//   email; a row without a group gets the --grupo given, or none. An
//   optional 4th column `carnet` (empty or "—" for none) sets the carnet,
//   stored like the admin's (normalizarCarnet: a cédula as its 9 digits). Pure, so it is
// unit-tested with fake names. The sheets are PII: they stay in the
// gitignored privado/ folder, and nothing here returns a name in a message.

export type NombreHoja = {
  nombre: string;
  /** "fila 3": a position to report without printing the name. */
  posicion: string;
  /** CSV only: the stored email (trimmed, lowercased), or null. */
  correo?: string | null;
  /** CSV only: the student's group, or null for the default. */
  grupo?: number | null;
  /** CSV only: the carnet (normalized), or null for none / unchanged. */
  carnet?: string | null;
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
  const nombres = entradas.map((e) => ({
    nombre: e.texto,
    posicion: `fila ${e.fila}`,
  }));
  for (const n of nombres) {
    if (!esNombreValido(n.nombre) || n.nombre.split(" ").length < 2) {
      errores.push(`${n.posicion}: no parece un nombre (nombre y apellidos, sin correos ni números de teléfono).`);
    }
  }
  return { nombres, errores };
}

const ENCABEZADO_CSV = ["nombre", "correo", "grupo"];
const SIN_CARNET = /^[—–-]?$/;

/**
 * A `nombre,correo,grupo` CSV (header required; no quoted commas: names and
 * emails never have them). Errors name the line, never the student.
 */
export function leerCsvParticipantes(texto: string): ListaNombres {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/);
  const encabezado = (lineas[0] ?? "").split(",").map((c) => c.trim().toLowerCase());
  const conCarnet = encabezado.join(",") === [...ENCABEZADO_CSV, "carnet"].join(",");
  if (!conCarnet && encabezado.join(",") !== ENCABEZADO_CSV.join(",")) {
    return {
      nombres: [],
      errores: ["Línea 1: el encabezado debe ser «nombre,correo,grupo» o «nombre,correo,grupo,carnet»."],
    };
  }
  const columnasEsperadas = conCarnet ? 4 : 3;
  const nombres: NombreHoja[] = [];
  const errores: string[] = [];
  lineas.slice(1).forEach((linea, i) => {
    if (!linea.trim()) return;
    const posicion = `línea ${i + 2}`;
    const columnas = linea.split(",");
    if (columnas.length !== columnasEsperadas) {
      errores.push(`${posicion}: debe tener ${columnasEsperadas} columnas (${encabezado.join(", ")}).`);
      return;
    }
    const nombre = limpiarNombre(columnas[0]);
    const textoCorreo = columnas[1].trim();
    const textoGrupo = columnas[2].trim().replace(/^grupo\s*/i, "");
    if (!nombre || !esNombreValido(nombre) || nombre.split(" ").length < 2) {
      errores.push(`${posicion}: no parece un nombre (nombre y apellidos, sin correos ni números de teléfono).`);
    }
    const correo = textoCorreo ? esquemaCorreo.safeParse(textoCorreo) : null;
    if (correo && !correo.success) errores.push(`${posicion}: el correo no es válido.`);
    const grupo = textoGrupo ? Number(textoGrupo) : null;
    if (grupo !== null && (!Number.isInteger(grupo) || !esGrupoValido(grupo))) {
      errores.push(`${posicion}: el grupo debe ser un número entre 1 y ${GRUPO_MAXIMO}, o vacío.`);
    }
    const textoCarnet = conCarnet ? columnas[3].trim() : "";
    const carnet = SIN_CARNET.test(textoCarnet) ? null : normalizarCarnet(textoCarnet);
    if (carnet !== null && !esCarnetValido(carnet)) errores.push(`${posicion}: el carné no es válido.`);
    nombres.push({
      nombre,
      posicion,
      correo: correo?.success ? correo.data : null,
      grupo,
      ...(conCarnet ? { carnet } : {}),
    });
  });
  if (nombres.length === 0 && errores.length === 0) errores.push("La hoja no tiene nombres.");
  return { nombres, errores };
}

export type PlanAgregar =
  | {
      ok: true;
      /** The first new numero (P{inicio}): right after the current active list. */
      inicio: number;
      nombres: string[];
      /** Per new participant, aligned with `nombres`. */
      grupos: (number | null)[];
      correos: (string | null)[];
      carnets: (string | null)[];
      /** The new ids, to check that none already has evaluations or absence marks. */
      ids: string[];
      /**
       * With `actualizarExistentes`: the stored participants the sheet names (by numero),
       * with the row's group and its carnet (null: keep the stored one).
       */
      actualizaciones: { numero: number; grupo: number | null; carnet: string | null }[];
    }
  | { ok: false; errores: string[] };

/**
 * Where the new names go (PRD §5.10, v1.17). They are appended as
 * P{n+1}…, after the n active participants. A row's own group (CSV) wins;
 * otherwise it gets `grupoPedido`: a number, null for "Sin grupo", or, when
 * undefined, the next group number after the ones in use.
 *
 * With `actualizarExistentes`, a row whose name matches exactly one active
 * stored participant (claveNombre) is not appended: that participant only
 * gets the row's group, so a final group list can mix students already
 * stored and new ones. Its name, carnet, email and evaluations stay.
 *
 * Refused, by position and never by name, when:
 * - the jornada has no saved list yet (there is nothing to append to: use
 *   /admin or participantes:importar);
 * - it has hidden participants (rows above n): appending would write over
 *   their stored names, carnets and evaluations;
 * - a name repeats within the sheet, matches a stored participant (without
 *   `actualizarExistentes`) or matches several (order, accents and case
 *   ignored); an email repeats within the sheet;
 * - the list would pass 99, or the group is not 1–20.
 */
export function planificarAgregado(
  nombres: readonly NombreHoja[],
  filas: readonly FilaGuardada[],
  grupoPedido?: number | null,
  opciones: { actualizarExistentes?: boolean } = {},
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

  const enUso = filas.flatMap((f) => (f.grupo == null ? [] : [f.grupo]));
  const grupo = grupoPedido === undefined ? (enUso.length > 0 ? Math.max(...enUso) + 1 : 1) : grupoPedido;
  if (grupo !== null && (!Number.isInteger(grupo) || !esGrupoValido(grupo))) {
    errores.push(`El grupo debe ser un número entre 1 y ${GRUPO_MAXIMO}.`);
  }

  const porClave = new Map<string, FilaGuardada[]>();
  for (const f of filas) {
    if (!f.nombre) continue;
    const clave = claveNombre(f.nombre);
    porClave.set(clave, [...(porClave.get(clave) ?? []), f]);
  }
  const vistos = new Map<string, string>();
  const nuevos: NombreHoja[] = [];
  const actualizaciones: { numero: number; grupo: number | null; carnet: string | null }[] = [];
  for (const n of nombres) {
    const clave = claveNombre(n.nombre);
    const anterior = vistos.get(clave);
    if (anterior) errores.push(`${n.posicion}: repite el nombre de la ${anterior}.`);
    else vistos.set(clave, n.posicion);
    const coincidencias = porClave.get(clave) ?? [];
    if (coincidencias.length === 0) nuevos.push(n);
    else if (!opciones.actualizarExistentes) errores.push(`${n.posicion}: ya está en la lista guardada de la jornada.`);
    else if (coincidencias.length > 1 || !coincidencias[0].activo) {
      errores.push(`${n.posicion}: coincide con varios participantes guardados, o con uno oculto.`);
    } else actualizaciones.push({ numero: coincidencias[0].numero, grupo: n.grupo ?? grupo, carnet: n.carnet ?? null });
  }
  const correosVistos = new Map<string, string>();
  for (const n of nombres) {
    if (!n.correo) continue;
    const anterior = correosVistos.get(n.correo);
    if (anterior) errores.push(`${n.posicion}: repite el correo de la ${anterior}.`);
    else correosVistos.set(n.correo, n.posicion);
  }

  // A carnet is unique within the jornada's list (PRD §5.10): within the
  // sheet, and against every stored row other than the one the row updates.
  const carnetsVistos = new Map<string, string>();
  for (const n of nombres) {
    if (!n.carnet) continue;
    const anterior = carnetsVistos.get(n.carnet);
    if (anterior) errores.push(`${n.posicion}: repite el carné de la ${anterior}.`);
    else carnetsVistos.set(n.carnet, n.posicion);
    const propias = opciones.actualizarExistentes ? (porClave.get(claveNombre(n.nombre)) ?? []) : [];
    const propio = propias.length === 1 ? propias[0].numero : null;
    if (filas.some((f) => f.carnet && normalizarCarnet(f.carnet) === n.carnet && f.numero !== propio)) {
      errores.push(`${n.posicion}: el carné ya lo tiene otro participante guardado.`);
    }
  }

  const inicio = activas.length + 1;
  const total = activas.length + nuevos.length;
  if (total > CANTIDAD_MAXIMA_PARTICIPANTES) {
    errores.push(`La lista tendría ${total} participantes; el máximo es ${CANTIDAD_MAXIMA_PARTICIPANTES}.`);
  }

  if (errores.length > 0) return { ok: false, errores };
  return {
    ok: true,
    inicio,
    nombres: nuevos.map((n) => n.nombre),
    grupos: nuevos.map((n) => n.grupo ?? grupo),
    correos: nuevos.map((n) => n.correo ?? null),
    carnets: nuevos.map((n) => n.carnet ?? null),
    ids: nuevos.map((_, i) => idParticipante(inicio + i)),
    actualizaciones,
  };
}
