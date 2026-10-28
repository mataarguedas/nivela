import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccionesReporte } from "@/components/reportes/AccionesReporte";
import { maximoConteo, puntosDistribucionParticipante, puntosRadar } from "@/components/reportes/datosGraficos";
import { ClaveIndicadores, FiguraGrafico, Kpi, SeccionReporte, TablaEquivalente } from "@/components/reportes/Figura";
import { DistribucionNiveles, RadarIndicadores } from "@/components/reportes/graficos";
import { Chip, type TonoChip } from "@/components/ui/Chip";
import { IconoChevron } from "@/components/ui/iconos";
import { NIVELES, obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero, formatearPorcentaje } from "@/lib/formato";
import type { Coincidencia } from "@/lib/puntajes";
import type { ReporteParticipante } from "@/lib/reportes";
import { cargarReporte } from "../../cargarReporte";
import { exigirDocente } from "../../exigirDocente";

// Reporte individual (PRD §11.1, FR-12): nivel general, the mean per
// indicator (radar), how many evaluators chose each level, agreement per
// indicator, and the observations with the evaluator's name (docente only:
// this page and its data are gated to that role).

// Not validated in dev; see the note in app/[competencia]/layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Reporte individual · Nivela",
  robots: { index: false, follow: false },
};

const ALTO_RADAR = 300;
const ALTO_FILA_DISTRIBUCION = 44;

const TONO_COINCIDENCIA: Record<Coincidencia, TonoChip> = { alta: "fuerte", media: "medio", baja: "suave" };

type Props = PageProps<"/reportes/[competencia]/[participante]">;

