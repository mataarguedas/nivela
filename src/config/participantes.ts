// Evaluados (PRD §9.1). The admin sets how many there are, their names and
// their carnets at /admin; they live in the `participantes` table and are
// read through src/lib/db/participantes.ts. This module holds the pure parts:
// the id and label scheme, and the fallback list used until the admin saves
// for the first time (CANTIDAD_PARTICIPANTES, default 20, unnamed).
//
// Two labels (PRD §5.10, §11): evaluators, the admin and the results email
// see the name (`etiqueta`); the docente's reports and the CSV identify each
// participant by carnet only (`etiquetaReporte`), never by name.

export type Participante = {
  /** "P01".."P99": stable, used in URLs, drafts and the DB. Never shown alone. */
  id: string;
  numero: number;
  nombre: string | null;
  /** University carnet (student ID), or null. PII: DB only, never logged or sent to Jev. */
  carnet: string | null;
  /** What evaluators and the admin see: the name, or "Participante NN" without one. */
  etiqueta: string;
  /** What the reports and the CSV show: the carnet, or "Participante NN" without one. Never the name. */
  etiquetaReporte: string;
};

export const CANTIDAD_PARTICIPANTES_PREDETERMINADA = 20;
export const CANTIDAD_MAXIMA_PARTICIPANTES = 99; // ids are two digits: P01…P99
export const LARGO_MAXIMO_NOMBRE_PARTICIPANTE = 80;
export const LARGO_MAXIMO_CARNET = 20;

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

// Carnets are university IDs: digits for nationals ("100000001"), and
// letters or hyphens for some foreign students. Nothing else.
const CARNET = /^[0-9A-Za-z-]+$/;

/** A trimmed carnet (or "", meaning none) the admin may save. */
export function esCarnetValido(carnet: string): boolean {
  return carnet === "" || (carnet.length <= LARGO_MAXIMO_CARNET && CARNET.test(carnet));
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

export function crearParticipante(numero: number, nombre: string | null, carnet: string | null = null): Participante {
  const limpio = nombre?.trim() || null;
  const carnetLimpio = carnet?.trim() || null;
  return {
    id: idParticipante(numero),
    numero,
    nombre: limpio,
    carnet: carnetLimpio,
    etiqueta: limpio ?? etiquetaNumero(numero),
    etiquetaReporte: carnetLimpio ?? etiquetaNumero(numero),
  };
}

/** Unnamed P01…P{cantidad}. */
export function generarParticipantes(cantidad: number): Participante[] {
  return Array.from({ length: cantidad }, (_, i) => crearParticipante(i + 1, null));
}
