import { NIVELES, obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero, formatearLista, formatearPorcentaje } from "@/lib/formato";
import { nivelGeneral, proporcion, redondear2, UMBRALES_NIVEL } from "@/lib/puntajes";
import type {
  CifrasGrupo,
  CompetenciaConsolidada,
  DistribucionIndicador,
  IndicadorGrupo,
  PosicionRanking,
  ResumenIndicador,
} from "@/lib/reportes";
import { textoBrecha } from "@/lib/textoBrecha";

// Chart inputs, built on the server from the report so the charts only draw:
// every number arrives with its es-CR label. Pure and free of Recharts, so
// pages import it without pulling Recharts into their bundle.
//
// Two families:
// - Simple charts (PRD §11 v1.2, default view): horizontal bars drawn by
//   BarrasHorizontales on the server, each with a title sentence that states
//   the chart's message. No scoring math here: levels come from puntajes.ts.
// - Detailed charts ("Ver gráficos detallados"): the v1.1 Recharts inputs.

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

const NIVELES_VALOR: readonly NivelValor[] = [1, 2, 3, 4];

function porNivel<T>(f: (nivel: NivelValor) => T): Record<NivelValor, T> {
  return { 1: f(1), 2: f(2), 3: f(3), 4: f(4) };
}

const etiquetaNivel = (n: NivelValor) => obtenerNivel(n).etiqueta;

// ---------------------------------------------------------------------------
// Simple charts: horizontal bars
// ---------------------------------------------------------------------------

export type Barra = {
  clave: string;
  /** Row label (indicator, participant or level). */
  etiqueta: string;
  /** Bar length as a share of the axis, 0–100. */
  ancho: number;
  /** Value label at the bar end, e.g. "3,25 · Avanzado". */
  texto: string;
  /** Fill; null draws no bar (no data). */
  nivel: NivelValor | null;
};

/** A dashed threshold line, labelled with the level it opens. */
export type Referencia = { posicion: number; etiqueta: string };

export type DatosBarras = { titulo: string; barras: Barra[]; referencias: Referencia[] };

/** Puntaje axis: fixed 1–4, the rating scale (PRD §11.1). */
export const EJE_PUNTAJE = { min: 1, max: 4 } as const;

/** Share of the axis, clamped to 0–100 and rounded so the markup stays stable. */
export function posicionEnEje(valor: number, min: number, max: number): number {
  if (max <= min) return 0;
  const p = ((valor - min) / (max - min)) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 100) / 100;
}

/** The thresholds 1,5 / 2,5 / 3,5 on the 1–4 axis, labelled Intermedio / Avanzado / Experto. */
export const REFERENCIAS_NIVEL: readonly Referencia[] = (
  [
    [UMBRALES_NIVEL.intermedio, 2],
    [UMBRALES_NIVEL.avanzado, 3],
    [UMBRALES_NIVEL.experto, 4],
  ] as const
).map(([umbral, nivel]) => ({ posicion: posicionEnEje(umbral, EJE_PUNTAJE.min, EJE_PUNTAJE.max), etiqueta: etiquetaNivel(nivel) }));

function barraPuntaje(clave: string, etiqueta: string, puntaje: number | null): Barra {
  if (puntaje === null) return { clave, etiqueta, ancho: 0, texto: TEXTOS_REPORTES.sinDatos, nivel: null };
  const nivel = nivelGeneral(puntaje);
  return {
    clave,
    etiqueta,
    ancho: posicionEnEje(puntaje, EJE_PUNTAJE.min, EJE_PUNTAJE.max),
    texto: TEXTOS_REPORTES.valorNivel(formatearDecimal(puntaje), etiquetaNivel(nivel)),
    nivel,
  };
}

/** Values tied at their 2-decimal display are one value. */
function maximos<T>(elementos: readonly T[], valor: (e: T) => number): { valor: number; elementos: T[] } | null {
  if (elementos.length === 0) return null;
  const maximo = Math.max(...elementos.map((e) => redondear2(valor(e))));
  return { valor: maximo, elementos: elementos.filter((e) => redondear2(valor(e)) === maximo) };
}

// --- Participantes por nivel (Reporte general §11.2, Resumen del grupo §11.3)

/** Title for the participants-by-level chart; `conteo` counts participants by nivel general. */
export function tituloParticipantesPorNivel(conteo: Readonly<Record<NivelValor, number>>): string {
  const t = TEXTOS_REPORTES.titulos;
  const total = NIVELES_VALOR.reduce((suma, n) => suma + conteo[n], 0);
  const mas = maximos(NIVELES_VALOR, (n) => conteo[n]);
  if (total === 0 || !mas) return t.sinNivelGeneral;
  const n = formatearEntero(mas.valor);
  const de = formatearEntero(total);
  if (mas.elementos.length > 1) return t.empateNiveles(formatearLista(mas.elementos.map(etiquetaNivel)), n, de);
  const nivel = etiquetaNivel(mas.elementos[0]);
  if (mas.valor === total) return t.todosEnNivel(nivel, n);
  // "La mayoría" only when it is one: more than half.
  return mas.valor * 2 > total ? t.mayoriaEnNivel(nivel, n, de) : t.nivelMasFrecuente(nivel, n, de);
}