export default function PaginaReporteIndividual({ params }: Props) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <ReporteIndividual params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function ReporteIndividual({ params }: Pick<Props, "params">) {
  const { competencia: idCompetencia, participante: idParticipante } = await params;
  await exigirDocente(`/reportes/${idCompetencia}/${idParticipante}`);
  const { competencia, reporte } = await cargarReporte(idCompetencia, "/reportes/[competencia]/[participante]");

  // The report covers exactly the active participants (names from the DB).
  const lista = reporte?.participantes ?? [];
  const indice = lista.findIndex((p) => p.id === idParticipante);
  if (reporte && indice === -1) notFound();
  const datos = lista[indice] ?? null;
  const titulo = datos?.etiqueta ?? TEXTOS.reportes.individual;
  const rutaGeneral = `/reportes/${competencia.id}`;
  const anterior = lista[indice - 1];
  const siguiente = lista[indice + 1];

  return (
    <>
      <Link
        href={rutaGeneral}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline print:hidden"
      >
        <IconoChevron className="rotate-180" />
        {TEXTOS_REPORTES.volverGeneral}
      </Link>
      <header className="mt-4 mb-6 text-center">
        <p className="text-sub text-ink-3">
          {competencia.nombre} · {TEXTOS.reportes.individual}
        </p>
        <h1 className="mt-2 text-h2 font-semibold md:text-display">{titulo}</h1>
        {datos && datos.nivelGeneral !== null && (
          <div className="mt-6">
            <p className="text-body text-ink-3">{TEXTOS.reportes.nivelGeneral}</p>
            <p className="text-h2 font-semibold md:text-display">{obtenerNivel(datos.nivelGeneral).etiqueta}</p>
          </div>
        )}
      </header>
      <AccionesReporte competenciaId={competencia.id} />

      {reporte === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : !datos || datos.evaluaciones === 0 ? (
        <p className="mt-10 text-center text-sub text-ink-3">{TEXTOS_REPORTES.sinEvaluacionesParticipante}</p>
      ) : (
        <Contenido datos={datos} />
      )}

      <nav aria-label={TEXTOS_REPORTES.otrosParticipantes} className="mt-8 flex flex-wrap justify-between gap-2 print:hidden">
        {anterior ? (
          <Link
            href={`${rutaGeneral}/${anterior.id}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline"
          >
            <IconoChevron className="rotate-180" />
            <span className="sr-only">{TEXTOS.calificacion.anterior} </span>
            {anterior.etiqueta}
          </Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link
            href={`${rutaGeneral}/${siguiente.id}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline"
          >
            <span className="sr-only">{TEXTOS.calificacion.siguiente} </span>
            {siguiente.etiqueta}
            <IconoChevron />
          </Link>
        )}
      </nav>
    </>
  );
}

function Contenido({ datos }: { datos: ReporteParticipante }) {
  const indicadores = datos.indicadores.map(({ numero, titulo }) => ({ numero, titulo }));
  const nombreIndicador = (i: { numero: number; titulo: string }) => `${TEXTOS.calificacion.indicador(i.numero)}. ${i.titulo}`;
  const puntosConteo = puntosDistribucionParticipante(datos.indicadores);

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-4">
        <Kpi
          etiqueta={TEXTOS.reportes.puntajeGeneral}
          valor={datos.puntajeGeneral === null ? "—" : formatearDecimal(datos.puntajeGeneral)}
        />
        <Kpi etiqueta={TEXTOS.reportes.evaluacionesRecibidas} valor={formatearEntero(datos.evaluaciones)} />
        <Kpi
          etiqueta={TEXTOS_REPORTES.asistidosIa}
          valor={datos.proporcionIa === null ? "—" : formatearPorcentaje(datos.proporcionIa)}
        />
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <SeccionReporte id="promedios" titulo={TEXTOS_REPORTES.promedioPorIndicador}>
          <FiguraGrafico
            etiquetadaPor="promedios-titulo"
            alto={ALTO_RADAR}
            grafico={<RadarIndicadores puntos={puntosRadar(datos.indicadores)} />}
          >
            <TablaEquivalente
              titulo={TEXTOS_REPORTES.promedioPorIndicador}
              encabezados={[TEXTOS_REPORTES.indicador, TEXTOS_REPORTES.promedioPorIndicador]}
              filas={datos.indicadores.map((i) => [
                nombreIndicador(i),
                i.media === null ? TEXTOS_REPORTES.sinDatos : formatearDecimal(i.media),
              ])}
            />
          </FiguraGrafico>
          <ClaveIndicadores indicadores={indicadores} />
        </SeccionReporte>

        <SeccionReporte id="calificaciones" titulo={TEXTOS_REPORTES.calificacionesPorIndicador}>
          <FiguraGrafico
            etiquetadaPor="calificaciones-titulo"
            alto={datos.indicadores.length * ALTO_FILA_DISTRIBUCION + 8}
            grafico={<DistribucionNiveles puntos={puntosConteo} maximo={maximoConteo(puntosConteo)} />}
            leyenda
          >
            <TablaEquivalente
              titulo={TEXTOS_REPORTES.calificacionesPorIndicador}
              encabezados={[TEXTOS_REPORTES.indicador, ...NIVELES.map((n) => n.etiqueta)]}
              filas={datos.indicadores.map((i) => [
                nombreIndicador(i),
                ...NIVELES.map((n) => formatearEntero(i.distribucion[n.valor])),
              ])}
            />
          </FiguraGrafico>
          <ClaveIndicadores indicadores={indicadores} />
        </SeccionReporte>
      </div>

      <SeccionReporte id="coincidencia" titulo={TEXTOS_REPORTES.coincidenciaTitulo}>
        <ul className="flex flex-col gap-3">
          {datos.indicadores.map((i) => (
            <li key={i.indicadorId} className="fila-reporte flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
              <span className="min-w-0 flex-1 text-body">{nombreIndicador(i)}</span>
              {i.acuerdo && i.media !== null ? (
                <span className="flex flex-wrap items-center gap-2 text-caption text-ink-3 tabular-nums">
                  <Chip tono={TONO_COINCIDENCIA[i.acuerdo.coincidencia]}>{TEXTOS.coincidencia[i.acuerdo.coincidencia]}</Chip>
                  <span>
                    {formatearDecimal(i.media)} · {TEXTOS_REPORTES.rango(String(i.acuerdo.min), String(i.acuerdo.max))} ·{" "}
                    {TEXTOS_REPORTES.desviacion(formatearDecimal(i.acuerdo.desviacion))}
                  </span>
                </span>
              ) : (
                <span className="text-caption text-ink-2">{TEXTOS_REPORTES.sinDatos}</span>
              )}
            </li>
          ))}
        </ul>
      </SeccionReporte>

      <SeccionReporte id="observaciones" titulo={TEXTOS_REPORTES.observaciones}>
        <div className="flex flex-col gap-6">
          {datos.indicadores.map((i) => (
            <section key={i.indicadorId} aria-labelledby={`obs-${i.indicadorId}`}>
              <h3 id={`obs-${i.indicadorId}`} className="text-body font-semibold">
                {nombreIndicador(i)}
              </h3>
              {i.observaciones.length === 0 ? (
                <p className="mt-1 text-caption text-ink-2">{TEXTOS_REPORTES.sinObservaciones}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {i.observaciones.map((o, indice) => (
                    <li key={indice} className="fila-reporte rounded-tile bg-canvas px-3 py-2">
                      <p className="text-caption text-ink-3">
                        <span className="font-semibold text-ink">{o.evaluador}</span> · {TEXTOS_REPORTES.nivel}{" "}
                        {obtenerNivel(o.nivel).etiqueta}
                      </p>
                      <p className="mt-0.5 text-body break-words">{o.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </SeccionReporte>
    </div>
  );
}
