import { CANTIDAD_MAXIMA_PARTICIPANTES, esCarnetValido, normalizarCarnet } from "@/config/participantes";
import { claveNombre, type FilaGuardada } from "@/lib/distribucion";
import { esCorreoParticipanteValido } from "@/lib/validacion";

// The university's "Listado de Alumnos Matriculados" (PRD §5.10, v1.9): one
// PDF per course section, with a row per student: carnet, name (surnames
// first, in capitals, sometimes cut short) and the institutional email.
// `npm run participantes:matricula` turns each PDF into text (pdftotext
// -layout) and hands it here. The stored list already has the names and the
// COFI groups (participantes:importar); this only fills each participant's
// carnet and email, matched by name, so P01… keep their order and their
// evaluations. Pure, so it is unit-tested with fake names. The lists are PII:
// they stay in the gitignored privado/ folder, and nothing here logs a name,
// a carnet or an email.

export type Matriculado = {
  carnet: string;
  /** As written in the list: surnames first, possibly cut short. */
  nombreLista: string;
  /** The email when it is a valid address; a cut one ("…@est.utn.ac.") is null. */
  correo: string | null;
  /** "lista-1.pdf, línea 3": a position to report without printing the name. */
  posicion: string;
};

export type Matricula = { estudiantes: Matriculado[]; errores: string[]; avisos: string[] };

