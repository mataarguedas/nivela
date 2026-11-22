import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarrasHorizontales } from "@/components/reportes/BarrasHorizontales";
import { BotonImprimir } from "@/components/reportes/BotonImprimir";
import {
  barrasParticipantesPorNivel,
  barrasPuntajePorCompetencia,
  parrafoConsolidado,
} from "@/components/reportes/datosGraficos";
import { EscalaPuntos, FiguraGrafico, Kpi, SeccionReporte, TablaEquivalente } from "@/components/reportes/Figura";
import { MapaNiveles } from "@/components/reportes/MapaNiveles";
import { TablaConsolidada } from "@/components/reportes/TablaConsolidada";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoChevron } from "@/components/ui/iconos";
import { nombreJornada } from "@/config/jornadas";
import { NIVELES, obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearPuntos, formatearEntero, formatearPorcentaje } from "@/lib/formato";
import { proporcion } from "@/lib/puntajes";
import { tableroConsolidado, type CompetenciaConsolidada, type ReporteConsolidado } from "@/lib/reportes";
import { textoBrechaCorto } from "@/lib/textoBrecha";
import { cargarConsolidado } from "../cargarReporte";
import { exigirDocente } from "../exigirDocente";

// Reporte consolidado (PRD §11.4): the five competencias of the session's
// jornada together. KPI tiles, then the dashboard ("Tablero": a plain-language
// summary and the "Mapa de niveles" heatmap; v1.11 removed "Requieren atención"), the group's puntaje per competencia (simple
// bars plus a table linking to each Reporte general), participants per level
// by their promedio entre competencias, and one sortable table with every
// participant's puntaje general in each competencia. Everything comes from
// each competencia's own aggregation (lib/reportes.ts agregarConsolidado), so
// the figures match the Reportes generales. Docente only (proxy.ts gates
// /reportes/**, and the page re-checks with exigirDocente). The static
// "consolidado" segment takes precedence over /reportes/[competencia].

export const metadata: Metadata = {
  title: "Reporte consolidado · Nivela",
  robots: { index: false, follow: false },
};

// Value gutters, wide enough for "12 · 60 %" and "100 · Intermedio".
const ANCHO_CONTEO = "4.5rem";
const ANCHO_PUNTAJE = "7rem";

export default function PaginaReporteConsolidado() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <ReporteConsolidadoJornada />
        </Suspense>
      </div>
    </main>
  );
}

async function ReporteConsolidadoJornada() {
  const jornada = await exigirDocente("/reportes/consolidado");
  const reporte = await cargarConsolidado(jornada, "/reportes/consolidado");
  const t = TEXTOS_REPORTES.consolidado;

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
          {t.subtitulo} · {TEXTOS.jornada.actual(nombreJornada(jornada))}
        </p>
        <h1 className="mt-2 text-h2 font-semibold md:text-display">{t.titulo}</h1>
      </header>
      <div role="group" aria-label={TEXTOS_REPORTES.acciones} className="flex flex-wrap justify-center gap-2 print:hidden">
        <a href="/api/reportes/consolidado/csv" download className={clasesBoton({ variante: "primario" })}>
          {TEXTOS.reportes.descargarCsv}
        </a>
        <BotonImprimir />
      </div>

      {reporte === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : reporte.vacio ? (
        <p className="mt-10 text-center text-sub text-ink-3">{t.vacio}</p>
      ) : (
        <Contenido reporte={reporte} />
      )}
    </>
  );
}