/** 4 bars, Básico → Experto, counting participants by their nivel general. */
export function barrasParticipantesPorNivel(
  niveles: readonly NivelValor[],
): DatosBarras & { conteo: Record<NivelValor, number>; total: number } {
  const conteo = porNivel((n) => niveles.filter((x) => x === n).length);
  const maximo = Math.max(1, ...NIVELES_VALOR.map((n) => conteo[n]));
  return {
    conteo,
    total: niveles.length,
    titulo: tituloParticipantesPorNivel(conteo),
    referencias: [],
    barras: NIVELES.map((n) => ({
      clave: n.clave,
      etiqueta: n.etiqueta,
      ancho: posicionEnEje(conteo[n.valor], 0, maximo),
      texto: TEXTOS_REPORTES.conteoPorcentaje(
        formatearEntero(conteo[n.valor]),
        formatearPorcentaje(proporcion(conteo[n.valor], niveles.length) ?? 0),
      ),
      nivel: n.valor,
    })),
  };
}

// --- Puntaje por indicador (Reporte individual §11.1, Resumen del grupo §11.3)

type MediaIndicador = { numero: number; titulo: string; media: number | null };

/** "Actúa de manera rápida y flexible." → «Actúa de manera rápida y flexible» inside a sentence. */
const sinPuntoFinal = (titulo: string) => titulo.trim().replace(/\.$/, "");

export function tituloPuntajePorIndicador(indicadores: readonly MediaIndicador[]): string {
  const t = TEXTOS_REPORTES.titulos;
  const conMedia = indicadores.filter((i): i is MediaIndicador & { media: number } => i.media !== null);
  const mas = maximos(conMedia, (i) => i.media);
  if (!mas) return t.sinPromedios;
  const media = formatearDecimal(mas.valor);
  if (mas.elementos.length === 1) return t.indicadorMasAlto(sinPuntoFinal(mas.elementos[0].titulo), media);
  if (mas.elementos.length === indicadores.length) return t.indicadoresIguales(media);
  return t.indicadoresMasAltos(formatearLista(mas.elementos.map((i) => String(i.numero))), media);
}

/** One bar per indicator on the fixed 1–4 axis, with the threshold lines. */
export function barrasPuntajePorIndicador(indicadores: readonly MediaIndicador[]): DatosBarras {
  return {
    titulo: tituloPuntajePorIndicador(indicadores),
    referencias: [...REFERENCIAS_NIVEL],
    barras: indicadores.map((i) =>
      barraPuntaje(`ind-${i.numero}`, `${TEXTOS.calificacion.indicador(i.numero)}. ${i.titulo}`, i.media),
    ),
  };
}

// --- Puntaje por participante (Reporte general §11.2)

export function tituloPuntajePorParticipante(ranking: readonly PosicionRanking[]): string {
  const t = TEXTOS_REPORTES.titulos;
  if (ranking.length === 0) return t.sinPuntajes;
  const puntajes = ranking.map((r) => redondear2(r.puntaje));
  const min = Math.min(...puntajes);
  const max = Math.max(...puntajes);
  if (ranking.length === 1) return t.puntajeUnico(formatearDecimal(max));
  if (min === max) return t.puntajesIguales(formatearDecimal(max));
  return t.rangoPuntajes(formatearDecimal(min), formatearDecimal(max));
}

/** The ranking (already sorted descending) as bars on the 1–4 axis. */
export function barrasPuntajePorParticipante(ranking: readonly PosicionRanking[]): DatosBarras {
  return {
    titulo: tituloPuntajePorParticipante(ranking),
    referencias: [...REFERENCIAS_NIVEL],
    barras: ranking.map((r) => barraPuntaje(r.id, r.etiqueta, r.puntaje)),
  };
}

// --- Puntaje del grupo por competencia (Reporte consolidado §11.4)

type PuntajeCompetencia = Pick<CompetenciaConsolidada, "id" | "nombre" | "puntaje">;

export function tituloPuntajePorCompetencia(competencias: readonly PuntajeCompetencia[]): string {
  const t = TEXTOS_REPORTES.consolidado.titulos;
  const conPuntaje = competencias.filter((c): c is PuntajeCompetencia & { puntaje: number } => c.puntaje !== null);
  const mas = maximos(conPuntaje, (c) => c.puntaje);
  if (!mas) return t.sinPuntajes;
  const valor = formatearDecimal(mas.valor);
  if (conPuntaje.length === 1) return t.unaCompetencia(conPuntaje[0].nombre, valor);
  if (mas.elementos.length === conPuntaje.length) return t.todasIguales(valor);
  if (mas.elementos.length === 1) return t.masAlta(mas.elementos[0].nombre, valor);
  return t.empateAltas(formatearLista(mas.elementos.map((c) => `«${c.nombre}»`)), valor);
}

