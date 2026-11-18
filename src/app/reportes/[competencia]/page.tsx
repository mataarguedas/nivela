import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccionesReporte } from "@/components/reportes/AccionesReporte";
import { AvanceEvaluadores } from "@/components/reportes/AvanceEvaluadores";
import { BarrasHorizontales } from "@/components/reportes/BarrasHorizontales";
import {
  barrasParticipantesPorNivel,
  barrasPuntajePorParticipante,
  puntosDistribucionGeneral,
} from "@/components/reportes/datosGraficos";
import {
  BloqueDetallado,
  ClaveIndicadores,
  FiguraGrafico,
  Kpi,
  SeccionReporte,
  TablaEquivalente,
} from "@/components/reportes/Figura";
import { DistribucionNiveles } from "@/components/reportes/graficos";
import { GraficosDetallados } from "@/components/reportes/GraficosDetallados";
import { MatrizCobertura } from "@/components/reportes/MatrizCobertura";
import { MejoresPuntajes } from "@/components/reportes/MejoresPuntajes";
import { TablaParticipantes } from "@/components/reportes/TablaParticipantes";
import { IconoChevron } from "@/components/ui/iconos";
import type { Competencia } from "@/config/competencias";
import { nombreJornada } from "@/config/jornadas";
import { NIVELES, obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero, formatearPorcentaje } from "@/lib/formato";
import { nivelGeneral, proporcion } from "@/lib/puntajes";
import { CANTIDAD_MEJORES, type Reporte } from "@/lib/reportes";
import { cargarReporte } from "../cargarReporte";
import { exigirDocente } from "../exigirDocente";

// Reporte general (PRD §11.2, FR-11): KPI tiles (with "Ausentes", §5.13),
// evaluator progress, the top puntajes, participants per level, score per
// participant, the sortable participant table and the coverage grid, all from
// one server aggregation (lib/reportes.ts). The simple charts (§11 v1.2) are
// server-drawn bars titled by their message; the v1.1 100 % stacked bars wait
// in "Ver gráficos detallados" and load Recharts only when opened. Every chart
// has a hidden table with the same values.

// Not validated in dev; see the note in app/[competencia]/layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Reporte general · Nivela",
  robots: { index: false, follow: false },
};

const ALTO_FILA_DISTRIBUCION = 44;
// Value gutters, wide enough for "12 · 60 %" and "2,10 · Intermedio".
const ANCHO_CONTEO = "4.5rem";
const ANCHO_PUNTAJE = "7rem";

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
  const jornada = await exigirDocente(`/reportes/${id}`);
  const { competencia, reporte } = await cargarReporte(jornada, id, "/reportes/[competencia]");

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
        <p className="text-sub text-ink-3">
          {competencia.nombre} · {TEXTOS.jornada.actual(nombreJornada(jornada))}
        </p>
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
  const porNivel = barrasParticipantesPorNivel(reporte.ranking.map((r) => r.nivel));
  const porParticipante = barrasPuntajePorParticipante(reporte.ranking);

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
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
        <Kpi etiqueta={TEXTOS_REPORTES.ausentes} valor={formatearEntero(kpis.ausentes)} detalle={TEXTOS_REPORTES.ausentesKpi} />
        <Kpi
          etiqueta={TEXTOS_REPORTES.evaluadoresCompletos}
          valor={total(kpis.evaluadoresCompletos, kpis.evaluadoresTotal)}
        />
      </dl>

      <SeccionReporte id="avance" titulo={TEXTOS_REPORTES.avanceTitulo(reporte.avance.numeroEquipo)}>
        <AvanceEvaluadores avance={reporte.avance} etiquetadaPor="avance-titulo" />
      </SeccionReporte>

      <SeccionReporte id="mejores" titulo={TEXTOS_REPORTES.mejoresTitulo(CANTIDAD_MEJORES)}>
        <p className="-mt-2 mb-4 text-caption text-ink-2">{TEXTOS_REPORTES.mejoresDescripcion}</p>
        <MejoresPuntajes mejores={reporte.mejores} competenciaId={competencia.id} indicadores={indicadores} />
        <ClaveIndicadores indicadores={indicadores} />
      </SeccionReporte>

      <SeccionReporte id="por-nivel" titulo={TEXTOS_REPORTES.participantesPorNivel} mensaje={porNivel.titulo}>
        <FiguraGrafico
          etiquetadaPor="por-nivel-titulo por-nivel-mensaje"
          grafico={<BarrasHorizontales barras={porNivel.barras} anchoValor={ANCHO_CONTEO} anchoEtiqueta="6rem" />}
        >
          <TablaEquivalente
            titulo={TEXTOS_REPORTES.participantesPorNivel}
            encabezados={[TEXTOS_REPORTES.nivel, TEXTOS_REPORTES.participantes, TEXTOS_REPORTES.porcentaje]}
            filas={NIVELES.map((n) => [
              n.etiqueta,
              formatearEntero(porNivel.conteo[n.valor]),
              formatearPorcentaje(proporcion(porNivel.conteo[n.valor], porNivel.total) ?? 0),
            ])}
          />
        </FiguraGrafico>
      </SeccionReporte>

      <SeccionReporte id="puntajes" titulo={TEXTOS_REPORTES.puntajePorParticipante} mensaje={porParticipante.titulo}>
        <FiguraGrafico
          etiquetadaPor="puntajes-titulo puntajes-mensaje"
          grafico={
            <BarrasHorizontales
              barras={porParticipante.barras}
              referencias={porParticipante.referencias}
              anchoValor={ANCHO_PUNTAJE}
            />
          }
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
            asistencia: p.asistencia,
            marcasAusente: p.marcasAusente,
            brecha: p.brecha,
          }))}
        />
        <ClaveIndicadores indicadores={indicadores} />
      </SeccionReporte>

      <SeccionReporte id="cobertura" titulo={TEXTOS.reportes.cobertura}>
        <MatrizCobertura etiquetadaPor="cobertura-titulo" cobertura={reporte.cobertura} />
      </SeccionReporte>

      <GraficosDetallados>
        <BloqueDetallado id="distribucion" titulo={TEXTOS.reportes.distribucion}>
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
        </BloqueDetallado>
      </GraficosDetallados>
    </div>
  );
}
