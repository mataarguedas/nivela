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

const partesFechaHora = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ZONA_HORARIA,
});

function aFecha(valor: Date | string): Date {
  return typeof valor === "string" ? new Date(valor) : valor;
}

/** Date or ISO string → "dd/mm/aaaa" in Costa Rica time. */
export function formatearFecha(valor: Date | string): string {
  return fecha.format(aFecha(valor));
}

/** The date's parts in Costa Rica time. Assembled by hand: ICU's separators vary. */
function partes(valor: Date | string) {
  const p = Object.fromEntries(partesFechaHora.formatToParts(aFecha(valor)).map((x) => [x.type, x.value]));
  return { dia: p.day, mes: p.month, anio: p.year, hora: p.hour, minuto: p.minute };
}

/** Date or ISO string → "dd/mm/aaaa hh:mm" (24 h) in Costa Rica time. */
export function formatearFechaHora(valor: Date | string): string {
  const { dia, mes, anio, hora, minuto } = partes(valor);
  return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
}

/** Date → "aaaa-mm-dd" in Costa Rica time, for file names (no slashes). */
export function fechaParaArchivo(valor: Date | string): string {
  const { dia, mes, anio } = partes(valor);
  return `${anio}-${mes}-${dia}`;
}