/** One bar per competencia with a rubric in the jornada, on the 1–4 axis with the threshold lines. */
export function barrasPuntajePorCompetencia(competencias: readonly PuntajeCompetencia[]): DatosBarras {
  return {
    titulo: tituloPuntajePorCompetencia(competencias),
    referencias: [...REFERENCIAS_NIVEL],
    barras: competencias.map((c) => barraPuntaje(c.id, c.nombre, c.puntaje)),
  };
}

// --- Most chosen level per indicator (Reporte individual §11.1)

/** "3 de 4 evaluadores eligieron Avanzado", ties listed; null without ratings. */
export function lineaNivelMasElegido(distribucion: Readonly<Record<NivelValor, number>>): string | null {
  const total = NIVELES_VALOR.reduce((suma, n) => suma + distribucion[n], 0);
  const mas = maximos(NIVELES_VALOR, (n) => distribucion[n]);
  if (total === 0 || !mas) return null;
  const n = formatearEntero(mas.valor);
  const de = formatearEntero(total);
  if (mas.elementos.length > 1) return TEXTOS_REPORTES.empateMasElegido(formatearLista(mas.elementos.map(etiquetaNivel)), n, de);
  return TEXTOS_REPORTES.nivelMasElegido(n, de, etiquetaNivel(mas.elementos[0]));
}

// --- Resumen del grupo (§11.3): the one-paragraph summary

/** «Actúa de manera rápida» (3,25) for one indicator, "1 y 3" (3,25) for a tie. */
function frasesExtremo(
  indicadores: readonly IndicadorGrupo[],
  uno: (titulo: string, media: string) => string,
  varios: (numeros: string, media: string) => string,
): string | null {
  const media = indicadores[0]?.media;
  if (media === null || media === undefined) return null;
  const valor = formatearDecimal(media);
  return indicadores.length === 1
    ? uno(sinPuntoFinal(indicadores[0].titulo), valor)
    : varios(formatearLista(indicadores.map((i) => String(i.numero))), valor);
}

/**
 * "El grupo alcanzó un nivel Avanzado (2,84). Le faltan 0,66 puntos para
 * Experto. El indicador más fuerte es «…» (3,10) y el que más necesita
 * refuerzo es «…» (2,40)." The indicator sentence is left out when the
 * indicators can't be averaged together (two rubrics); ties are listed by
 * number, and equal means get a neutral sentence.
 */
export function parrafoResumenGrupo(
  grupo: Pick<CifrasGrupo, "puntaje" | "nivel" | "brecha" | "indicadores" | "masFuertes" | "masDebiles">,
): string {
  const p = TEXTOS_REPORTES.parrafo;
  if (grupo.puntaje === null || grupo.nivel === null) return TEXTOS_REPORTES.titulos.sinNivelGeneral;
  const frases = [p.nivel(etiquetaNivel(grupo.nivel), formatearDecimal(grupo.puntaje))];
  if (grupo.brecha) frases.push(`${textoBrecha(grupo.brecha)}.`);

  const conMedia = grupo.indicadores?.filter((i) => i.media !== null) ?? [];
  if (conMedia.length > 0 && grupo.masFuertes.length > 0 && grupo.masDebiles.length > 0) {
    if (grupo.masFuertes.length === conMedia.length) {
      frases.push(p.indicadoresIguales(formatearDecimal(grupo.masFuertes[0].media as number)));
    } else {
      const fuerte = frasesExtremo(grupo.masFuertes, p.masFuerte, p.masFuertes);
      const debil = frasesExtremo(grupo.masDebiles, p.masDebil, p.masDebiles);
      if (fuerte && debil) frases.push(`${fuerte} y ${debil}.`);
    }
  }
  return frases.join(" ");
}

// ---------------------------------------------------------------------------
// Detailed charts (Recharts, inside "Ver gráficos detallados")
// ---------------------------------------------------------------------------

// Segments narrower than this share of the bar don't fit a "12 %" label at
// 375 px; their value is still in the figure's table.
const PROPORCION_MINIMA_ETIQUETA = 0.08;

export type PuntoDistribucion = {
  eje: string;
  valores: Record<NivelValor, number>;
  textos: Record<NivelValor, string>;
};
export type PuntoRadar = { eje: string; media: number; texto: string };

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

export function puntosRadar(indicadores: readonly ResumenIndicador[]): PuntoRadar[] {
  return indicadores.map((i) => ({
    eje: TEXTOS_REPORTES.indicadorCorto(i.numero),
    media: i.media ?? 0,
    texto: i.media === null ? TEXTOS_REPORTES.sinDatos : formatearDecimal(i.media),
  }));
}
