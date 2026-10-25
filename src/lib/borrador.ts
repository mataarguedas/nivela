import { useCallback, useSyncExternalStore } from "react";
import { esNivelValor, type NivelValor } from "@/config/niveles";

// Local drafts (PRD §9.3, FR-7, CLAUDE.md → Client state). Client only, but
// safe to import from server code: without `window` reads return null and
// writes are ignored.
//
// - Every localStorage access is wrapped in try/catch. On the first failure
//   the module switches to an in-memory store for the rest of the page's life
//   (useAlmacenamientoDisponible() turns false, so the notice can show).
// - Drafts are parsed once and cached, so React snapshots are stable and reads
//   see writes that are still waiting for the debounce.
// - Draft writes are debounced (RETARDO_ESCRITURA_MS) and flushed when the
//   page is hidden: iOS doesn't reliably fire `beforeunload`.
// - borrarTodo() removes only keys prefixed `nivela:v1:`.

export const PREFIJO_CLAVES = "nivela:v1:";
export const VERSION_BORRADOR = 1;
export const RETARDO_ESCRITURA_MS = 300;

export type CalificacionBorrador = {
  nivel?: NivelValor;
  observacion?: string;
  origen?: "manual" | "ia";
  ia?: { nivelSugerido: number; probabilidades: Record<string, number>; confianza: number; modelo: string };
};

export type EntradaParticipante = {
  /** Keyed by indicadorId. */
  calificaciones: Record<string, CalificacionBorrador>;
  /** ISO, set on successful submit. */
  enviadoEn?: string;
  /** ISO, bumped on every local change. */
  modificadoEn: string;
};

export type Borrador = {
  version: typeof VERSION_BORRADOR;
  /** Keyed by participanteId. */
  participantes: Record<string, EntradaParticipante>;
};

export function claveBorrador(competenciaId: string, evaluadorId: string): string {
  return `${PREFIJO_CLAVES}${competenciaId}:${evaluadorId}`;
}

export function claveEvaluador(competenciaId: string): string {
  return `${PREFIJO_CLAVES}evaluador:${competenciaId}`;
}

export function borradorVacio(): Borrador {
  return { version: VERSION_BORRADOR, participantes: {} };
}

// ---------------------------------------------------------------------------
// Schema migration

type Crudo = Record<string, unknown>;

/**
 * Migration hook: MIGRACIONES[n] turns a version-n draft into version n + 1.
 * When the Borrador shape changes, bump VERSION_BORRADOR and add a step here
 * so drafts saved by the previous build survive the deploy. Example:
 *   1: (b) => ({ ...b, version: 2, nuevoCampo: [] }),
 */
const MIGRACIONES: Record<number, (borrador: Crudo) => Crudo> = {};

/**
 * Parses stored data into a current-version Borrador. Returns null when it
 * can't be used (not an object, unknown or future version). Malformed
 * entries inside a usable draft are dropped instead of discarding everything.
 */
export function migrarBorrador(datos: unknown): Borrador | null {
  if (!esObjeto(datos)) return null;
  let actual: Crudo = datos;
  while (typeof actual.version === "number" && actual.version < VERSION_BORRADOR) {
    const paso = MIGRACIONES[actual.version];
    if (!paso) return null;
    actual = paso(actual);
  }
  if (actual.version !== VERSION_BORRADOR) return null;
  return normalizar(actual);
}

function normalizar(datos: Crudo): Borrador {
  const participantes: Record<string, EntradaParticipante> = {};
  if (esObjeto(datos.participantes)) {
    for (const [id, entrada] of Object.entries(datos.participantes)) {
      const limpia = normalizarEntrada(entrada);
      if (limpia) participantes[id] = limpia;
    }
  }
  return { version: VERSION_BORRADOR, participantes };
}

function normalizarEntrada(datos: unknown): EntradaParticipante | null {
  if (!esObjeto(datos) || !esFechaIso(datos.modificadoEn)) return null;
  const calificaciones: Record<string, CalificacionBorrador> = {};
  if (esObjeto(datos.calificaciones)) {
    for (const [id, calificacion] of Object.entries(datos.calificaciones)) {
      if (esObjeto(calificacion)) calificaciones[id] = normalizarCalificacion(calificacion);
    }
  }
  const entrada: EntradaParticipante = { calificaciones, modificadoEn: datos.modificadoEn };
  if (esFechaIso(datos.enviadoEn)) entrada.enviadoEn = datos.enviadoEn;
  return entrada;
}

