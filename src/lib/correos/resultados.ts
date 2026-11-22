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
  dudas: "Si tiene dudas sobre sus resultados, consulte con su docente. Este es un mensaje automático; no lo responda.",
} as const;

type IndicadorTexto = { titulo: string; puntaje: string; brecha: string; siguiente: string | null };

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

export function resultados(datos: DatosResultados, { prueba = false }: { prueba?: boolean } = {}): PlantillaCorreo {
  const t = TEXTOS_RESULTADOS;
  const c = COLORES_CORREO;
  const nivel = obtenerNivel(datos.nivel).etiqueta;
  const promedio = t.promedio(formatearPuntos(datos.promedio));
  const brecha = textoBrecha(datos.brecha);
  const cobertura = t.competenciasEvaluadas(datos.competenciasEvaluadas, datos.competenciasDisponibles);
  const evaluadas = datos.competencias.flatMap((comp) => (comp.resultado ? [{ ...comp, resultado: comp.resultado }] : []));

  const h2 = (texto: string) =>
    `<h2 style="margin:24px 0 12px 0;font-size:19px;line-height:1.25;font-weight:600;color:${c.tinta};">${escaparHtml(texto)}</h2>`;

  const destacado = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;background:${c.lienzo};border-radius:12px;">
<tr><td align="center" style="padding:20px 16px;">
<p style="margin:0;font-size:12px;line-height:1.33;color:${c.tinta2};">${escaparHtml(t.resultadoGeneral)}</p>
<p style="margin:4px 0 0 0;font-size:32px;line-height:1.1;font-weight:600;color:${c.tinta};">${escaparHtml(nivel)}</p>
<p style="margin:8px 0 0 0;font-size:17px;line-height:1.47;color:${c.tinta};">${escaparHtml(promedio)}</p>
<p style="margin:4px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(brecha)}</p>
<p style="margin:4px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(cobertura)}</p>
</td></tr>
</table>`;

  // One row per competencia: the name, then its score on its own line (long names wrap on a phone).
  const resumen = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;background:${c.lienzo};border-radius:12px;">
${datos.competencias
  .map(
    (comp, i) => `<tr><td style="padding:${i === 0 ? "16px" : "6px"} 16px ${i === datos.competencias.length - 1 ? "16px" : "6px"} 16px;">
<p style="margin:0;font-size:15px;line-height:1.4;font-weight:600;color:${c.tinta};">${escaparHtml(comp.nombre)}</p>
<p style="margin:2px 0 0 0;font-size:15px;line-height:1.4;color:${comp.resultado ? c.tinta : c.tinta2};">${escaparHtml(lineaResumen(comp))}</p>
</td></tr>`,
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

  const detalle = evaluadas.map((comp) => {
    const r = comp.resultado;
    return {
      nombre: comp.nombre,
      puntaje: t.puntajeGeneral(formatearPuntos(r.puntaje), obtenerNivel(r.nivel).etiqueta),
      brecha: textoBrecha(r.brecha),
      evaluaciones: t.evaluacionesCompetencia(r.evaluaciones),
      indicadores: r.indicadores.map(textosIndicador),
    };
  });

  const detalleHtml = detalle
    .map(
      (d) => `<h3 style="margin:24px 0 8px 0;font-size:17px;line-height:1.3;font-weight:600;color:${c.tinta};">${escaparHtml(d.nombre)}</h3>
<p style="margin:0;font-size:15px;line-height:1.4;color:${c.tinta};">${escaparHtml(d.puntaje)}</p>
<p style="margin:2px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(d.brecha)}</p>
<p style="margin:2px 0 12px 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(d.evaluaciones)}</p>
${d.indicadores.map(bloqueIndicador).join("\n")}`,
    )
    .join("\n");

  const contenido = [
    parrafo(escaparHtml(t.saludo(datos.nombre))),
    parrafo(escaparHtml(t.introduccion(datos.jornada))),
    destacado,
    parrafo(escaparHtml(t.evaluaciones(datos.evaluaciones))),
    h2(t.resumen),
    resumen,
    h2(t.detalle),
    detalleHtml,
    parrafo(escaparHtml(t.cierre), "margin-top:16px;"),
    parrafo(escaparHtml(t.cierreGeneral)),
    parrafo(escaparHtml(t.dudas), `margin-bottom:0;font-size:14px;color:${c.tinta2};`),
  ].join("\n");

  const texto = [
    t.titulo,
    "",
    t.saludo(datos.nombre),
    "",
    t.introduccion(datos.jornada),
    "",
    `${t.resultadoGeneral}: ${nivel}`,
    promedio,
    brecha,
    cobertura,
    "",
    t.evaluaciones(datos.evaluaciones),
    "",
    t.resumen,
    ...datos.competencias.map((comp) => `- ${comp.nombre}: ${lineaResumen(comp)}`),
    "",
    t.detalle,
    ...detalle.flatMap((d) => [
      "",
      d.nombre.toUpperCase(),
      d.puntaje,
      d.brecha,
      d.evaluaciones,
      ...d.indicadores.flatMap((i) => ["", i.titulo, i.puntaje, i.brecha, ...(i.siguiente ? [i.siguiente] : [])]),
    ]),
    "",
    t.cierre,
    t.cierreGeneral,
    t.dudas,
    "",
    PIE_TEXTO,
    "",
  ].join("\n");

  return {
    asunto: prueba ? t.asuntoPrueba : t.asunto,
    html: documentoCorreo({ titulo: t.titulo, contenido }),
    texto,
  };
}
