// CSV export of the raw rows (PRD §10, FR-13). RFC 4180: comma delimiter,
// CRLF line endings, fields quoted when they hold a comma, a quote or a line
// break. UTF-8 with a BOM so Excel decodes the accents. With es-CR regional
// settings Excel expects ";" and opens this file in one column when
// double-clicked; use Datos → Desde texto/CSV there (a deliberate choice: the
// standard format works everywhere else unchanged).
//
// Unlike the report, the export keeps every row in the DB: an evaluador id
// that is no longer in config is written as the id, with an empty curso, and
// participants the admin has hidden still appear with their carnet. Like the
// reports, the CSV identifies participants by carnet, never by name (PRD §10).

import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { nombreJornada, type JornadaId } from "@/config/jornadas";
import { esNivelValor, obtenerNivel } from "@/config/niveles";
import { formatearCarnet, type Participante } from "@/config/participantes";
import { formatearFechaHora } from "@/lib/formato";
import { redondear2, redondearPuntos } from "@/lib/puntajes";
import type { FilaReporte, ReporteConsolidado } from "@/lib/reportes";

export const BOM = "﻿";

export const COLUMNAS_CSV = [
  "jornada",
  "competencia",
  "evaluador",
  "curso_evaluador",
  "participante",
  "carnet",
  "indicador",
  "nivel",
  "nivel_nombre",
  "origen",
  "ia_nivel_sugerido",
  "ia_confianza",
  "observacion",
  "actualizado",
] as const;

// A cell starting with one of these is run as a formula by Excel and Sheets
// ("CSV injection"). Observations are free text, so neutralise them.
const INICIO_FORMULA = /^[=+\-@\t\r]/;

export function celdaCsv(valor: string | number | null): string {
  if (valor === null) return "";
  let texto = String(valor);
  if (typeof valor === "string" && INICIO_FORMULA.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/**
 * `participantes`: every stored participant of the jornada, hidden ones
 * included, so their rows keep the carnet; a participant without one, or an
 * unknown one, gets an empty cell. `filas` are already that jornada's.
 */
export function generarCsv(
  jornada: JornadaId,
  competencia: Competencia,
  equipo: Equipo,
  filas: readonly FilaReporte[],
  participantes: readonly Pick<Participante, "id" | "carnet">[],
): string {
  const integrantes = new Map(equipo.integrantes.map((i) => [i.id, i]));
  const numeros = new Map(competencia.indicadores.map((i) => [i.id, i.numero]));
  const carnets = new Map(participantes.map((p) => [p.id, p.carnet ? formatearCarnet(p.carnet) : null]));

  const lineas = filas.map((f) => {
    const integrante = integrantes.get(f.evaluadorId);
    return [
      nombreJornada(jornada),
      competencia.nombre,
      integrante?.nombre ?? f.evaluadorId,
      integrante?.curso ?? "",
      f.participanteId,
      carnets.get(f.participanteId) ?? null,
      numeros.get(f.indicadorId) ?? f.indicadorId,
      f.nivel,
      esNivelValor(f.nivel) ? obtenerNivel(f.nivel).etiqueta : "",
      f.origen,
      f.iaNivelSugerido,
      f.iaConfianza === null ? null : redondear2(f.iaConfianza),
      f.observacion,
      formatearFechaHora(f.actualizadoEn),
    ]
      .map(celdaCsv)
      .join(",");
  });

  return BOM + [COLUMNAS_CSV.join(","), ...lineas].join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Reporte consolidado (PRD §10, §11.4)
// ---------------------------------------------------------------------------
//
// One row per active participant of the jornada, with each available
// competencia's puntaje general, nivel general and evaluations received side
// by side, then the promedio entre competencias. Unlike the per-competencia
// CSV this is the report's aggregate (the same figures the page shows), so it
// covers active participants only. Scores are whole points (0–100, PRD §7),
// like the reports. Never names, emails or attendance.

/** The fixed columns; each available competencia adds `{id}_puntaje`, `{id}_nivel`, `{id}_evaluaciones` after `carnet`. */
export const COLUMNAS_CSV_CONSOLIDADO = {
  inicio: ["jornada", "participante", "carnet"],
  porCompetencia: ["puntaje", "nivel", "evaluaciones"],
  fin: ["competencias_evaluadas", "promedio_competencias", "nivel_promedio"],
} as const;

const etiquetaNivelCsv = (nivel: number | null) => (nivel !== null && esNivelValor(nivel) ? obtenerNivel(nivel).etiqueta : null);
const puntajeCsv = (valor: number | null) => (valor === null ? null : redondearPuntos(valor));

export function generarCsvConsolidado(
  jornada: JornadaId,
  reporte: ReporteConsolidado,
  participantes: readonly Pick<Participante, "id" | "carnet">[],
): string {
  const carnets = new Map(participantes.map((p) => [p.id, p.carnet ? formatearCarnet(p.carnet) : null]));
  const indices = reporte.competencias.flatMap((c, i) => (c.disponible ? [i] : []));
  const encabezado = [
    ...COLUMNAS_CSV_CONSOLIDADO.inicio,
    ...indices.flatMap((i) => COLUMNAS_CSV_CONSOLIDADO.porCompetencia.map((c) => `${reporte.competencias[i].id}_${c}`)),
    ...COLUMNAS_CSV_CONSOLIDADO.fin,
  ];

  const lineas = reporte.participantes.map((p) =>
    [
      nombreJornada(jornada),
      p.id,
      carnets.get(p.id) ?? null,
      ...indices.flatMap((i) => {
        const celda = p.celdas[i];
        return [puntajeCsv(celda?.puntaje ?? null), etiquetaNivelCsv(celda?.nivel ?? null), celda?.evaluaciones ?? 0];
      }),
      p.competenciasEvaluadas,
      puntajeCsv(p.promedio),
      etiquetaNivelCsv(p.nivel),
    ]
      .map(celdaCsv)
      .join(","),
  );

  return BOM + [encabezado.map(celdaCsv).join(","), ...lineas].join("\r\n") + "\r\n";
}
