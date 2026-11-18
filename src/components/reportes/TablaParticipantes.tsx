"use client";

import Link from "next/link";
import { useState } from "react";
import { IconoChevron } from "@/components/ui/iconos";
import { obtenerNivel, type NivelValor } from "@/config/niveles";
import type { Asistencia, Brecha } from "@/lib/puntajes";
import { textoBrechaCorto } from "@/lib/textoBrecha";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ENVIO, TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearPuntos, formatearEntero } from "@/lib/formato";

// "Tabla de participantes" (PRD §11.2): code, the indicator means, puntaje
// and nivel general, the gap to the next level, evaluations and attendance ("Ausente" / "Asistencia en
// conflicto" with the counts, PRD §5.13) and the results email status
// ("Correo": Enviado / Error / Pendiente, §5.14). Every column sorts (a <button> in the
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
  asistencia: Asistencia | null;
  marcasAusente: number;
  /** Gap from the puntaje general to the next level (PRD §7); null without evaluations. */
  brecha: Brecha | null;
  /** Latest results email (PRD §5.14): its outcome, "pendiente" without one, null if unknown (read failed). */
  correo: EstadoCorreo | null;
};

export type EstadoCorreo = "enviado" | "error" | "pendiente";

type Columna =
  | "participante"
  | `indicador-${number}`
  | "puntaje"
  | "nivel"
  | "brecha"
  | "evaluaciones"
  | "asistencia"
  | "correo";

// Sorting "Correo" descending lists errors first, then sent, then pending.
const ORDEN_CORREO: Record<EstadoCorreo, number> = { error: 3, enviado: 2, pendiente: 1 };

// Sorting "Asistencia" descending lists the absent first, then the conflicts.
const ORDEN_ASISTENCIA: Record<Asistencia, number> = { ausente: 2, conflicto: 1 };
type Orden = { columna: Columna; direccion: "ascending" | "descending" };

const ORDEN_INICIAL: Orden = { columna: "puntaje", direccion: "descending" };

function valor(fila: FilaTablaParticipantes, columna: Columna): number | string | null {
  if (columna === "participante") return fila.id;
  if (columna === "puntaje") return fila.puntaje;
  if (columna === "nivel") return fila.nivel;
  if (columna === "evaluaciones") return fila.evaluaciones;
  // Experto has nothing left (0); without evaluations there is no gap (sorted last).
  if (columna === "brecha") return fila.brecha ? (fila.brecha.faltante ?? 0) : null;
  if (columna === "asistencia") return fila.asistencia ? ORDEN_ASISTENCIA[fila.asistencia] : null;
  if (columna === "correo") return fila.correo ? ORDEN_CORREO[fila.correo] : null;
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

function CeldaAsistencia({ fila }: { fila: FilaTablaParticipantes }) {
  if (!fila.asistencia) return <span className="text-ink-2">—</span>;
  const marcas = formatearEntero(fila.marcasAusente);
  const titulo = fila.asistencia === "ausente" ? TEXTOS_REPORTES.ausente : TEXTOS_REPORTES.asistenciaConflicto;
  const detalle =
    fila.asistencia === "ausente"
      ? TEXTOS_REPORTES.marcadoAusentePor(marcas)
      : TEXTOS_REPORTES.conflictoDetalle(marcas, formatearEntero(fila.evaluaciones));
  return (
    <span className="block min-w-40 py-1.5">
      <span className="block font-semibold text-ink">{titulo}</span>
      <span className="block text-caption text-ink-2">{detalle}</span>
    </span>
  );
}

export function TablaParticipantes({ filas, indicadores, etiquetadaPor }: Props) {
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const ordenadas = ordenar(filas, orden);

  const columnas: { id: Columna; titulo: string; detalle?: string; complemento?: string; numerica: boolean }[] = [
    { id: "participante", titulo: TEXTOS_REPORTES.participante, numerica: false },
    ...indicadores.map((ind, i) => ({
      id: `indicador-${i}` as const,
      titulo: TEXTOS_REPORTES.indicadorCorto(ind.numero),
      detalle: `${TEXTOS.calificacion.indicador(ind.numero)}. ${ind.titulo}`,
      // Read after the visible "Ind. n" so the button's name starts with
      // its visible label (WCAG 2.5.3 Label in Name).
      complemento: `: ${ind.titulo}`,
      numerica: true,
    })),
    { id: "puntaje", titulo: TEXTOS.reportes.puntajeGeneral, numerica: true },
    { id: "nivel", titulo: TEXTOS.reportes.nivelGeneral, numerica: false },
    { id: "brecha", titulo: TEXTOS_REPORTES.paraSiguienteNivel, numerica: true },
    { id: "evaluaciones", titulo: TEXTOS_REPORTES.evaluaciones, numerica: true },
    { id: "asistencia", titulo: TEXTOS_REPORTES.asistencia, numerica: false },
    { id: "correo", titulo: TEXTOS_ENVIO.columna, numerica: false },
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
      <table aria-labelledby={etiquetadaPor} className="w-full min-w-[1000px] border-separate border-spacing-0 text-[14px]">
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
                    onClick={() => alternar(c.id)}
                    className={`inline-flex min-h-11 w-full cursor-pointer items-center gap-1 whitespace-nowrap px-2 text-caption hover:text-link ${c.numerica ? "justify-end" : "justify-start"} ${activa ? "text-link" : "text-ink-3"}`}
                  >
                    <span>{c.titulo}</span>
                    {c.complemento && <span className="sr-only">{c.complemento}</span>}
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
                  {media === null ? "—" : formatearPuntos(media)}
                </td>
              ))}
              <td className="px-2 text-right font-semibold tabular-nums">
                {fila.puntaje === null ? "—" : formatearPuntos(fila.puntaje)}
              </td>
              <td className="px-2">{fila.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(fila.nivel).etiqueta}</td>
              <td className="px-2 text-right whitespace-nowrap tabular-nums">
                {fila.brecha ? textoBrechaCorto(fila.brecha) : "—"}
              </td>
              <td className="px-2 text-right tabular-nums">{formatearEntero(fila.evaluaciones)}</td>
              <td className="px-2">
                <CeldaAsistencia fila={fila} />
              </td>
              <td className={`px-2 whitespace-nowrap ${fila.correo === "enviado" ? "text-link" : fila.correo === "error" ? "font-semibold text-ink" : "text-ink-2"}`}>
                {fila.correo ? TEXTOS_ENVIO.estados[fila.correo] : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