function normalizarCalificacion(datos: Crudo): CalificacionBorrador {
  const calificacion: CalificacionBorrador = {};
  if (esNivelValor(datos.nivel)) calificacion.nivel = datos.nivel;
  if (typeof datos.observacion === "string") calificacion.observacion = datos.observacion;
  if (datos.origen === "manual" || datos.origen === "ia") calificacion.origen = datos.origen;
  const ia = datos.ia;
  if (
    esObjeto(ia) &&
    typeof ia.nivelSugerido === "number" &&
    typeof ia.confianza === "number" &&
    typeof ia.modelo === "string" &&
    esObjeto(ia.probabilidades) &&
    Object.values(ia.probabilidades).every((p) => typeof p === "number")
  ) {
    calificacion.ia = {
      nivelSugerido: ia.nivelSugerido,
      probabilidades: ia.probabilidades as Record<string, number>,
      confianza: ia.confianza,
      modelo: ia.modelo,
    };
  }
  return calificacion;
}

function esObjeto(valor: unknown): valor is Crudo {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esFechaIso(valor: unknown): valor is string {
  return typeof valor === "string" && !Number.isNaN(Date.parse(valor));
}

// ---------------------------------------------------------------------------
// Editing a participant's ratings (PRD §5.5, §5.6). Pure: they return a new
// Borrador for useBorrador's `actualizar`.

type CambioCalificacion = (actual: CalificacionBorrador) => CalificacionBorrador;

/** Applies `cambio` to one indicator's rating and bumps `modificadoEn`. */
export function conCalificacion(
  borrador: Borrador,
  participanteId: string,
  indicadorId: string,
  cambio: CambioCalificacion,
  ahora: Date = new Date(),
): Borrador {
  const entrada = borrador.participantes[participanteId];
  const calificaciones = entrada?.calificaciones ?? {};
  return {
    ...borrador,
    participantes: {
      ...borrador.participantes,
      [participanteId]: {
        ...entrada,
        calificaciones: { ...calificaciones, [indicadorId]: cambio(calificaciones[indicadorId] ?? {}) },
        modificadoEn: ahora.toISOString(),
      },
    },
  };
}

/**
 * A level picked by hand. Switches `origen` to "manual" but keeps any `ia`
 * metadata from an earlier applied suggestion (PRD §5.6.7).
 */
export function nivelManual(nivel: NivelValor): CambioCalificacion {
  return (actual) => ({ ...actual, nivel, origen: "manual" });
}

/** Sets the observation; an empty text removes it. */
export function conObservacion(texto: string): CambioCalificacion {
  return (actual) => {
    const siguiente = { ...actual };
    if (texto === "") delete siguiente.observacion;
    else siguiente.observacion = texto;
    return siguiente;
  };
}

/** How many of `indicadorIds` have a level in this entry. */
export function contarCalificados(entrada: EntradaParticipante | undefined, indicadorIds: readonly string[]): number {
  return indicadorIds.filter((id) => entrada?.calificaciones[id]?.nivel !== undefined).length;
}

// ---------------------------------------------------------------------------
// Participant status (PRD §5.4)

export type EstadoParticipante = "pendiente" | "enProgreso" | "completado" | "enviado";

/**
 * Status of one participant for the list. `enviadoEnServidor` is the
 * server's `updated_at` for this participant, from GET /api/evaluaciones
 * (wired in M4); until then only the local `enviadoEn` counts. A local change
 * after the latest send means "completado" again: it needs re-sending.
 */
export function estadoParticipante(
  entrada: EntradaParticipante | undefined,
  indicadorIds: readonly string[],
  enviadoEnServidor?: string,
): EstadoParticipante {
  const enviadoEn = masReciente(entrada?.enviadoEn, enviadoEnServidor);
  if (enviadoEn && (!entrada || Date.parse(entrada.modificadoEn) <= Date.parse(enviadoEn))) return "enviado";

  const calificados = contarCalificados(entrada, indicadorIds);
  if (calificados === 0) return "pendiente";
  if (calificados < indicadorIds.length) return "enProgreso";
  return "completado";
}

function masReciente(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

// ---------------------------------------------------------------------------
// Storage with in-memory fallback

const CLAVE_PRUEBA = `${PREFIJO_CLAVES}prueba`;

let modo: "desconocido" | "local" | "memoria" = "desconocido";
const memoria = new Map<string, string>();
/** Parsed values by key: Borrador | null for drafts, string | null for the evaluator. */
const cache = new Map<string, unknown>();
const pendientes = new Map<string, string>();
let temporizador: ReturnType<typeof setTimeout> | null = null;
const oyentes = new Set<() => void>();
let oyentesInstalados = false;

const enNavegador = () => typeof window !== "undefined";

function notificar() {
  for (const oyente of oyentes) oyente();
}

/** Probes localStorage once; afterwards `modo` is "local" or "memoria". */
function detectar() {
  if (modo !== "desconocido" || !enNavegador()) return;
  try {
    const almacen = window.localStorage;
    almacen.setItem(CLAVE_PRUEBA, "1");
    almacen.removeItem(CLAVE_PRUEBA);
    modo = "local";
  } catch {
    pasarAMemoria();
  }
  instalarOyentes();
}

function pasarAMemoria() {
  if (modo === "memoria") return;
  // Keep what's still readable (e.g. only writes fail when the quota is full).
  try {
    const almacen = window.localStorage;
    for (let i = 0; i < almacen.length; i++) {
      const clave = almacen.key(i);
      if (clave?.startsWith(PREFIJO_CLAVES) && !memoria.has(clave)) {
        const valor = almacen.getItem(clave);
        if (valor !== null) memoria.set(clave, valor);
      }
    }
  } catch {
    // Nothing readable: start empty.
  }
  modo = "memoria";
  // This can run inside a render (from a snapshot read); notify afterwards.
  queueMicrotask(notificar);
}

function leerCrudo(clave: string): string | null {
  detectar();
  if (modo === "local") {
    try {
      return window.localStorage.getItem(clave);
    } catch {
      pasarAMemoria();
    }
  }
  return memoria.get(clave) ?? null;
}

function escribirCrudo(clave: string, valor: string | null) {
  detectar();
  if (modo === "local") {
    try {
      if (valor === null) window.localStorage.removeItem(clave);
      else window.localStorage.setItem(clave, valor);
      return;
    } catch {
      pasarAMemoria();
    }
  }
  if (valor === null) memoria.delete(clave);
  else memoria.set(clave, valor);
}

function clavesNivela(): string[] {
  detectar();
  const claves = new Set<string>();
  for (const clave of memoria.keys()) if (clave.startsWith(PREFIJO_CLAVES)) claves.add(clave);
  if (modo === "local") {
    try {
      const almacen = window.localStorage;
      for (let i = 0; i < almacen.length; i++) {
        const clave = almacen.key(i);
        if (clave?.startsWith(PREFIJO_CLAVES)) claves.add(clave);
      }
    } catch {
      pasarAMemoria();
    }
  }
  return [...claves];
}

function instalarOyentes() {
  if (oyentesInstalados || !enNavegador()) return;
  oyentesInstalados = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") vaciarEscrituras();
  });
  // Safari's bfcache path: `pagehide` fires where `visibilitychange` may not.
  window.addEventListener("pagehide", vaciarEscrituras);
  // Another tab changed drafts: drop the cached copies and re-read.
  window.addEventListener("storage", (evento) => {
    if (evento.key !== null && !evento.key.startsWith(PREFIJO_CLAVES)) return;
    if (evento.key === null) cache.clear();
    else if (!pendientes.has(evento.key)) cache.delete(evento.key);
    notificar();
  });
}

