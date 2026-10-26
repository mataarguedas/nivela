"use client";

import Link from "next/link";
import { useState } from "react";
import { IconoChevron } from "@/components/ui/iconos";
import { obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero } from "@/lib/formato";

// "Tabla de participantes" (PRD §11.2): code, the indicator means, puntaje
// and nivel general, evaluations. Every column sorts (a <button> in the
// header, aria-sort on the <th>); participants without evaluations always
// sort last. The code links to the Reporte individual. Receives codes and
// numbers only, no names. Too wide for a phone, so its wrapper scrolls.

export type FilaTablaParticipantes = {
  id: string;
  etiqueta: string;
  href: string;
  medias: (number | null)[];
  puntaje: number | null;
  nivel: NivelValor | null;
  evaluaciones: number;
};

type Columna = "participante" | `indicador-${number}` | "puntaje" | "nivel" | "evaluaciones";
type Orden = { columna: Columna; direccion: "ascending" | "descending" };

const ORDEN_INICIAL: Orden = { columna: "puntaje", direccion: "descending" };

function valor(fila: FilaTablaParticipantes, columna: Columna): number | string | null {
  if (columna === "participante") return fila.id;
  if (columna === "puntaje") return fila.puntaje;
  if (columna === "nivel") return fila.nivel;
  if (columna === "evaluaciones") return fila.evaluaciones;
  return fila.medias[Number(columna.slice("indicador-".length))] ?? null;
}

function ordenar(filas: readonly FilaTablaParticipantes[], { columna, direccion }: Orden) {
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
  filas: FilaTablaParticipantes[];
  /** Full indicator titles, for the column headers' tooltips. */
  indicadores: { numero: number; titulo: string }[];
  etiquetadaPor: string;
};

export function TablaParticipantes({ filas, indicadores, etiquetadaPor }: Props) {
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const ordenadas = ordenar(filas, orden);

  const columnas: { id: Columna; titulo: string; detalle?: string; numerica: boolean }[] = [
    { id: "participante", titulo: TEXTOS_REPORTES.participante, numerica: false },
    ...indicadores.map((ind, i) => ({
      id: `indicador-${i}` as const,
      titulo: TEXTOS_REPORTES.indicadorCorto(ind.numero),
      detalle: `${TEXTOS.calificacion.indicador(ind.numero)}. ${ind.titulo}`,
      numerica: true,
    })),
    { id: "puntaje", titulo: TEXTOS.reportes.puntajeGeneral, numerica: true },
    { id: "nivel", titulo: TEXTOS.reportes.nivelGeneral, numerica: false },
    { id: "evaluaciones", titulo: TEXTOS_REPORTES.evaluaciones, numerica: true },
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
    <div role="region" aria-labelledby={etiquetadaPor} tabIndex={0} className="desplazable relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table aria-labelledby={etiquetadaPor} className="w-full min-w-[620px] border-separate border-spacing-0 text-[14px]">
        <thead>
          <tr>
            {columnas.map((c) => {
              const activa = orden.columna === c.id;
              return (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={activa ? orden.direccion : undefined}
                  title={c.detalle}
                  className={`p-0 font-semibold ${c.numerica ? "text-right" : "text-left"}`}
                >
                  {/* The name stays the column's name (it heads every cell for
                      screen readers); aria-sort on the <th> tells the order. */}
                  <button
                    type="button"
                    aria-label={c.detalle}
                    onClick={() => alternar(c.id)}
                    className={`inline-flex min-h-11 w-full cursor-pointer items-center gap-1 whitespace-nowrap px-2 text-caption hover:text-link ${c.numerica ? "justify-end" : "justify-start"} ${activa ? "text-link" : "text-ink-3"}`}
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
              <th scope="row" className="p-0 text-left font-normal">
                <Link
                  href={fila.href}
                  className="inline-flex min-h-11 items-center gap-1 rounded-pill px-2 whitespace-nowrap text-link hover:underline"
                >
                  {fila.etiqueta}
                  <IconoChevron className="shrink-0" />
                </Link>
              </th>
              {fila.medias.map((media, i) => (
                <td key={i} className="px-2 text-right tabular-nums">
                  {media === null ? "—" : formatearDecimal(media)}
                </td>
              ))}
              <td className="px-2 text-right font-semibold tabular-nums">
                {fila.puntaje === null ? "—" : formatearDecimal(fila.puntaje)}
              </td>
              <td className="px-2">{fila.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(fila.nivel).etiqueta}</td>
              <td className="px-2 text-right tabular-nums">{formatearEntero(fila.evaluaciones)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
