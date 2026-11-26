import { NIVELES, obtenerNivel } from "@/config/niveles";
import { RANGOS_PUNTOS } from "@/lib/puntajes";
import { formatearEntero, formatearPuntos } from "@/lib/formato";
import type { CompetenciaResultado, DatosResultados, IndicadorResultado } from "@/lib/resultados";
import { textoBrecha } from "@/lib/textoBrecha";
import { COLORES_CORREO, documentoCorreo, escaparHtml, parrafo, PIE_TEXTO, type PlantillaCorreo } from "./plantilla";

// Personal results email (PRD §5.14, Appendix C "Envío de resultados"): since
// v1.13 one email per participant with their general report: the overall
// result (promedio entre competencias, its nivel and gap), a summary line per
// competencia, then each evaluated competencia in detail (puntaje general,
// nivel, gap, evaluations and every indicator with the next level's
// description). Built from DatosResultados (lib/resultados.ts), which carries
// only that participant's aggregates: never evaluator names, individual
// ratings, observations, AI metadata or other participants. Everything is
// stacked blocks rather than multi-column tables, so it reads well on a
// phone. No button: there is nothing to open.
//
// v1.16: every string comes from modeloResultados(), which the attached PDF
// (lib/pdf/resultadosPdf.ts) draws too, so the email and the PDF always match.

export const PLANTILLA_RESULTADOS = "resultados";

const ESCALA = NIVELES.map((n) => `${n.etiqueta} de ${RANGOS_PUNTOS[n.valor].min} a ${RANGOS_PUNTOS[n.valor].max}`)
  .join(", ")
  .replace(/, (?=[^,]*$)/, " y ");

export const TEXTOS_RESULTADOS = {
  asunto: "Su reporte general de competencias · Nivela",
  /** "[Prueba]" marks the docente's test send (never sent to a participant). */
  asuntoPrueba: "[Prueba] Su reporte general de competencias · Nivela",
  titulo: "Su reporte general de competencias",
  saludo: (nombre: string | null) => (nombre ? `Hola, ${nombre}:` : "Hola:"),
  introduccion: (jornada: string) =>
    `Estos son sus resultados en las competencias que evaluaron sus pares (jornada ${jornada}).`,
  resultadoGeneral: "Resultado general",
  promedio: (puntaje: string) => `Promedio entre competencias: ${puntaje} de 100`,
  competenciasEvaluadas: (n: number, total: number) =>
    `Con evaluaciones en ${formatearEntero(n)} de ${formatearEntero(total)} ${total === 1 ? "competencia" : "competencias"}.`,
  evaluaciones: (n: number) =>
    n === 1 ? "Recibió 1 evaluación de sus pares en total." : `Recibió ${formatearEntero(n)} evaluaciones de sus pares en total.`,
  // v1.20: the point scale, its own tile right after the overall result, so the
  // participant reads every score against the four bands (from puntajes.ts).
  escalaTitulo: "Escala de puntos",
  escalaIntroduccion: "Cada nivel corresponde a un rango de puntos en la escala de 0 a 100:",
  escalaRango: (min: number, max: number) => `de ${min} a ${max} puntos`,
  resumen: "Resumen por competencia",
  puntajeNivel: (puntaje: string, nivel: string) => `${puntaje} de 100 · ${nivel}`,
  sinEvaluaciones: "Sin evaluaciones",
  detalle: "Detalle por competencia",
  puntajeGeneral: (puntaje: string, nivel: string) => `Puntaje general: ${puntaje} de 100 · ${nivel}`,
  evaluacionesCompetencia: (n: number) =>
    n === 1 ? "Recibió 1 evaluación en esta competencia." : `Recibió ${formatearEntero(n)} evaluaciones en esta competencia.`,
  indicador: (numero: number, titulo: string) => `Indicador ${numero}. ${titulo}`,
  puntajeIndicador: (media: string, nivel: string) => `Puntaje: ${media} de 100 · ${nivel}`,
  paraLlegar: (nivel: string, descripcion: string) => `Para llegar a ${nivel}: ${descripcion}`,
  // "Básico de 0 a 25, Intermedio de 26 a 50, Avanzado de 51 a 75 y Experto de 76 a 100", from the bands in puntajes.ts.
  cierre: `Estos resultados son el promedio de las evaluaciones que hicieron sus pares, en una escala de 0 a 100: ${ESCALA}.`,
  cierreGeneral: "El resultado general es el promedio de sus puntajes generales en las competencias en las que recibió evaluaciones.",
  /** v1.16: only in the email, which carries the PDF. */
  adjunto: "Adjuntamos estos resultados en PDF para que pueda guardarlos o imprimirlos.",
  dudas: "Si tiene dudas sobre sus resultados, consulte con su docente. Este es un mensaje automático; no lo responda.",
} as const;

/** One indicator, as the email and the PDF show it. */
export type IndicadorTexto = { titulo: string; puntaje: string; brecha: string; siguiente: string | null };

