import type { JornadaId } from "@/config/jornadas";
import { CANTIDAD_MAXIMA_PARTICIPANTES, esGrupoValido, esNombreValido } from "@/config/participantes";

// The docentes' "Distribución de estudiantes COFI" sheets (PRD §5.4, §5.10,
// v1.8): one column per group, "Grupo 1" … "Grupo 5", with the students
// below it as "1. Apellido Apellido Nombre". `npm run participantes:importar`
// reads the first worksheet (scripts/xlsx.ts) and hands its cells here. Pure,
// so it is unit-tested with fake names. The sheets are PII: they stay in the
// gitignored privado/ folder, and nothing here logs a name.

export type Estudiante = {
  grupo: number;
  /** As written in the sheet: surnames first. */
  nombreHoja: string;
  /** First name first, as the admin stores names (PRD §5.10). */
  nombre: string;
  /** "Grupo 2, línea 3": a position to report without printing the name. */
  posicion: string;
};

export type Distribucion = {
  estudiantes: Estudiante[];
  /** The jornada the title suggests ("… Lunes noche" / "… Viernes día"), if any. */
  pistaJornada: JornadaId | null;
  /** "*total estudiantes: 24", if the sheet states it. */
  totalDeclarado: number | null;
  errores: string[];
};

/** "B11" → { columna: 2, fila: 11 }. */
function referencia(ref: string): { columna: number; fila: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  const columna = [...m[1]].reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0);
  return { columna, fila: Number(m[2]) };
}

const ENCABEZADO_GRUPO = /^\s*grupo\s+(\d{1,2})\s*$/i;
const ENTRADA = /^\s*\d{1,3}\s*[.)-]\s*(.+?)\s*$/;
const TOTAL = /total\s+(?:de\s+)?estudiantes\s*:\s*(\d+)/i;
// A group's list may start a couple of rows under its heading.
const FILAS_EN_BLANCO_ANTES = 3;

/** Collapsed spaces, no trailing period ("María Fernanda. " → "María Fernanda"). */
export function limpiarNombre(nombre: string): string {
  return nombre.replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "").trim();
}

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "san", "da", "van", "von"]);

/**
 * "Mora Solís Ana Lucía" → "Ana Lucía Mora Solís". The sheets
 * write the two surnames first; a surname may carry particles ("de la Cruz").
 * Names with three words or fewer after the surnames are not special-cased:
 * an unusual name (three surnames, one surname) comes out wrong and is
 * fixed by hand in /admin.
 */
export function nombrePrimero(apellidosPrimero: string): string {
  const palabras = limpiarNombre(apellidosPrimero).split(" ");
  if (palabras.length < 3) return palabras.join(" ");
  const apellidos: string[] = [];
  let i = 0;
  for (let unidades = 0; unidades < 2 && i < palabras.length - 1; unidades += 1) {
    while (i < palabras.length - 1 && PARTICULAS.has(palabras[i].toLowerCase())) apellidos.push(palabras[i++]);
    apellidos.push(palabras[i++]);
  }
  const nombres = palabras.slice(i);
  return nombres.length === 0 ? palabras.join(" ") : [...nombres, ...apellidos].join(" ");
}

/**
 * The same person whatever the word order, accents or case: "Ana Lucía Mora
 * Solís" and "MORA SOLIS Ana Lucia" share a key. Used to match the sheet to
 * names the admin already typed.
 */
