import type { ReactNode } from "react";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { NIVELES } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";

// Server-rendered frame shared by every report block: a titled section on a
// white tile (sections are separated by the canvas tint, never by borders or
// shadows), and for charts a <figure> whose drawing is aria-hidden while a
// visually hidden table carries the same numbers for screen readers (PRD §13).

export function SeccionReporte({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="seccion-reporte rounded-tile bg-surface p-4 md:p-6">
      <h2 id={`${id}-titulo`} className="mb-4 text-sub font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

type FiguraGraficoProps = {
  /** id of the heading that names the figure. */
  etiquetadaPor: string;
  /** Reserved before the chart chunk loads, so nothing shifts. */
  alto: number;
  grafico: ReactNode;
  leyenda?: boolean;
  /** The text equivalent (a TablaEquivalente). */
  children: ReactNode;
};

export function FiguraGrafico({ etiquetadaPor, alto, grafico, leyenda = false, children }: FiguraGraficoProps) {
  return (
    <figure aria-labelledby={etiquetadaPor} className="grafico">
      <div aria-hidden="true" className="w-full" style={{ height: alto }}>
        {grafico}
      </div>
      {leyenda && <LeyendaNiveles />}
      {children}
    </figure>
  );
}

export function LeyendaNiveles() {
  return (
    <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-3">
      {NIVELES.map((n) => (
        <li key={n.valor} className="inline-flex items-center gap-1.5">
          <span className={`inline-block size-3 rounded-full ${FONDO_NIVEL[n.valor]}`} />
          {n.valor} · {n.etiqueta}
        </li>
      ))}
    </ul>
  );
}

/** Visually hidden table with a chart's values. */
export function TablaEquivalente({
  titulo,
  encabezados,
  filas,
}: {
  titulo: string;
  encabezados: readonly string[];
  filas: readonly (readonly string[])[];
}) {
  // sr-only goes on a wrapper: a <table> sizes to its content and ignores the
  // 1 px box, which would widen the page.
  return (
    <div className="sr-only">
      <table>
        <caption>{titulo}</caption>
        <thead>
          <tr>
            {encabezados.map((e) => (
              <th key={e} scope="col">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila[0]}>
              <th scope="row">{fila[0]}</th>
              {fila.slice(1).map((celda, i) => (
                <td key={i}>{celda}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** KPI tile: label above, large value, optional detail line. */
export function Kpi({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="kpi rounded-tile bg-surface p-4">
      <dt className="text-caption text-ink-2">{etiqueta}</dt>
      <dd className="mt-1 text-h3 font-semibold tabular-nums">{valor}</dd>
      {detalle && <dd className="mt-1 text-caption text-ink-3">{detalle}</dd>}
    </div>
  );
}

/** Full indicator titles under charts and tables that use "Ind. n". */
export function ClaveIndicadores({ indicadores }: { indicadores: readonly { numero: number; titulo: string }[] }) {
  return (
    <ul aria-hidden="true" className="mt-4 flex flex-col gap-1 text-caption text-ink-3">
      {indicadores.map((i) => (
        <li key={i.numero}>
          <span className="font-semibold text-ink">{TEXTOS_REPORTES.indicadorCorto(i.numero)}</span> {i.titulo}
        </li>
      ))}
    </ul>
  );
}
