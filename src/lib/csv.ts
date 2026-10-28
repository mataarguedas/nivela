// CSV export of the raw rows (PRD §10, FR-13). RFC 4180: comma delimiter,
// CRLF line endings, fields quoted when they hold a comma, a quote or a line
// break. UTF-8 with a BOM so Excel decodes the accents. With es-CR regional
// settings Excel expects ";" and opens this file in one column when
// double-clicked; use Datos → Desde texto/CSV there (a deliberate choice: the
// standard format works everywhere else unchanged).
//
// Unlike the report, the export keeps every row in the DB: an evaluador id
// that is no longer in config is written as the id, with an empty curso, and
// participants the admin has hidden still appear with their name.

import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { esNivelValor, obtenerNivel } from "@/config/niveles";
import type { Participante } from "@/config/participantes";
import { formatearFechaHora } from "@/lib/formato";
import { redondear2 } from "@/lib/puntajes";
import type { FilaReporte } from "@/lib/reportes";

export const BOM = "﻿";

export const COLUMNAS_CSV = [
  "competencia",
  "evaluador",
  "curso_evaluador",
  "participante",
  "nombre_participante",
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
 * `participantes`: every stored participant, hidden ones included, so their
 * rows keep the name; an unnamed or unknown participant gets an empty name.
 */
export function generarCsv(
  competencia: Competencia,
  equipo: Equipo,
  filas: readonly FilaReporte[],
  participantes: readonly Pick<Participante, "id" | "nombre">[],
): string {
  const integrantes = new Map(equipo.integrantes.map((i) => [i.id, i]));
  const numeros = new Map(competencia.indicadores.map((i) => [i.id, i.numero]));
  const nombres = new Map(participantes.map((p) => [p.id, p.nombre]));

  const lineas = filas.map((f) => {
    const integrante = integrantes.get(f.evaluadorId);
    return [
      competencia.nombre,
      integrante?.nombre ?? f.evaluadorId,
      integrante?.curso ?? "",
      f.participanteId,
      nombres.get(f.participanteId) ?? null,
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
