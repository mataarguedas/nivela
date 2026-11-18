import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarrasHorizontales } from "@/components/reportes/BarrasHorizontales";
import { BotonImprimir } from "@/components/reportes/BotonImprimir";
import { barrasPuntajePorCompetencia, parrafoParticipante } from "@/components/reportes/datosGraficos";
import { FiguraGrafico, Kpi, SeccionReporte, TablaEquivalente } from "@/components/reportes/Figura";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { IconoChevron } from "@/components/ui/iconos";
import { nombreJornada } from "@/config/jornadas";
import { obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero, formatearLista } from "@/lib/formato";
import type { CompetenciaParticipante, IndicadorParticipante, ReporteParticipanteConsolidado } from "@/lib/reportes";
import { textoBrecha, textoBrechaCorto } from "@/lib/textoBrecha";
import { cargarParticipanteConsolidado } from "../../cargarReporte";
import { exigirDocente } from "../../exigirDocente";

// Reporte del participante (PRD §11.5): one participant across every
// competencia of the session's jornada, as a dashboard for the docente: the
// level by promedio entre competencias and its gap, KPI tiles, a
// plain-language summary, the puntaje per competencia (server-drawn bars on
// the 1–4 axis), and one card per competencia with its level, gap,
// evaluations and strongest/weakest indicator, linking to that competencia's
// Reporte individual. Identified by carnet, never by name; no observations
// (they stay in each Reporte individual). Docente only (proxy.ts gates
// /reportes/**, and the page re-checks with exigirDocente).

// Not validated in dev; see the note in app/[competencia]/layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Reporte del participante · Nivela",
  robots: { index: false, follow: false },
};

// Value gutter, wide enough for "2,10 · Intermedio".
const ANCHO_PUNTAJE = "7rem";

type Props = PageProps<"/reportes/consolidado/[participante]">;

export default function PaginaParticipanteConsolidado({ params }: Props) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <ReporteDelParticipante params={params} />
        </Suspense>
      </div>
    </main>
  );
}

const ENLACE = "inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline";

async function ReporteDelParticipante({ params }: Pick<Props, "params">) {
  const { participante: id } = await params;
  const jornada = await exigirDocente(`/reportes/consolidado/${id}`);
  const datos = await cargarParticipanteConsolidado(jornada, id, "/reportes/consolidado/[participante]");
  const t = TEXTOS_REPORTES.consolidado.participante;

  const indice = datos?.lista.findIndex((p) => p.id === id) ?? -1;
  const anterior = datos?.lista[indice - 1];
  const siguiente = datos?.lista[indice + 1];
  const reporte = datos?.reporte ?? null;

  return (
    <>
      <Link href="/reportes/consolidado" className={`-ml-1 ${ENLACE} print:hidden`}>
        <IconoChevron className="rotate-180" />
        {t.volver}
      </Link>
      <header className="mt-4 mb-6 text-center">
        <p className="text-sub text-ink-3">
          {t.subtitulo(TEXTOS.jornada.actual(nombreJornada(jornada)))} · {t.titulo}
        </p>
        <h1 className="mt-2 text-h2 font-semibold md:text-display">{reporte?.etiqueta ?? t.titulo}</h1>
        {reporte && reporte.nivel !== null && (
          <div className="mt-6">
            <p className="text-body text-ink-3">{TEXTOS_REPORTES.consolidado.promedioGrupo}</p>
            <p className="text-h2 font-semibold md:text-display">{obtenerNivel(reporte.nivel).etiqueta}</p>
            {reporte.brecha && <p className="mt-1 text-body text-ink-3">{textoBrecha(reporte.brecha)}</p>}
          </div>
        )}
      </header>
      <div role="group" aria-label={TEXTOS_REPORTES.acciones} className="flex flex-wrap justify-center gap-2 print:hidden">
        <BotonImprimir variante="primario" />
      </div>

      {reporte === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : reporte.evaluaciones === 0 ? (
        <p className="mt-10 text-center text-sub text-ink-3">{t.sinEvaluaciones}</p>
      ) : (
        <Contenido reporte={reporte} />
      )}

      <nav aria-label={TEXTOS_REPORTES.otrosParticipantes} className="mt-8 flex flex-wrap justify-between gap-2 print:hidden">
        {anterior ? (
          <Link href={`/reportes/consolidado/${anterior.id}`} className={ENLACE}>
            <IconoChevron className="rotate-180" />
            <span className="sr-only">{TEXTOS.calificacion.anterior} </span>
            {anterior.etiqueta}
          </Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link href={`/reportes/consolidado/${siguiente.id}`} className={ENLACE}>
            <span className="sr-only">{TEXTOS.calificacion.siguiente} </span>
            {siguiente.etiqueta}
            <IconoChevron />
          </Link>
        )}
      </nav>
    </>
  );
}

