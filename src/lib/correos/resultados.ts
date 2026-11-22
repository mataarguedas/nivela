import { NIVELES, obtenerNivel } from "@/config/niveles";
import { RANGOS_PUNTOS } from "@/lib/puntajes";
import { formatearEntero, formatearPuntos } from "@/lib/formato";
import type { DatosResultados } from "@/lib/resultados";
import { textoBrecha } from "@/lib/textoBrecha";
import { COLORES_CORREO, documentoCorreo, escaparHtml, parrafo, PIE_TEXTO, type PlantillaCorreo } from "./plantilla";

// Personal results email (PRD §5.14, Appendix C "Envío de resultados"): one
// participant's own results, from DatosResultados (lib/resultados.ts), which
// carries only that participant's aggregates. It never contains evaluator
// names, individual ratings, observations, AI metadata or other participants.
// Indicators are stacked blocks rather than a multi-column table, so the
// email reads well on a phone. No button: there is nothing to open.

export const PLANTILLA_RESULTADOS = "resultados";

export const TEXTOS_RESULTADOS = {
  asunto: (competencia: string) => `Sus resultados de ${competencia} · Nivela`,
  /** "[Prueba]" marks the docente's test send (never sent to a participant). */
  asuntoPrueba: (competencia: string) => `[Prueba] Sus resultados de ${competencia} · Nivela`,
  titulo: (competencia: string) => `Sus resultados de ${competencia}`,
  saludo: (nombre: string | null) => (nombre ? `Hola, ${nombre}:` : "Hola:"),
  introduccion: (competencia: string, jornada: string) =>
    `Estos son sus resultados en la competencia ${competencia} (jornada ${jornada}).`,
  nivelGeneral: "Nivel general",
  puntajeGeneral: (puntaje: string) => `Puntaje general: ${puntaje} de 100`,
  evaluaciones: (n: number) =>
    n === 1 ? "Recibió 1 evaluación de sus pares." : `Recibió ${formatearEntero(n)} evaluaciones de sus pares.`,
  porIndicador: "Resultados por indicador",
  indicador: (numero: number, titulo: string) => `Indicador ${numero}. ${titulo}`,
  promedio: (media: string, nivel: string) => `Puntaje: ${media} de 100 · ${nivel}`,
  paraLlegar: (nivel: string, descripcion: string) => `Para llegar a ${nivel}: ${descripcion}`,
  // "Básico de 0 a 25, Intermedio de 26 a 50, Avanzado de 51 a 75 y Experto de 76 a 100", from the bands in puntajes.ts.
  cierre: `Estos resultados son el promedio de las evaluaciones que hicieron sus pares, en una escala de 0 a 100: ${NIVELES.map(
    (n) => `${n.etiqueta} de ${RANGOS_PUNTOS[n.valor].min} a ${RANGOS_PUNTOS[n.valor].max}`,
  )
    .join(", ")
    .replace(/, (?=[^,]*$)/, " y ")}.`,
  dudas: "Si tiene dudas sobre sus resultados, consulte con su docente. Este es un mensaje automático; no lo responda.",
} as const;

export function resultados(datos: DatosResultados, { prueba = false }: { prueba?: boolean } = {}): PlantillaCorreo {
  const t = TEXTOS_RESULTADOS;
  const c = COLORES_CORREO;
  const nivel = obtenerNivel(datos.nivelGeneral).etiqueta;
  const puntaje = t.puntajeGeneral(formatearPuntos(datos.puntajeGeneral));
  const brecha = textoBrecha(datos.brecha);

  const indicadores = datos.indicadores.map((i) => {
    const siguiente = i.brecha.siguiente && i.descripcionSiguiente ? t.paraLlegar(obtenerNivel(i.brecha.siguiente).etiqueta, i.descripcionSiguiente) : null;
    return {
      titulo: t.indicador(i.numero, i.titulo),
      promedio: t.promedio(formatearPuntos(i.media), obtenerNivel(i.nivel).etiqueta),
      brecha: textoBrecha(i.brecha),
      siguiente,
    };
  });

  const destacado = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;background:${c.lienzo};border-radius:12px;">
<tr><td align="center" style="padding:20px 16px;">
<p style="margin:0;font-size:12px;line-height:1.33;color:${c.tinta2};">${escaparHtml(t.nivelGeneral)}</p>
<p style="margin:4px 0 0 0;font-size:32px;line-height:1.1;font-weight:600;color:${c.tinta};">${escaparHtml(nivel)}</p>
<p style="margin:8px 0 0 0;font-size:17px;line-height:1.47;color:${c.tinta};">${escaparHtml(puntaje)}</p>
<p style="margin:4px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(brecha)}</p>
</td></tr>
</table>`;

  const bloques = indicadores
    .map(
      (i) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 12px 0;background:${c.lienzo};border-radius:12px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 6px 0;font-size:15px;line-height:1.4;font-weight:600;color:${c.tinta};">${escaparHtml(i.titulo)}</p>
<p style="margin:0;font-size:15px;line-height:1.4;color:${c.tinta};">${escaparHtml(i.promedio)}</p>
<p style="margin:2px 0 0 0;font-size:15px;line-height:1.4;color:${c.tinta2};">${escaparHtml(i.brecha)}</p>
${i.siguiente ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.43;color:${c.tinta};">${escaparHtml(i.siguiente)}</p>` : ""}
</td></tr>
</table>`,
    )
    .join("\n");

  const contenido = [
    parrafo(escaparHtml(t.saludo(datos.nombre))),
    parrafo(escaparHtml(t.introduccion(datos.competencia, datos.jornada))),
    destacado,
    parrafo(escaparHtml(t.evaluaciones(datos.evaluaciones))),
    `<h2 style="margin:24px 0 12px 0;font-size:19px;line-height:1.25;font-weight:600;color:${c.tinta};">${escaparHtml(t.porIndicador)}</h2>`,
    bloques,
    parrafo(escaparHtml(t.cierre), "margin-top:16px;"),
    parrafo(escaparHtml(t.dudas), `margin-bottom:0;font-size:14px;color:${c.tinta2};`),
  ].join("\n");

  const texto = [
    t.titulo(datos.competencia),
    "",
    t.saludo(datos.nombre),
    "",
    t.introduccion(datos.competencia, datos.jornada),
    "",
    `${t.nivelGeneral}: ${nivel}`,
    puntaje,
    brecha,
    "",
    t.evaluaciones(datos.evaluaciones),
    "",
    t.porIndicador,
    ...indicadores.flatMap((i) => ["", i.titulo, i.promedio, i.brecha, ...(i.siguiente ? [i.siguiente] : [])]),
    "",
    t.cierre,
    t.dudas,
    "",
    PIE_TEXTO,
    "",
  ].join("\n");

  return {
    asunto: prueba ? t.asuntoPrueba(datos.competencia) : t.asunto(datos.competencia),
    html: documentoCorreo({ titulo: t.titulo(datos.competencia), contenido }),
    texto,
  };
}