function Contenido({ reporte }: { reporte: ReporteConsolidado }) {
  const t = TEXTOS_REPORTES.consolidado;
  const { kpis } = reporte;
  const total = (n: number, de: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(de));
  const disponibles = reporte.competencias.flatMap((c, i) => (c.disponible ? [{ competencia: c, indice: i }] : []));
  const porCompetencia = barrasPuntajePorCompetencia(disponibles.map((d) => d.competencia));
  const porNivel = barrasParticipantesPorNivel(reporte.participantes.flatMap((p) => (p.nivel === null ? [] : [p.nivel])));
  const tablero = tableroConsolidado(reporte);

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
        <Kpi
          etiqueta={t.competenciasConEvaluaciones}
          valor={total(kpis.competenciasConEvaluaciones, kpis.competenciasDisponibles)}
          detalle={
            kpis.competenciasDisponibles < kpis.competenciasTotal
              ? t.competenciasDisponibles(formatearEntero(kpis.competenciasDisponibles), formatearEntero(kpis.competenciasTotal))
              : undefined
          }
        />
        <Kpi etiqueta={TEXTOS_REPORTES.participantesEvaluados} valor={total(kpis.participantesEvaluados, kpis.participantesTotal)} />
        <Kpi
          etiqueta={TEXTOS.reportes.evaluacionesRecibidas}
          valor={total(kpis.recibidas, kpis.esperadas)}
          detalle={kpis.cobertura === null ? undefined : TEXTOS_REPORTES.coberturaKpi(formatearPorcentaje(kpis.cobertura))}
        />
        <Kpi
          etiqueta={t.promedioGrupo}
          valor={kpis.promedioGrupo === null ? "—" : formatearPuntos(kpis.promedioGrupo)}
          detalle={kpis.nivelGrupo === null ? undefined : TEXTOS_REPORTES.nivelDetalle(obtenerNivel(kpis.nivelGrupo).etiqueta)}
        />
        <Kpi etiqueta={TEXTOS_REPORTES.evaluadoresCompletos} valor={total(kpis.evaluadoresCompletos, kpis.evaluadoresTotal)} />
      </dl>
      <EscalaPuntos />

      <SeccionReporte id="en-pocas-palabras" titulo={t.resumenTitulo}>
        <p className="text-body text-ink">{parrafoConsolidado(reporte, tablero)}</p>
      </SeccionReporte>

      <SeccionReporte id="mapa" titulo={t.mapaNiveles} mensaje={t.mapaNivelesMensaje}>
        <MapaNiveles reporte={reporte} etiquetadaPor="mapa-titulo mapa-mensaje" />
      </SeccionReporte>

      <SeccionReporte id="por-competencia" titulo={t.puntajePorCompetencia} mensaje={porCompetencia.titulo}>
        <FiguraGrafico
          etiquetadaPor="por-competencia-titulo por-competencia-mensaje"
          grafico={
            <BarrasHorizontales
              barras={porCompetencia.barras}
              referencias={porCompetencia.referencias}
              anchoValor={ANCHO_PUNTAJE}
              anchoEtiqueta="14rem"
            />
          }
        >
          <TablaEquivalente
            titulo={t.puntajePorCompetencia}
            encabezados={[t.competencia, TEXTOS_REPORTES.puntajeGrupo, TEXTOS_REPORTES.nivel]}
            filas={disponibles.map(({ competencia: c }) => [
              c.nombre,
              c.puntaje === null ? "—" : formatearPuntos(c.puntaje),
              c.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(c.nivel).etiqueta,
            ])}
          />
        </FiguraGrafico>
        <p className="mt-4 text-caption text-ink-2">{t.porCompetenciaNota}</p>
      </SeccionReporte>

      <SeccionReporte id="resumen-competencias" titulo={t.porCompetencia}>
        <TablaCompetencias competencias={reporte.competencias} etiquetadaPor="resumen-competencias-titulo" />
      </SeccionReporte>

      <SeccionReporte id="por-nivel" titulo={t.participantesPorNivel} mensaje={porNivel.titulo}>
        <FiguraGrafico
          etiquetadaPor="por-nivel-titulo por-nivel-mensaje"
          grafico={<BarrasHorizontales barras={porNivel.barras} anchoValor={ANCHO_CONTEO} anchoEtiqueta="6rem" />}
        >
          <TablaEquivalente
            titulo={t.participantesPorNivel}
            encabezados={[TEXTOS_REPORTES.nivel, TEXTOS_REPORTES.participantes, TEXTOS_REPORTES.porcentaje]}
            filas={NIVELES.map((n) => [
              n.etiqueta,
              formatearEntero(porNivel.conteo[n.valor]),
              formatearPorcentaje(proporcion(porNivel.conteo[n.valor], porNivel.total) ?? 0),
            ])}
          />
        </FiguraGrafico>
      </SeccionReporte>

      <SeccionReporte id="tabla" titulo={t.tabla}>
        <p className="-mt-2 mb-4 text-caption text-ink-2">{t.tablaNota}</p>
        <TablaConsolidada
          etiquetadaPor="tabla-titulo"
          competencias={disponibles.map(({ competencia: c }) => ({ id: c.id, nombre: c.nombre }))}
          filas={reporte.participantes.map((p) => ({
            id: p.id,
            etiqueta: p.etiqueta,
            celdas: disponibles.map(({ indice }) => {
              const celda = p.celdas[indice];
              return {
                puntaje: celda?.puntaje ?? null,
                nivel: celda?.nivel ?? null,
                ausente: celda?.asistencia === "ausente",
              };
            }),
            evaluadas: p.competenciasEvaluadas,
            promedio: p.promedio,
            nivel: p.nivel,
            brecha: p.brecha,
          }))}
        />
      </SeccionReporte>
    </div>
  );
}