/** One evaluated competencia in detail. */
export type DetalleTexto = { nombre: string; puntaje: string; brecha: string; evaluaciones: string; indicadores: IndicadorTexto[] };

/** Every string of the general report, in reading order (email HTML, email text and PDF). */
export type ModeloResultados = {
  titulo: string;
  saludo: string;
  introduccion: string;
  general: { etiqueta: string; nivel: string; promedio: string; brecha: string; cobertura: string };
  evaluaciones: string;
  /** v1.20: the four level bands, Básico first. */
  escala: { titulo: string; introduccion: string; filas: { nivel: string; rango: string }[] };
  resumenTitulo: string;
  /** One row per competencia with a rubric; `evaluada` false shows it muted. */
  resumen: { nombre: string; linea: string; evaluada: boolean }[];
  detalleTitulo: string;
  /** Only the competencias with evaluations, in config order. */
  detalle: DetalleTexto[];
  cierre: string;
  cierreGeneral: string;
};

function textosIndicador(i: IndicadorResultado): IndicadorTexto {
  const t = TEXTOS_RESULTADOS;
  return {
    titulo: t.indicador(i.numero, i.titulo),
    puntaje: t.puntajeIndicador(formatearPuntos(i.media), obtenerNivel(i.nivel).etiqueta),
    brecha: textoBrecha(i.brecha),
    siguiente:
      i.brecha.siguiente && i.descripcionSiguiente ? t.paraLlegar(obtenerNivel(i.brecha.siguiente).etiqueta, i.descripcionSiguiente) : null,
  };
}

/** "Adaptabilidad: 67 de 100 · Avanzado" or "…: Sin evaluaciones". */
function lineaResumen(c: CompetenciaResultado): string {
  const t = TEXTOS_RESULTADOS;
  return c.resultado ? t.puntajeNivel(formatearPuntos(c.resultado.puntaje), obtenerNivel(c.resultado.nivel).etiqueta) : t.sinEvaluaciones;
}

export function modeloResultados(datos: DatosResultados): ModeloResultados {
  const t = TEXTOS_RESULTADOS;
  return {
    titulo: t.titulo,
    saludo: t.saludo(datos.nombre),
    introduccion: t.introduccion(datos.jornada),
    general: {
      etiqueta: t.resultadoGeneral,
      nivel: obtenerNivel(datos.nivel).etiqueta,
      promedio: t.promedio(formatearPuntos(datos.promedio)),
      brecha: textoBrecha(datos.brecha),
      cobertura: t.competenciasEvaluadas(datos.competenciasEvaluadas, datos.competenciasDisponibles),
    },
    evaluaciones: t.evaluaciones(datos.evaluaciones),
    escala: {
      titulo: t.escalaTitulo,
      introduccion: t.escalaIntroduccion,
      filas: NIVELES.map((n) => ({
        nivel: n.etiqueta,
        rango: t.escalaRango(RANGOS_PUNTOS[n.valor].min, RANGOS_PUNTOS[n.valor].max),
      })),
    },
    resumenTitulo: t.resumen,
    resumen: datos.competencias.map((comp) => ({ nombre: comp.nombre, linea: lineaResumen(comp), evaluada: comp.resultado !== null })),
    detalleTitulo: t.detalle,
    detalle: datos.competencias.flatMap((comp): DetalleTexto[] => {
      const r = comp.resultado;
      if (!r) return [];
      return [
        {
          nombre: comp.nombre,
          puntaje: t.puntajeGeneral(formatearPuntos(r.puntaje), obtenerNivel(r.nivel).etiqueta),
          brecha: textoBrecha(r.brecha),
          evaluaciones: t.evaluacionesCompetencia(r.evaluaciones),
          indicadores: r.indicadores.map(textosIndicador),
        },
      ];
    }),
    cierre: t.cierre,
    cierreGeneral: t.cierreGeneral,
  };
}

