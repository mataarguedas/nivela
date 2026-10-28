// Evaluados (PRD §9.1). The admin sets how many there are and their names at
// /admin; they live in the `participantes` table and are read through
// src/lib/db/participantes.ts. This module holds the pure parts: the id and
// label scheme, and the fallback list used until the admin saves for the
// first time (CANTIDAD_PARTICIPANTES, default 20, unnamed).

export type Participante = {
  /** "P01".."P99": stable, used in URLs, drafts and the DB. Never shown alone. */
  id: string;
  numero: number;
  nombre: string | null;
  /** What the UI shows: the name, or "Participante NN" without one. */
  etiqueta: string;
};

export const CANTIDAD_PARTICIPANTES_PREDETERMINADA = 20;
export const CANTIDAD_MAXIMA_PARTICIPANTES = 99; // ids are two digits: P01…P99
export const LARGO_MAXIMO_NOMBRE_PARTICIPANTE = 80;

export function leerCantidadParticipantes(valor: string | undefined): number {
  if (valor === undefined || valor.trim() === "") return CANTIDAD_PARTICIPANTES_PREDETERMINADA;
  const cantidad = Number(valor);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA_PARTICIPANTES) {
    throw new Error(
      `CANTIDAD_PARTICIPANTES must be an integer between 1 and ${CANTIDAD_MAXIMA_PARTICIPANTES}, got "${valor}".`,
    );
  }
  return cantidad;
}

/** Two-digit number as shown in codes and labels: 7 → "07". */
export function numeroParticipante(numero: number): string {
  return String(numero).padStart(2, "0");
}

export function idParticipante(numero: number): string {
  return `P${numeroParticipante(numero)}`;
}

// Only names (CLAUDE.md rule 5): no control characters, nothing that looks
// like an email or a phone number. Shared by the admin form and the API.
const CARACTER_CONTROL = /[\u0000-\u001f\u007f]/;
const DIGITOS_TELEFONO = 7;

/** A trimmed name (or "", meaning none) the admin may save. */
export function esNombreValido(nombre: string): boolean {
  return (
    nombre.length <= LARGO_MAXIMO_NOMBRE_PARTICIPANTE &&
    !CARACTER_CONTROL.test(nombre) &&
    !nombre.includes("@") &&
    (nombre.match(/\d/g)?.length ?? 0) < DIGITOS_TELEFONO
  );
}

/** "P01".."P99": the shape of any participant id, active or not. */
export function esIdParticipante(valor: string): boolean {
  const coincidencia = /^P(\d{2})$/.exec(valor);
  const numero = coincidencia ? Number(coincidencia[1]) : 0;
  return numero >= 1 && numero <= CANTIDAD_MAXIMA_PARTICIPANTES;
}

/** "Participante 07": the label without a name, and the secondary line under a name. */
export function etiquetaNumero(numero: number): string {
  return `Participante ${numeroParticipante(numero)}`;
}

export function crearParticipante(numero: number, nombre: string | null): Participante {
  const limpio = nombre?.trim() || null;
  return { id: idParticipante(numero), numero, nombre: limpio, etiqueta: limpio ?? etiquetaNumero(numero) };
}

/** Unnamed P01…P{cantidad}. */
export function generarParticipantes(cantidad: number): Participante[] {
  return Array.from({ length: cantidad }, (_, i) => crearParticipante(i + 1, null));
}