function Contenido({ reporte }: { reporte: ReporteParticipanteConsolidado }) {
  const t = TEXTOS_REPORTES.consolidado;
  const disponibles = reporte.competencias.filter((c) => c.disponible);
  const barras = barrasPuntajePorCompetencia(disponibles);
  const total = (n: number, de: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(de));
  const { brecha } = reporte;

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Kpi
          etiqueta={t.promedioGrupo}
          valor={reporte.promedio === null ? "—" : formatearDecimal(reporte.promedio)}
          detalle={reporte.nivel === null ? undefined : TEXTOS_REPORTES.nivelDetalle(obtenerNivel(reporte.nivel).etiqueta)}
        />
        <Kpi
          etiqueta={TEXTOS_REPORTES.paraSiguienteNivel}
          valor={brecha === null || brecha.faltante === null ? "—" : formatearDecimal(brecha.faltante)}
          detalle={
            brecha === null
              ? undefined
              : brecha.siguiente === null
                ? TEXTOS_REPORTES.nivelMaximo
                : TEXTOS_REPORTES.paraNivel(obtenerNivel(brecha.siguiente).etiqueta)
          }
        />
        <Kpi etiqueta={t.evaluadas} valor={total(reporte.competenciasEvaluadas, reporte.competenciasDisponibles)} />
        <Kpi etiqueta={TEXTOS.reportes.evaluacionesRecibidas} valor={formatearEntero(reporte.evaluaciones)} />
      </dl>

      <SeccionReporte id="en-pocas-palabras" titulo={t.resumenTitulo}>
        <p className="text-body text-ink">{parrafoParticipante(reporte)}</p>
      </SeccionReporte>

      <SeccionReporte id="por-competencia" titulo={t.participante.puntajePorCompetencia} mensaje={barras.titulo}>
        <FiguraGrafico
          etiquetadaPor="por-competencia-titulo por-competencia-mensaje"
          grafico={<BarrasHorizontales barras={barras.barras} referencias={barras.referencias} anchoValor={ANCHO_PUNTAJE} anchoEtiqueta="14rem" />}
        >
          <TablaEquivalente
            titulo={t.participante.puntajePorCompetencia}
            encabezados={[t.competencia, TEXTOS.reportes.puntajeGeneral, TEXTOS.reportes.nivelGeneral]}
            filas={disponibles.map((c) => [
              c.nombre,
              c.puntaje === null ? "—" : formatearDecimal(c.puntaje),
              c.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(c.nivel).etiqueta,
            ])}
          />
        </FiguraGrafico>
      </SeccionReporte>

      <SeccionReporte id="detalle" titulo={t.participante.detalle}>
        <ul className="grid gap-2 md:grid-cols-2 md:gap-4">
          {reporte.competencias.map((c) => (
            <li key={c.id} className="tarjeta-competencia rounded-tile bg-canvas p-4">
              <TarjetaCompetencia competencia={c} participanteId={reporte.id} />
            </li>
          ))}
        </ul>
      </SeccionReporte>
    </div>
  );
}

