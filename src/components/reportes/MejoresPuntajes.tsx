import Link from "next/link";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { IconoChevron } from "@/components/ui/iconos";
import { obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearPuntos, formatearEntero } from "@/lib/formato";
import type { CompetenciaConsolidada, Destacado, DestacadoConsolidado } from "@/lib/reportes";

// The top places of a report as cards (a 7-column table doesn't fit 375 px):
// "Los 5 puntajes más altos" on the Reporte general (PRD §11.2), with the
// indicator means, and "Los 5 promedios más altos" on the Reporte
// consolidado (§11.4, v1.12), with each competencia's puntaje general. Each
// card shows its score and nivel, one detail line and links to the
// participant's report. Tied scores share a position, so the <li value>
// carries it instead of the list's own count.

type Tarjeta = {
  id: string;
  etiqueta: string;
  posicion: number;
  puntaje: number;
  nivel: NivelValor;
  detalle: string;
  valores: readonly (number | null)[];
};

type Columna = { clave: string; etiqueta: string };

function TarjetasMejores({
  tarjetas,
  rutaBase,
  etiquetaPuntaje,
  columnas,
  claseColumnas,
}: {
  tarjetas: readonly Tarjeta[];
  /** "/reportes/adaptabilidad/" or "/reportes/consolidado/": the card links to rutaBase + id. */
  rutaBase: string;
  etiquetaPuntaje: string;
  columnas: readonly Columna[];
  claseColumnas: string;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {tarjetas.map((d) => {
        const nivel = obtenerNivel(d.nivel);
        return (
          <li key={d.id} value={d.posicion} className="fila-reporte rounded-tile bg-canvas px-3 py-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="w-7 shrink-0 text-center text-h3 font-semibold tabular-nums text-ink-3">
                {d.posicion}
              </span>
              <span className="sr-only">{TEXTOS_REPORTES.posicion(d.posicion)}</span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`${rutaBase}${d.id}`}
                  className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-body font-semibold text-link hover:underline"
                >
                  {d.etiqueta}
                  <IconoChevron className="shrink-0" />
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-caption text-ink-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`inline-block size-3 rounded-full ${FONDO_NIVEL[d.nivel]}`} />
                    {nivel.etiqueta}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{d.detalle}</span>
                </p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block text-h3 font-semibold tabular-nums">{formatearPuntos(d.puntaje)}</span>
                <span className="block text-caption text-ink-2">{etiquetaPuntaje}</span>
              </p>
            </div>
            <dl className={`mt-2 grid gap-2 pl-10 text-caption ${claseColumnas}`}>
              {columnas.map((columna, i) => {
                const valor = d.valores[i] ?? null;
                return (
                  <div key={columna.clave} className="min-w-0">
                    <dt className="text-ink-2">{columna.etiqueta}</dt>
                    <dd className="tabular-nums text-ink">{valor === null ? "—" : formatearPuntos(valor)}</dd>
                  </div>
                );
              })}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}

/** Reporte general: the top places by puntaje general, with the indicator means ("Ind. 1" … keyed by ClaveIndicadores). */
export function MejoresPuntajes({
  mejores,
  competenciaId,
  indicadores,
}: {
  mejores: readonly Destacado[];
  competenciaId: string;
  indicadores: readonly { numero: number }[];
}) {
  return (
    <TarjetasMejores
      rutaBase={`/reportes/${competenciaId}/`}
      etiquetaPuntaje={TEXTOS.reportes.puntajeGeneral}
      columnas={indicadores.map((i) => ({ clave: String(i.numero), etiqueta: TEXTOS_REPORTES.indicadorCorto(i.numero) }))}
      claseColumnas="grid-cols-4"
      tarjetas={mejores.map((d) => ({
        ...d,
        detalle: TEXTOS_REPORTES.evaluacionesCuenta(formatearEntero(d.evaluaciones)),
        valores: d.medias,
      }))}
    />
  );
}

/**
 * Reporte consolidado (v1.12): the top places by promedio entre competencias,
 * with the puntaje general in each competencia that has a rubric in the
 * jornada. Competencia names are long, so they wrap in 2 columns on a phone.
 */
export function MejoresConsolidado({
  mejores,
  competencias,
}: {
  mejores: readonly DestacadoConsolidado[];
  competencias: readonly CompetenciaConsolidada[];
}) {
  const t = TEXTOS_REPORTES.consolidado;
  const indices = competencias.flatMap((c, i) => (c.disponible ? [i] : []));
  const total = formatearEntero(indices.length);
  return (
    <TarjetasMejores
      rutaBase="/reportes/consolidado/"
      etiquetaPuntaje={t.promedio}
      columnas={indices.map((i) => ({ clave: competencias[i].id, etiqueta: competencias[i].nombre }))}
      claseColumnas="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      tarjetas={mejores.map((d) => ({
        ...d,
        detalle: t.competenciasEvaluadasCuenta(formatearEntero(d.competenciasEvaluadas), total),
        valores: indices.map((i) => d.puntajes[i] ?? null),
      }))}
    />
  );
}
