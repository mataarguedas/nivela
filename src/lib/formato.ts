// es-CR display helpers. Formatters are created once and reused.

const LOCALE = "es-CR";
// Dates are shown in Costa Rica time on both server (UTC on Vercel) and client.
const ZONA_HORARIA = "America/Costa_Rica";
// Non-breaking space so "78 %" never wraps between the number and the sign.
const NBSP = " ";

const decimal2 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const fecha = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: ZONA_HORARIA,
});

/** 2.75 → "2,75" */
export function formatearDecimal(valor: number): string {
  return decimal2.format(valor);
}

/** 1000 → "1 000" (es-CR groups with a space). */
export function formatearEntero(valor: number): string {
  return entero.format(valor);
}

/**
 * Ratio to percent: 0.78 → "78 %". Built by hand because ICU's es-CR pattern
 * ("78%") differs from the house style and varies between browsers.
 */
export function formatearPorcentaje(ratio: number): string {
  return `${entero.format(ratio * 100)}${NBSP}%`;
}

/** Date or ISO string → "dd/mm/aaaa" in Costa Rica time. */
export function formatearFecha(valor: Date | string): string {
  return fecha.format(typeof valor === "string" ? new Date(valor) : valor);
}