const lineaIndicadores = (indicadores: readonly IndicadorParticipante[]) =>
  formatearLista(
    indicadores.map((i) =>
      TEXTOS_REPORTES.consolidado.participante.indicadorValor(i.numero, i.titulo.trim().replace(/\.$/, ""), formatearDecimal(i.media ?? 0)),
    ),
  );

/** One competencia: level and score, gap, evaluations, strongest/weakest indicator, link to its Reporte individual. */
function TarjetaCompetencia({ competencia: c, participanteId }: { competencia: CompetenciaParticipante; participanteId: string }) {
  const t = TEXTOS_REPORTES.consolidado.participante;
  const titulo = <h3 className="text-body font-semibold text-ink">{c.nombre}</h3>;
  if (!c.disponible) {
    return (
      <>
        {titulo}
        <p className="mt-1 text-[14px] text-ink-2">{TEXTOS_REPORTES.consolidado.sinPlantilla}</p>
      </>
    );
  }
  if (c.puntaje === null || c.nivel === null) {
    return (
      <>
        {titulo}
        <p className="mt-1 text-[14px] text-ink-2">{c.asistencia === "ausente" ? t.ausenteCompetencia : t.sinEvaluacionesCompetencia}</p>
      </>
    );
  }
  const todosIguales = c.indicadoresFuertes.length > 0 && c.indicadoresFuertes.length === c.indicadores.filter((i) => i.media !== null).length;
  return (
    <>
      {titulo}
      <p className="mt-2 flex items-center gap-2">
        <span aria-hidden="true" className={`inline-block size-3 shrink-0 rounded-full ${FONDO_NIVEL[c.nivel]}`} />
        <span className="text-h3 font-semibold tabular-nums">{formatearDecimal(c.puntaje)}</span>
        <span className="text-body text-ink">{obtenerNivel(c.nivel).etiqueta}</span>
      </p>
      <dl className="mt-2 flex flex-col gap-1 text-[14px]">
        {c.brecha && (
          <div>
            <dt className="sr-only">{TEXTOS_REPORTES.paraSiguienteNivel}</dt>
            <dd className="text-ink-3">{textoBrechaCorto(c.brecha)}</dd>
          </div>
        )}
        <div>
          <dt className="sr-only">{TEXTOS.reportes.evaluacionesRecibidas}</dt>
          <dd className="text-ink-3">{TEXTOS_REPORTES.evaluacionesCuenta(formatearEntero(c.evaluaciones))}</dd>
        </div>
        {todosIguales ? (
          <div>
            <dt className="sr-only">{t.indicadorMasAlto(c.indicadoresFuertes.length)}</dt>
            <dd className="text-ink">{t.todosIguales(formatearDecimal(c.indicadoresFuertes[0].media ?? 0))}</dd>
          </div>
        ) : (
          <>
            {c.indicadoresFuertes.length > 0 && (
              <div className="mt-1">
                <dt className="font-semibold text-ink">{t.indicadorMasAlto(c.indicadoresFuertes.length)}</dt>
                <dd className="text-ink">{lineaIndicadores(c.indicadoresFuertes)}</dd>
              </div>
            )}
            {c.indicadoresDebiles.length > 0 && (
              <div className="mt-1">
                <dt className="font-semibold text-ink">{t.indicadorMasBajo(c.indicadoresDebiles.length)}</dt>
                <dd className="text-ink">{lineaIndicadores(c.indicadoresDebiles)}</dd>
              </div>
            )}
          </>
        )}
      </dl>
      <Link
        href={`/reportes/${c.id}/${participanteId}`}
        aria-label={t.verIndividualDe(c.nombre)}
        className="mt-2 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline print:hidden"
      >
        {t.verIndividual}
        <IconoChevron className="shrink-0" />
      </Link>
    </>
  );
}