export function claveNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** The groups and students of a distribution sheet, from its cells ("B11" → text). */
export function leerDistribucion(celdas: ReadonlyMap<string, string>): Distribucion {
  const porPosicion = new Map<string, string>();
  const encabezados: { grupo: number; columna: number; fila: number }[] = [];
  let totalDeclarado: number | null = null;
  for (const [ref, texto] of celdas) {
    const pos = referencia(ref);
    if (!pos) continue;
    porPosicion.set(`${pos.columna}:${pos.fila}`, texto);
    const grupo = ENCABEZADO_GRUPO.exec(texto);
    if (grupo) encabezados.push({ grupo: Number(grupo[1]), ...pos });
    const total = TOTAL.exec(texto);
    if (total) totalDeclarado = Number(total[1]);
  }

  const errores: string[] = [];
  if (encabezados.length === 0) errores.push("La hoja no tiene encabezados «Grupo N».");
  const vistos = new Set<number>();
  const estudiantes: Estudiante[] = [];
  for (const { grupo, columna, fila } of encabezados.sort((a, b) => a.grupo - b.grupo)) {
    if (!esGrupoValido(grupo)) errores.push(`«Grupo ${grupo}» está fuera de 1…20.`);
    if (vistos.has(grupo)) errores.push(`«Grupo ${grupo}» aparece dos veces.`);
    vistos.add(grupo);
    let linea = 0;
    for (let f = fila + 1, enBlanco = 0; ; f += 1) {
      const texto = porPosicion.get(`${columna}:${f}`);
      const entrada = texto ? ENTRADA.exec(texto) : null;
      if (!entrada) {
        if (linea > 0 || texto || ++enBlanco > FILAS_EN_BLANCO_ANTES) break;
        continue;
      }
      linea += 1;
      const nombreHoja = limpiarNombre(entrada[1]);
      const posicion = `Grupo ${grupo}, línea ${linea}`;
      const nombre = nombrePrimero(nombreHoja);
      if (!esNombreValido(nombre)) errores.push(`${posicion}: el nombre no es válido (correo, teléfono o más de 80 caracteres).`);
      estudiantes.push({ grupo, nombreHoja, nombre, posicion });
    }
    if (linea === 0) errores.push(`«Grupo ${grupo}» no tiene estudiantes debajo.`);
  }

  const claves = new Map<string, string>();
  for (const e of estudiantes) {
    const clave = claveNombre(e.nombreHoja);
    const previa = claves.get(clave);
    if (previa) errores.push(`${e.posicion}: la misma persona ya está en ${previa}.`);
    else claves.set(clave, e.posicion);
  }
  if (totalDeclarado !== null && totalDeclarado !== estudiantes.length) {
    errores.push(`La hoja dice ${totalDeclarado} estudiantes, pero se leyeron ${estudiantes.length}.`);
  }
  if (estudiantes.length > CANTIDAD_MAXIMA_PARTICIPANTES) {
    errores.push(`Hay ${estudiantes.length} estudiantes; el máximo es ${CANTIDAD_MAXIMA_PARTICIPANTES}.`);
  }

  // Only the title rows above the groups say which jornada the sheet is for.
  const primeraFila = Math.min(...encabezados.map((e) => e.fila), Number.POSITIVE_INFINITY);
  const titulo = [...celdas]
    .filter(([ref]) => (referencia(ref)?.fila ?? Infinity) < primeraFila)
    .map(([, texto]) => texto)
    .join(" ");
  const noche = /\bnoche\b/i.test(titulo);
  const dia = /\b(d[ií]a|ma[ñn]ana)\b/i.test(titulo);
  const pistaJornada: JornadaId | null = noche === dia ? null : noche ? "noche" : "manana";

  return { estudiantes, pistaJornada, totalDeclarado, errores };
}

/** What is stored for the jornada now (hidden rows included). */
export type FilaGuardada = {
  numero: number;
  nombre: string | null;
  carnet: string | null;
  tieneCorreo: boolean;
  grupo: number | null;
  activo: boolean;
};

export type PlanImportacion =
  /** Nothing named yet: the sheet becomes the list, P01… in group order. */
  | { modo: "crear"; nombres: string[]; grupos: number[] }
  /** Names already typed: only the groups change, matched by name. */
  | { modo: "asignar"; grupos: { numero: number; grupo: number | null }[]; sinGrupo: number; cambios: number }
  | { modo: "error"; errores: string[] };

/**
 * Decides what the import writes (PRD §5.10, v1.8). A jornada whose list has
 * no names yet gets the sheet as its list. One with names keeps them, and
 * each active participant gets the group of the sheet row with the same name
 * (claveNombre); the ones not in the sheet are left "Sin grupo". Every
 * student of the sheet must match exactly one active participant, so a typo
 * is reported (by position, never by name) instead of guessed.
 */
export function planificarImportacion(estudiantes: readonly Estudiante[], filas: readonly FilaGuardada[]): PlanImportacion {
  const activas = filas.filter((f) => f.activo);
  const conNombre = activas.filter((f) => f.nombre);
  if (conNombre.length === 0) {
    if (activas.some((f) => f.carnet || f.tieneCorreo)) {
      return {
        modo: "error",
        errores: ["La lista guardada tiene carnés o correos sin nombres. Revísela en /admin antes de importar."],
      };
    }
    return { modo: "crear", nombres: estudiantes.map((e) => e.nombre), grupos: estudiantes.map((e) => e.grupo) };
  }

  const porClave = new Map<string, FilaGuardada[]>();
  for (const f of conNombre) {
    const clave = claveNombre(f.nombre!);
    porClave.set(clave, [...(porClave.get(clave) ?? []), f]);
  }
  const errores: string[] = [];
  const asignados = new Map<number, number>();
  for (const e of estudiantes) {
    const coincidencias = porClave.get(claveNombre(e.nombreHoja)) ?? [];
    if (coincidencias.length === 0) errores.push(`${e.posicion}: no coincide con ningún nombre de la lista guardada.`);
    else if (coincidencias.length > 1) errores.push(`${e.posicion}: coincide con varios participantes de la lista guardada.`);
    else asignados.set(coincidencias[0].numero, e.grupo);
  }
  if (errores.length > 0) return { modo: "error", errores };

  const grupos = activas.map((f) => ({ numero: f.numero, grupo: asignados.get(f.numero) ?? null }));
  return {
    modo: "asignar",
    grupos,
    sinGrupo: grupos.filter((g) => g.grupo === null).length,
    cambios: grupos.filter((g) => g.grupo !== (activas.find((f) => f.numero === g.numero)?.grupo ?? null)).length,
  };
}
