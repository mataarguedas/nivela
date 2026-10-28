import Link from "next/link";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { IconoChevron } from "@/components/ui/iconos";
import { obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero } from "@/lib/formato";
import type { Destacado } from "@/lib/reportes";

// "Los 5 puntajes más altos" on the Reporte general: the top places of the
// ranking as cards (a 7-column table doesn't fit 375 px), each with its
// puntaje and nivel general, evaluations received and the indicator means,
// linking to its Reporte individual. Tied scores share a position, so the
// <li value> carries it instead of the list's own count.

type Props = {
  mejores: readonly Destacado[];
  competenciaId: string;
  indicadores: readonly { numero: number }[];
};

export function MejoresPuntajes({ mejores, competenciaId, indicadores }: Props) {
  return (
    <ol className="flex flex-col gap-2">
      {mejores.map((d) => {
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
                  href={`/reportes/${competenciaId}/${d.id}`}
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
                  <span>{TEXTOS_REPORTES.evaluacionesCuenta(formatearEntero(d.evaluaciones))}</span>
                </p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block text-h3 font-semibold tabular-nums">{formatearDecimal(d.puntaje)}</span>
                <span className="block text-caption text-ink-2">{TEXTOS.reportes.puntajeGeneral}</span>
              </p>
            </div>
            <dl className="mt-2 grid grid-cols-4 gap-2 pl-10 text-caption">
              {indicadores.map((indicador, i) => {
                const media = d.medias[i] ?? null;
                return (
                  <div key={indicador.numero}>
                    <dt className="text-ink-2">{TEXTOS_REPORTES.indicadorCorto(indicador.numero)}</dt>
                    <dd className="tabular-nums text-ink">{media === null ? "—" : formatearDecimal(media)}</dd>
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