// A student row: the carnet (digits, sometimes letters or hyphens, with at
// least one digit), the name, and optionally something with "@".
const FILA = /^\s*(?=[0-9A-Za-z-]*\d)([0-9A-Za-z-]{5,20})\s+(.+?)(?:\s+(\S*@\S*))?\s*$/;
// The name must look like one: letters, spaces, apostrophes, hyphens or periods.
const NOMBRE = /^[\p{L}][\p{L}\s.'-]*$/u;

/** The students of one enrollment list, from its text. `archivo` only labels positions. */
export function leerMatricula(texto: string, archivo: string): Matricula {
  const estudiantes: Matriculado[] = [];
  const errores: string[] = [];
  const avisos: string[] = [];
  let linea = 0;
  for (const renglon of texto.split(/\r?\n/)) {
    const fila = FILA.exec(renglon);
    if (!fila) continue;
    const nombreLista = fila[2].replace(/\s+/g, " ").trim();
    if (!NOMBRE.test(nombreLista)) continue; // a header or a footer with numbers ("V 800 1159")
    linea += 1;
    const posicion = `${archivo}, línea ${linea}`;
    const carnet = normalizarCarnet(fila[1]);
    if (!esCarnetValido(carnet)) errores.push(`${posicion}: el carné no es válido.`);
    const textoCorreo = fila[3]?.trim().toLowerCase() ?? "";
    const correo = textoCorreo && esCorreoParticipanteValido(textoCorreo) ? textoCorreo : null;
    if (textoCorreo && !correo) avisos.push(`${posicion}: el correo está incompleto o no es válido; no se importa.`);
    if (!textoCorreo) avisos.push(`${posicion}: no tiene correo.`);
    estudiantes.push({ carnet, nombreLista, correo, posicion });
  }
  if (linea === 0) errores.push(`${archivo}: no se encontró ninguna fila «carné nombre correo».`);
  return { estudiantes, errores, avisos };
}

function palabras(nombre: string): string[] {
  return claveNombre(nombre).split(" ").filter(Boolean);
}

/**
 * Whether a list name is this stored name. Same words in any order (accents
 * and case ignored, claveNombre); and since the list cuts long names short,
 * the list's last word may be the start of a stored word ("ANGELE" for
 * "Ángeles") and a word or two may be missing at the end.
 */
export function mismoNombre(nombreLista: string, nombreGuardado: string): boolean {
  if (claveNombre(nombreLista) === claveNombre(nombreGuardado)) return true;
  const lista = limpiarPalabras(nombreLista);
  const guardado = palabras(nombreGuardado);
  if (lista.length < 3 || guardado.length - lista.length > 2 || guardado.length < lista.length) return false;
  const disponibles = [...guardado];
  return lista.every((p, i) => {
    const ultima = i === lista.length - 1;
    const j = disponibles.findIndex((g) => g === p || (ultima && p.length >= 2 && g.startsWith(p)));
    if (j < 0) return false;
    disponibles.splice(j, 1);
    return true;
  });
}

/** The words of a list name in their original order (the cut one is last). */
function limpiarPalabras(nombre: string): string[] {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export type CambioMatricula = { numero: number; carnet: string; correo: string | null };

export type PlanMatricula =
  | {
      modo: "asignar";
      /** One per matched participant. `correo` null keeps the stored email. */
      cambios: CambioMatricula[];
      carnetsNuevos: number;
      carnetsCambiados: number;
      correosNuevos: number;
      /** Active participants no list row matched (their carnet and email stay as they are). */
      sinCoincidencia: number;
    }
  | { modo: "error"; errores: string[] };

export type FilaConCorreo = FilaGuardada & { correo: string | null };

/**
 * What the import writes: for every student of the lists, the one active
 * participant with the same name gets the carnet and, when the list has a
 * valid one, the email. A student that matches no one or several, two
 * students on the same participant, or a carnet that another participant of
 * the jornada already has stops the import, reported by position only.
 */
export function planificarMatricula(estudiantes: readonly Matriculado[], filas: readonly FilaConCorreo[]): PlanMatricula {
  const activas = filas.filter((f) => f.activo && f.nombre);
  if (activas.length === 0) {
    return { modo: "error", errores: ["La lista guardada no tiene nombres. Importe primero la hoja de distribución."] };
  }
  if (estudiantes.length > CANTIDAD_MAXIMA_PARTICIPANTES) {
    return { modo: "error", errores: [`Hay ${estudiantes.length} estudiantes; el máximo es ${CANTIDAD_MAXIMA_PARTICIPANTES}.`] };
  }
  const errores: string[] = [];
  const asignados = new Map<number, Matriculado>();
  const carnetsVistos = new Map<string, string>();
  for (const e of estudiantes) {
    const clave = e.carnet.toUpperCase();
    const previa = carnetsVistos.get(clave);
    if (previa) {
      errores.push(`${e.posicion}: el carné ya está en ${previa}.`);
      continue;
    }
    carnetsVistos.set(clave, e.posicion);
    // An exact match wins over a cut-name match, so "Ana Mora" never takes "Ana Mora Solís".
    const exactas = activas.filter((f) => claveNombre(f.nombre!) === claveNombre(e.nombreLista));
    const coincidencias = exactas.length > 0 ? exactas : activas.filter((f) => mismoNombre(e.nombreLista, f.nombre!));
    if (coincidencias.length === 0) errores.push(`${e.posicion}: no coincide con ningún nombre de la lista guardada.`);
    else if (coincidencias.length > 1) errores.push(`${e.posicion}: coincide con varios participantes de la lista guardada.`);
    else {
      const numero = coincidencias[0].numero;
      const otro = asignados.get(numero);
      if (otro) errores.push(`${e.posicion}: es la misma persona que ${otro.posicion}.`);
      else asignados.set(numero, e);
    }
  }

  // A carnet must stay unique in the jornada (hidden rows included).
  for (const [numero, e] of asignados) {
    const clave = e.carnet.toUpperCase();
    const duena = filas.find(
      (f) => f.numero !== numero && f.carnet && normalizarCarnet(f.carnet).toUpperCase() === clave && !asignados.has(f.numero),
    );
    if (duena) errores.push(`${e.posicion}: el carné ya lo tiene el participante ${String(duena.numero).padStart(2, "0")}.`);
  }
  if (errores.length > 0) return { modo: "error", errores };

  const porNumero = new Map(filas.map((f) => [f.numero, f]));
  const cambios = [...asignados].map(([numero, e]) => ({ numero, carnet: e.carnet, correo: e.correo }));
  const guardado = (n: number) => porNumero.get(n)!;
  return {
    modo: "asignar",
    cambios: cambios.sort((a, b) => a.numero - b.numero),
    carnetsNuevos: cambios.filter((c) => !guardado(c.numero).carnet).length,
    carnetsCambiados: cambios.filter((c) => {
      const actual = guardado(c.numero).carnet;
      return actual !== null && normalizarCarnet(actual) !== c.carnet;
    }).length,
    correosNuevos: cambios.filter((c) => c.correo !== null && c.correo !== guardado(c.numero).correo).length,
    sinCoincidencia: activas.filter((f) => !asignados.has(f.numero)).length,
  };
}