export function resultados(datos: DatosResultados, { prueba = false }: { prueba?: boolean } = {}): PlantillaCorreo {
  const t = TEXTOS_RESULTADOS;
  const c = COLORES_CORREO;
  const m = modeloResultados(datos);
  const g = m.general;

  const h2 = (texto: string) =>
    `<h2 style="margin:24px 0 12px 0;font-size:19px;line-height:1.25;font-weight:600;color:${c.tinta};">${escaparHtml(texto)}</h2>`;

  const destacado = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;background:${c.lienzo};border-radius:12px;">
<tr><td align="center" style="padding:20px 16px;">
<p style="margin:0;font-size:12px;line-height:1.33;color:${c.tinta2};">${escaparHtml(g.etiqueta)}</p>
<p style="margin:4px 0 0 0;font-size:32px;line-height:1.1;font-weight:600;color:${c.tinta};">${escaparHtml(g.nivel)}</p>
<p style="margin:8px 0 0 0;font-size:17px;line-height:1.47;color:${c.tinta};">${escaparHtml(g.promedio)}</p>
<p style="margin:4px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(g.brecha)}</p>
<p style="margin:4px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(g.cobertura)}</p>
</td></tr>
</table>`;

  // One row per competencia: the name, then its score on its own line (long names wrap on a phone).
  const resumen = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;background:${c.lienzo};border-radius:12px;">
${m.resumen
  .map(
    (fila, i) => `<tr><td style="padding:${i === 0 ? "16px" : "6px"} 16px ${i === m.resumen.length - 1 ? "16px" : "6px"} 16px;">
<p style="margin:0;font-size:15px;line-height:1.4;font-weight:600;color:${c.tinta};">${escaparHtml(fila.nombre)}</p>
<p style="margin:2px 0 0 0;font-size:15px;line-height:1.4;color:${fila.evaluada ? c.tinta : c.tinta2};">${escaparHtml(fila.linea)}</p>
</td></tr>`,
  )
  .join("\n")}
</table>`;

  // The scale: one row per level, the level on the left and its range on the right (short enough for a phone).
  const escala = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;background:${c.lienzo};border-radius:12px;">
<tr><td colspan="2" style="padding:16px 16px 6px 16px;"><p style="margin:0;font-size:14px;line-height:1.43;color:${c.tinta2};">${escaparHtml(m.escala.introduccion)}</p></td></tr>
${m.escala.filas
  .map(
    (fila, i) => `<tr><td style="padding:4px 8px ${i === m.escala.filas.length - 1 ? "16px" : "4px"} 16px;font-size:15px;line-height:1.4;font-weight:600;color:${c.tinta};">${escaparHtml(fila.nivel)}</td><td align="right" style="padding:4px 16px ${i === m.escala.filas.length - 1 ? "16px" : "4px"} 8px;font-size:15px;line-height:1.4;color:${c.tinta};">${escaparHtml(fila.rango)}</td></tr>`,
  )
  .join("\n")}
</table>`;

  const bloqueIndicador = (i: IndicadorTexto) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 12px 0;background:${c.lienzo};border-radius:12px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 6px 0;font-size:15px;line-height:1.4;font-weight:600;color:${c.tinta};">${escaparHtml(i.titulo)}</p>
<p style="margin:0;font-size:15px;line-height:1.4;color:${c.tinta};">${escaparHtml(i.puntaje)}</p>
<p style="margin:2px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(i.brecha)}</p>
${i.siguiente ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.43;color:${c.tinta};">${escaparHtml(i.siguiente)}</p>` : ""}
</td></tr>
</table>`;

  const detalleHtml = m.detalle
    .map(
      (d) => `<h3 style="margin:24px 0 8px 0;font-size:17px;line-height:1.3;font-weight:600;color:${c.tinta};">${escaparHtml(d.nombre)}</h3>
<p style="margin:0;font-size:15px;line-height:1.4;color:${c.tinta};">${escaparHtml(d.puntaje)}</p>
<p style="margin:2px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(d.brecha)}</p>
<p style="margin:2px 0 12px 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(d.evaluaciones)}</p>
${d.indicadores.map(bloqueIndicador).join("\n")}`,
    )
    .join("\n");

  const contenido = [
    parrafo(escaparHtml(m.saludo)),
    parrafo(escaparHtml(m.introduccion)),
    destacado,
    parrafo(escaparHtml(m.evaluaciones)),
    h2(m.escala.titulo),
    escala,
    h2(m.resumenTitulo),
    resumen,
    h2(m.detalleTitulo),
    detalleHtml,
    parrafo(escaparHtml(m.cierre), "margin-top:16px;"),
    parrafo(escaparHtml(m.cierreGeneral)),
    parrafo(escaparHtml(t.adjunto)),
    parrafo(escaparHtml(t.dudas), `margin-bottom:0;font-size:14px;color:${c.tinta2};`),
  ].join("\n");

  const texto = [
    m.titulo,
    "",
    m.saludo,
    "",
    m.introduccion,
    "",
    `${g.etiqueta}: ${g.nivel}`,
    g.promedio,
    g.brecha,
    g.cobertura,
    "",
    m.evaluaciones,
    "",
    m.escala.titulo,
    m.escala.introduccion,
    ...m.escala.filas.map((fila) => `- ${fila.nivel}: ${fila.rango}`),
    "",
    m.resumenTitulo,
    ...m.resumen.map((fila) => `- ${fila.nombre}: ${fila.linea}`),
    "",
    m.detalleTitulo,
    ...m.detalle.flatMap((d) => [
      "",
      d.nombre.toUpperCase(),
      d.puntaje,
      d.brecha,
      d.evaluaciones,
      ...d.indicadores.flatMap((i) => ["", i.titulo, i.puntaje, i.brecha, ...(i.siguiente ? [i.siguiente] : [])]),
    ]),
    "",
    m.cierre,
    m.cierreGeneral,
    t.adjunto,
    t.dudas,
    "",
    PIE_TEXTO,
    "",
  ].join("\n");

  return {
    asunto: prueba ? t.asuntoPrueba : t.asunto,
    html: documentoCorreo({ titulo: m.titulo, contenido }),
    texto,
  };
}
