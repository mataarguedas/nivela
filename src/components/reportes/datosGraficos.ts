import type { NivelValor } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearPorcentaje } from "@/lib/formato";
import { proporcion } from "@/lib/puntajes";
import type { DistribucionIndicador, PosicionRanking, ResumenIndicador } from "@/lib/reportes";

// Chart inputs, built on the server from the report so the client charts
// only draw: every number arrives with its es-CR label. No Recharts here, so
// pages can import this without pulling it into their bundle.

export const COLOR_EJE = "#707070";
export const COLOR_REJILLA = "#d6d6d6";
export const COLOR_TEXTO = "#1d1d1f";
export const TAMANO_ETIQUETA = 12;

/** The level ramp of components/ui/coloresNivel.ts as hex values, for SVG fills. */
export const HEX_NIVEL: Record<NivelValor, string> = {
  1: "#d6d6d6",
  2: "#aad0f6",
  3: "#509be7",
  4: "#0066cc",
};

/** Text on top of a level fill: dark on the three lighter fills, white on #0066cc. */
export const TEXTO_SOBRE_NIVEL: Record<NivelValor, string> = {
  1: "#1d1d1f",
  2: "#1d1d1f",
  3: "#1d1d1f",
  4: "#ffffff",
};

// Segments narrower than this share of the bar don't fit a "12 %" label at
// 375 px; their value is still in the figure's table.
const PROPORCION_MINIMA_ETIQUETA = 0.08;

export type PuntoDistribucion = {
  eje: string;
  valores: Record<NivelValor, number>;
  textos: Record<NivelValor, string>;
};
export type PuntoPuntaje = { eje: string; puntaje: number; texto: string; nivel: NivelValor };
export type PuntoRadar = { eje: string; media: number; texto: string };

const NIVELES_VALOR: readonly NivelValor[] = [1, 2, 3, 4];

function porNivel<T>(f: (nivel: NivelValor) => T): Record<NivelValor, T> {
  return { 1: f(1), 2: f(2), 3: f(3), 4: f(4) };
}

/** Reporte general: share of each level per indicator (100 % stacked). */
export function puntosDistribucionGeneral(distribucion: readonly DistribucionIndicador[]): PuntoDistribucion[] {
  return distribucion.map((d) => {
    const valores = porNivel((n) => proporcion(d.conteo[n], d.total) ?? 0);
    return {
      eje: TEXTOS_REPORTES.indicadorCorto(d.numero),
      valores,
      textos: porNivel((n) => (valores[n] >= PROPORCION_MINIMA_ETIQUETA ? formatearPorcentaje(valores[n]) : "")),
    };
  });
}

/** Reporte individual: how many evaluators chose each level per indicator. */
export function puntosDistribucionParticipante(indicadores: readonly ResumenIndicador[]): PuntoDistribucion[] {
  return indicadores.map((i) => ({
    eje: TEXTOS_REPORTES.indicadorCorto(i.numero),
    valores: i.distribucion,
    textos: porNivel((n) => (i.distribucion[n] > 0 ? String(i.distribucion[n]) : "")),
  }));
}

/** The largest stack in conteo mode, so every bar shares one scale. */
export function maximoConteo(puntos: readonly PuntoDistribucion[]): number {
  return Math.max(1, ...puntos.map((p) => NIVELES_VALOR.reduce((suma, n) => suma + p.valores[n], 0)));
}

export function puntosPuntajes(ranking: readonly PosicionRanking[]): PuntoPuntaje[] {
  return ranking.map((r) => ({ eje: r.id, puntaje: r.puntaje, texto: formatearDecimal(r.puntaje), nivel: r.nivel }));
}

export function puntosRadar(indicadores: readonly ResumenIndicador[]): PuntoRadar[] {
  return indicadores.map((i) => ({
    eje: TEXTOS_REPORTES.indicadorCorto(i.numero),
    media: i.media ?? 0,
    texto: i.media === null ? TEXTOS_REPORTES.sinDatos : formatearDecimal(i.media),
  }));
}