/** "Resumen por competencia": one row per competencia, in config order, the unavailable ones included. */
function TablaCompetencias({ competencias, etiquetadaPor }: { competencias: CompetenciaConsolidada[]; etiquetadaPor: string }) {
  const t = TEXTOS_REPORTES.consolidado;
  const total = (n: number, de: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(de));
  const encabezados = [
    { titulo: t.competencia, numerica: false },
    { titulo: t.equipo, numerica: false },
    { titulo: TEXTOS_REPORTES.puntajeGrupo, numerica: true },
    { titulo: TEXTOS_REPORTES.nivel, numerica: false },
    { titulo: TEXTOS_REPORTES.paraSiguienteNivel, numerica: true },
    { titulo: TEXTOS_REPORTES.participantesEvaluados, numerica: true },
    { titulo: TEXTOS_REPORTES.cobertura, numerica: true },
    { titulo: TEXTOS_REPORTES.evaluadoresCompletos, numerica: true },
  ];
  return (
    <div
      role="region"
      aria-labelledby={etiquetadaPor}
      tabIndex={0}
      className="desplazable relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <table aria-labelledby={etiquetadaPor} className="w-full min-w-[860px] border-separate border-spacing-0 text-[14px]">
        <thead>
          <tr>
            {encabezados.map((e) => (
              <th
                key={e.titulo}
                scope="col"
                className={`px-2 pb-2 align-bottom text-caption font-semibold text-ink-3 ${e.numerica ? "text-right" : "text-left"}`}
              >
                {e.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {competencias.map((c) => (
            <tr key={c.id} className="even:bg-canvas">
              <th scope="row" className="p-0 text-left font-normal">
                {c.disponible ? (
                  <Link
                    href={`/reportes/${c.id}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-pill px-2 text-link hover:underline"
                  >
                    {c.nombre}
                    <IconoChevron className="shrink-0" />
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center px-2 text-ink-2">{c.nombre}</span>
                )}
              </th>
              {c.disponible ? (
                <>
                  <td className="px-2 whitespace-nowrap">{c.numeroEquipo === null ? "—" : t.equipoNumero(c.numeroEquipo)}</td>
                  <td className="px-2 text-right font-semibold tabular-nums">{c.puntaje === null ? "—" : formatearPuntos(c.puntaje)}</td>
                  <td className="px-2">{c.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(c.nivel).etiqueta}</td>
                  <td className="px-2 text-right whitespace-nowrap tabular-nums">{c.brecha ? textoBrechaCorto(c.brecha) : "—"}</td>
                  <td className="px-2 text-right tabular-nums">{total(c.participantesEvaluados, c.participantesTotal)}</td>
                  <td className="px-2 text-right tabular-nums">{c.cobertura === null ? "—" : formatearPorcentaje(c.cobertura)}</td>
                  <td className="px-2 text-right tabular-nums">{total(c.evaluadoresCompletos, c.evaluadoresTotal)}</td>
                </>
              ) : (
                <td colSpan={encabezados.length - 1} className="px-2 text-ink-2">
                  {t.sinPlantilla}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
