import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccionesReporte } from "@/components/reportes/AccionesReporte";
import { puntosDistribucionGeneral, puntosPuntajes } from "@/components/reportes/datosGraficos";
import { ClaveIndicadores, FiguraGrafico, Kpi, SeccionReporte, TablaEquivalente } from "@/components/reportes/Figura";
import { DistribucionNiveles, PuntajesParticipantes } from "@/components/reportes/graficos";
import { MatrizCobertura } from "@/components/reportes/MatrizCobertura";
import { MejoresPuntajes } from "@/components/reportes/MejoresPuntajes";
import { TablaParticipantes } from "@/components/reportes/TablaParticipantes";
import { IconoChevron } from "@/components/ui/iconos";
import type { Competencia } from "@/config/competencias";
import { NIVELES, obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero, formatearPorcentaje } from "@/lib/formato";
import { nivelGeneral, proporcion } from "@/lib/puntajes";
import { CANTIDAD_MEJORES, type Reporte } from "@/lib/reportes";
import { cargarReporte } from "../cargarReporte";
import { exigirDocente } from "../exigirDocente";

// Reporte general (PRD §11.2, FR-11): KPI tiles, the top puntajes, level distribution per
// indicator, score per participant, the sortable participant table and the
// coverage grid, all from one server aggregation (lib/reportes.ts). Charts
// load on the client; each has a hidden table with the same values.

// Not validated in dev; see the note in app/[competencia]/layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Reporte general · Nivela",
  robots: { index: false, follow: false },
};

const ALTO_FILA_DISTRIBUCION = 44;
const ALTO_FILA_PUNTAJE = 26;

export default function PaginaReporteGeneral({ params }: PageProps<"/reportes/[competencia]">) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <ReporteGeneral params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function ReporteGeneral({ params }: Pick<PageProps<"/reportes/[competencia]">, "params">) {
  const { competencia: id } = await params;
  await exigirDocente(`/reportes/${id}`);
  const { competencia, reporte } = await cargarReporte(id, "/reportes/[competencia]");

  return (
    <>
      <Link
        href="/reportes"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline print:hidden"
      >
        <IconoChevron className="rotate-180" />
        {TEXTOS_REPORTES.volverReportes}
      </Link>
      <header className="mt-4 mb-6 text-center">
        <p className="text-sub text-ink-3">{competencia.nombre}</p>
        <h1 className="mt-2 text-h2 font-semibold md:text-display">{TEXTOS.reportes.general}</h1>
      </header>
      <AccionesReporte competenciaId={competencia.id} />

      {reporte === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : reporte.vacio ? (
        <p className="mt-10 text-center text-sub text-ink-3">{TEXTOS.reportes.vacio}</p>
      ) : (
        <Contenido competencia={competencia} reporte={reporte} />
      )}
    </>
  );
}

function Contenido({ competencia, reporte }: { competencia: Competencia; reporte: Reporte }) {
  const { kpis } = reporte;
  const total = (n: number, de: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(de));
  const indicadores = competencia.indicadores.map(({ numero, titulo }) => ({ numero, titulo }));

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Kpi
          etiqueta={TEXTOS_REPORTES.participantesEvaluados}
          valor={total(kpis.participantesEvaluados, kpis.participantesTotal)}
        />
        <Kpi
          etiqueta={TEXTOS.reportes.evaluacionesRecibidas}
          valor={total(kpis.recibidas, kpis.esperadas)}
          detalle={kpis.cobertura === null ? undefined : TEXTOS_REPORTES.coberturaKpi(formatearPorcentaje(kpis.cobertura))}
        />
        <Kpi
          etiqueta={TEXTOS_REPORTES.puntajePromedio}
          valor={kpis.puntajePromedio === null ? "—" : formatearDecimal(kpis.puntajePromedio)}
          detalle={kpis.puntajePromedio === null ? undefined : obtenerNivel(nivelGeneral(kpis.puntajePromedio)).etiqueta}
        />
        <Kpi
          etiqueta={TEXTOS_REPORTES.asistidosIa}
          valor={kpis.proporcionIa === null ? "—" : formatearPorcentaje(kpis.proporcionIa)}
        />
      </dl>

      <SeccionReporte id="mejores" titulo={TEXTOS_REPORTES.mejoresTitulo(CANTIDAD_MEJORES)}>
        <p className="-mt-2 mb-4 text-caption text-ink-2">{TEXTOS_REPORTES.mejoresDescripcion}</p>
        <MejoresPuntajes mejores={reporte.mejores} competenciaId={competencia.id} indicadores={indicadores} />
        <ClaveIndicadores indicadores={indicadores} />
      </SeccionReporte>

      <SeccionReporte id="distribucion" titulo={TEXTOS.reportes.distribucion}>
        <FiguraGrafico
          etiquetadaPor="distribucion-titulo"
          alto={reporte.distribucion.length * ALTO_FILA_DISTRIBUCION + 8}
          grafico={<DistribucionNiveles puntos={puntosDistribucionGeneral(reporte.distribucion)} maximo={1} />}
          leyenda
        >
          <TablaEquivalente
            titulo={TEXTOS.reportes.distribucion}
            encabezados={[TEXTOS_REPORTES.indicador, ...NIVELES.map((n) => n.etiqueta), TEXTOS_REPORTES.total]}
            filas={reporte.distribucion.map((d) => [
              `${TEXTOS.calificacion.indicador(d.numero)}. ${d.titulo}`,
              ...NIVELES.map((n) => `${formatearPorcentaje(proporcion(d.conteo[n.valor], d.total) ?? 0)} (${formatearEntero(d.conteo[n.valor])})`),
              formatearEntero(d.total),
            ])}
          />
        </FiguraGrafico>
        <ClaveIndicadores indicadores={indicadores} />
      </SeccionReporte>

      <SeccionReporte id="puntajes" titulo={TEXTOS_REPORTES.puntajePorParticipante}>
        <FiguraGrafico
          etiquetadaPor="puntajes-titulo"
          alto={reporte.ranking.length * ALTO_FILA_PUNTAJE + 32}
          grafico={<PuntajesParticipantes puntos={puntosPuntajes(reporte.ranking)} />}
          leyenda
        >
          <TablaEquivalente
            titulo={TEXTOS_REPORTES.puntajePorParticipante}
            encabezados={[TEXTOS_REPORTES.participante, TEXTOS.reportes.puntajeGeneral, TEXTOS.reportes.nivelGeneral]}
            filas={reporte.ranking.map((r) => [r.etiqueta, formatearDecimal(r.puntaje), obtenerNivel(r.nivel).etiqueta])}
          />
        </FiguraGrafico>
      </SeccionReporte>

      <SeccionReporte id="tabla" titulo={TEXTOS_REPORTES.tablaParticipantes}>
        <TablaParticipantes
          etiquetadaPor="tabla-titulo"
          indicadores={indicadores}
          filas={reporte.participantes.map((p) => ({
            id: p.id,
            etiqueta: p.etiqueta,
            href: `/reportes/${competencia.id}/${p.id}`,
            medias: p.indicadores.map((i) => i.media),
            puntaje: p.puntajeGeneral,
            nivel: p.nivelGeneral,
            evaluaciones: p.evaluaciones,
          }))}
        />
        <ClaveIndicadores indicadores={indicadores} />
      </SeccionReporte>

      <SeccionReporte id="cobertura" titulo={TEXTOS.reportes.cobertura}>
        <MatrizCobertura etiquetadaPor="cobertura-titulo" cobertura={reporte.cobertura} />
      </SeccionReporte>
    </div>
  );
}