/** Writes every pending draft now. Called on hide; safe to call any time. */
export function vaciarEscrituras(): void {
  if (temporizador !== null) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  for (const [clave, valor] of pendientes) escribirCrudo(clave, valor);
  pendientes.clear();
}

/** False once localStorage has failed and drafts live only in memory. */
export function almacenamientoDisponible(): boolean {
  detectar();
  return modo !== "memoria";
}

export function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

// ---------------------------------------------------------------------------
// Drafts and the selected evaluator

export function leerBorrador(competenciaId: string, evaluadorId: string): Borrador | null {
  if (!enNavegador()) return null;
  const clave = claveBorrador(competenciaId, evaluadorId);
  if (cache.has(clave)) return cache.get(clave) as Borrador | null;
  let borrador: Borrador | null = null;
  const crudo = leerCrudo(clave);
  if (crudo !== null) {
    try {
      borrador = migrarBorrador(JSON.parse(crudo));
    } catch {
      borrador = null; // Corrupt JSON: start over rather than crash.
    }
  }
  cache.set(clave, borrador);
  return borrador;
}

/** Updates the draft at once for readers; persists it after the debounce. */
export function guardarBorrador(competenciaId: string, evaluadorId: string, borrador: Borrador): void {
  if (!enNavegador()) return;
  detectar();
  const clave = claveBorrador(competenciaId, evaluadorId);
  cache.set(clave, borrador);
  pendientes.set(clave, JSON.stringify(borrador));
  if (temporizador !== null) clearTimeout(temporizador);
  temporizador = setTimeout(vaciarEscrituras, RETARDO_ESCRITURA_MS);
  notificar();
}

