"use client";

import Link from "next/link";
import { useState } from "react";
import { obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero } from "@/lib/formato";
import type { Brecha } from "@/lib/puntajes";
import { textoBrechaCorto } from "@/lib/textoBrecha";

// "Participantes en todas las competencias" (PRD §11.4): one row per
// participant (carnet only, never a name), one column per competencia with a
// rubric in the jornada (its puntaje general and nivel, linking to that
// competencia's Reporte individual), then how many competencias were
// evaluated, the promedio entre competencias, its nivel and its gap. Every
// column sorts like TablaParticipantes (a <button> in the header, aria-sort on
// the <th>); empty values always sort last. Too wide for a phone, so its
// wrapper scrolls.

export type CeldaTablaConsolidada = { puntaje: number | null; nivel: NivelValor | null; ausente: boolean };

export type FilaTablaConsolidada = {
  id: string;
  etiqueta: string;
  /** Aligned with `competencias`. */
  celdas: CeldaTablaConsolidada[];
  evaluadas: number;
  promedio: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
};

type Columna = "participante" | `competencia-${number}` | "evaluadas" | "promedio" | "nivel" | "brecha";
type Orden = { columna: Columna; direccion: "ascending" | "descending" };

const ORDEN_INICIAL: Orden = { columna: "promedio", direccion: "descending" };

function valor(fila: FilaTablaConsolidada, columna: Columna): number | string | null {
  if (columna === "participante") return fila.id;
  if (columna === "evaluadas") return fila.evaluadas;
  if (columna === "promedio") return fila.promedio;
  if (columna === "nivel") return fila.nivel;
  // Experto has nothing left (0); without evaluations there is no gap (sorted last).
  if (columna === "brecha") return fila.brecha ? (fila.brecha.faltante ?? 0) : null;
  return fila.celdas[Number(columna.slice("competencia-".length))]?.puntaje ?? null;
}

function ordenar(filas: readonly FilaTablaConsolidada[], { columna, direccion }: Orden) {
  const signo = direccion === "ascending" ? 1 : -1;
  return [...filas].sort((a, b) => {
    const va = valor(a, columna);
    const vb = valor(b, columna);
    if (va === null || vb === null) {
      if (va !== vb) return va === null ? 1 : -1;
    } else {
      const diferencia = typeof va === "string" ? va.localeCompare(String(vb)) : va - Number(vb);
      if (diferencia !== 0) return signo * diferencia;
    }
    return a.id.localeCompare(b.id);
  });
}

type Props = {
  /** The competencias with a rubric in the jornada, in config order. */
  competencias: { id: string; nombre: string }[];
  filas: FilaTablaConsolidada[];
  etiquetadaPor: string;
};

function Celda({
  celda,
  href,
  etiqueta,
}: {
  celda: CeldaTablaConsolidada;
  href: string;
  etiqueta: string;
}) {
  if (celda.puntaje === null || celda.nivel === null) {
    return <span className="text-ink-2">{celda.ausente ? TEXTOS_REPORTES.ausente : "—"}</span>;
  }
  return (
    <Link
      href={href}
      aria-label={`${formatearDecimal(celda.puntaje)} · ${obtenerNivel(celda.nivel).etiqueta}. ${etiqueta}`}
      className="inline-flex min-h-11 flex-col items-end justify-center rounded-pill px-2 text-link hover:underline"
    >
      <span className="font-semibold tabular-nums">{formatearDecimal(celda.puntaje)}</span>
      <span className="text-caption text-ink-3">{obtenerNivel(celda.nivel).etiqueta}</span>
    </Link>
  );
}

export function TablaConsolidada({ competencias, filas, etiquetadaPor }: Props) {
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const ordenadas = ordenar(filas, orden);
  const t = TEXTOS_REPORTES.consolidado;
  const total = formatearEntero(competencias.length);

  const columnas: { id: Columna; titulo: string; numerica: boolean; ancha?: boolean }[] = [
    { id: "participante", titulo: TEXTOS_REPORTES.participante, numerica: false },
    ...competencias.map((c, i) => ({ id: `competencia-${i}` as const, titulo: c.nombre, numerica: true, ancha: true })),
    { id: "evaluadas", titulo: t.evaluadas, numerica: true, ancha: true },
    { id: "promedio", titulo: t.promedio, numerica: true },
    { id: "nivel", titulo: TEXTOS_REPORTES.nivel, numerica: false },
    { id: "brecha", titulo: TEXTOS_REPORTES.paraSiguienteNivel, numerica: true },
  ];

  function alternar(columna: Columna) {
    setOrden((actual) =>
      actual.columna === columna
        ? { columna, direccion: actual.direccion === "ascending" ? "descending" : "ascending" }
        : // Text columns start A→Z; numbers start with the highest.
          { columna, direccion: columna === "participante" ? "ascending" : "descending" },
    );
  }

  return (
    <div
      role="region"
      aria-labelledby={etiquetadaPor}
      tabIndex={0}
      className="desplazable relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <table
        aria-labelledby={etiquetadaPor}
        className="w-full border-separate border-spacing-0 text-[14px]"
        style={{ minWidth: `${36 + competencias.length * 8}rem` }}
      >
        <thead>
          <tr>
            {columnas.map((c) => {
              const activa = orden.columna === c.id;
              return (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={activa ? orden.direccion : undefined}
                  className={`p-0 align-bottom font-semibold ${c.numerica ? "text-right" : "text-left"}`}
                >
                  <button
                    type="button"
                    onClick={() => alternar(c.id)}
                    className={`inline-flex min-h-11 w-full cursor-pointer items-center gap-1 px-2 text-caption hover:text-link ${c.ancha ? "whitespace-normal" : "whitespace-nowrap"} ${c.numerica ? "justify-end text-right" : "justify-start text-left"} ${activa ? "text-link" : "text-ink-3"}`}
                  >
                    <span>{c.titulo}</span>
                    <span aria-hidden="true" className={`text-[10px] ${activa ? "" : "invisible"}`}>
                      {activa && orden.direccion === "ascending" ? "▲" : "▼"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((fila) => (
            <tr key={fila.id} className="even:bg-canvas">
              <th scope="row" className="px-2 text-left font-normal whitespace-nowrap">
                {fila.etiqueta}
              </th>
              {fila.celdas.map((celda, i) => (
                <td key={competencias[i].id} className="px-0 text-right">
                  <Celda
                    celda={celda}
                    href={`/reportes/${competencias[i].id}/${fila.id}`}
                    etiqueta={t.verIndividual(fila.etiqueta, competencias[i].nombre)}
                  />
                </td>
              ))}
              <td className="px-2 text-right tabular-nums">{TEXTOS_REPORTES.deTotal(formatearEntero(fila.evaluadas), total)}</td>
              <td className="px-2 text-right font-semibold tabular-nums">
                {fila.promedio === null ? "—" : formatearDecimal(fila.promedio)}
              </td>
              <td className="px-2">{fila.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(fila.nivel).etiqueta}</td>
              <td className="px-2 text-right whitespace-nowrap tabular-nums">
                {fila.brecha ? textoBrechaCorto(fila.brecha) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
