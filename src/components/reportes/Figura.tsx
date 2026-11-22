import type { ReactNode } from "react";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { NIVELES } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { RANGOS_PUNTOS } from "@/lib/puntajes";

// Server-rendered frame shared by every report block: a titled section on a
// white tile (sections are separated by the canvas tint, never by borders or
// shadows), and for charts a <figure> whose drawing is aria-hidden while a
// visually hidden table carries the same numbers for screen readers (PRD §13).

export function SeccionReporte({
  id,
  titulo,
  mensaje,
  children,
}: {
  id: string;
  titulo: string;
  /**
   * A simple chart's message (PRD §11 v1.2), e.g. "La mayoría de los
   * participantes está en nivel Avanzado (12 de 20)". It reads as the title;
   * the heading above it keeps the chart's stable name. Its id is `{id}-mensaje`.
   */
  mensaje?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="seccion-reporte rounded-tile bg-surface p-4 md:p-6">
      {mensaje === undefined ? (
        <h2 id={`${id}-titulo`} className="mb-4 text-sub font-semibold">
          {titulo}
        </h2>
      ) : (
        <>
          <h2 id={`${id}-titulo`} className="text-caption font-semibold text-ink-2">
            {titulo}
          </h2>
          <p id={`${id}-mensaje`} className="mt-1 mb-4 text-sub font-semibold text-balance">
            {mensaje}
          </p>
        </>
      )}
      {children}
    </section>
  );
}

/** A titled block inside "Ver gráficos detallados" (a sub-heading, not a section). */
export function BloqueDetallado({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 id={`${id}-titulo`} className="mb-3 text-body font-semibold">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

type FiguraGraficoProps = {
  /** id(s) of the heading (and message) that name the figure. */
  etiquetadaPor: string;
  /** Reserved before a client chart chunk loads, so nothing shifts. Omit for server-drawn charts. */
  alto?: number;
  grafico: ReactNode;
  leyenda?: boolean;
  /** The text equivalent (a TablaEquivalente). */
  children: ReactNode;
};

export function FiguraGrafico({ etiquetadaPor, alto, grafico, leyenda = false, children }: FiguraGraficoProps) {
  return (
    <figure aria-labelledby={etiquetadaPor} className="grafico">
      <div aria-hidden="true" className="w-full" style={alto === undefined ? undefined : { height: alto }}>
        {grafico}
      </div>
      {leyenda && <LeyendaNiveles />}
      {children}
    </figure>
  );
}

/** Level colors. With `puntos`, each level shows its band of points (score cells); otherwise its value 1–4 (level counts). */
export function LeyendaNiveles({ puntos = false }: { puntos?: boolean }) {
  return (
    <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-3">
      {NIVELES.map((n) => (
        <li key={n.valor} className="inline-flex items-center gap-1.5">
          <span className={`inline-block size-3 rounded-full ${FONDO_NIVEL[n.valor]}`} />
          {puntos
            ? TEXTOS_REPORTES.bandaNivel(n.etiqueta, RANGOS_PUNTOS[n.valor].min, RANGOS_PUNTOS[n.valor].max)
            : `${n.valor} · ${n.etiqueta}`}
        </li>
      ))}
    </ul>
  );
}

/** "Puntajes de 0 a 100: Básico 0–25, …" under a report's KPI tiles (PRD §7). */
export function EscalaPuntos() {
  const bandas = NIVELES.map((n) => TEXTOS_REPORTES.bandaNivel(n.etiqueta, RANGOS_PUNTOS[n.valor].min, RANGOS_PUNTOS[n.valor].max));
  return <p className="text-caption text-ink-2">{TEXTOS_REPORTES.escalaPuntos(bandas.join(" · "))}</p>;
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
          {/* Rows never reorder; the first cell can repeat (two participants with one name). */}
          {filas.map((fila, i) => (
            <tr key={i}>
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