export function leerEvaluador(competenciaId: string): string | null {
  if (!enNavegador()) return null;
  const clave = claveEvaluador(competenciaId);
  if (cache.has(clave)) return cache.get(clave) as string | null;
  const evaluadorId = leerCrudo(clave);
  cache.set(clave, evaluadorId);
  return evaluadorId;
}

/** Written at once (not debounced): a navigation usually follows. */
export function guardarEvaluador(competenciaId: string, evaluadorId: string): void {
  if (!enNavegador()) return;
  const clave = claveEvaluador(competenciaId);
  cache.set(clave, evaluadorId);
  escribirCrudo(clave, evaluadorId);
  notificar();
}

/**
 * "Borrar todo" (PRD §5.8): every local draft and every selected evaluator,
 * for all competencias. Only keys prefixed `nivela:v1:` are touched.
 */
export function borrarTodo(): void {
  if (!enNavegador()) return;
  if (temporizador !== null) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  pendientes.clear();
  for (const clave of clavesNivela()) escribirCrudo(clave, null);
  cache.clear();
  notificar();
}

// ---------------------------------------------------------------------------
// React hooks. `undefined` means "not read yet": the server render and the
// hydration pass can't see localStorage, so components show a neutral state.

const sinValor = () => undefined;

export function useEvaluadorSeleccionado(competenciaId: string): string | null | undefined {
  return useSyncExternalStore(suscribir, () => leerEvaluador(competenciaId), sinValor);
}

type ActualizarBorrador = (cambio: (actual: Borrador) => Borrador) => void;

/**
 * The evaluator's draft for a competencia. `borrador` is undefined until
 * hydrated and an empty draft when nothing is saved yet. `actualizar` is a
 * no-op without an evaluator.
 */
export function useBorrador(
  competenciaId: string,
  evaluadorId: string | null | undefined,
): { borrador: Borrador | undefined; actualizar: ActualizarBorrador } {
  const guardado = useSyncExternalStore(
    suscribir,
    () => (evaluadorId ? leerBorrador(competenciaId, evaluadorId) : null),
    sinValor,
  );
  const actualizar = useCallback<ActualizarBorrador>(
    (cambio) => {
      if (!evaluadorId) return;
      guardarBorrador(competenciaId, evaluadorId, cambio(leerBorrador(competenciaId, evaluadorId) ?? borradorVacio()));
    },
    [competenciaId, evaluadorId],
  );
  const borrador = guardado === undefined ? undefined : (guardado ?? BORRADOR_VACIO);
  return { borrador, actualizar };
}

// Shared so an empty snapshot keeps the same identity between renders.
const BORRADOR_VACIO: Borrador = Object.freeze({ version: VERSION_BORRADOR, participantes: Object.freeze({}) });

export function useAlmacenamientoDisponible(): boolean {
  return useSyncExternalStore(suscribir, almacenamientoDisponible, () => true);
}
