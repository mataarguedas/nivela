import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BarrasHorizontales } from "@/components/reportes/BarrasHorizontales";
import { BotonImprimir } from "@/components/reportes/BotonImprimir";
import { ComparacionJornadas } from "@/components/reportes/ComparacionJornadas";
import {
  barrasParticipantesPorNivel,
  barrasPuntajePorIndicador,
  parrafoResumenGrupo,
} from "@/components/reportes/datosGraficos";
import { FiguraGrafico, Kpi, SeccionReporte, TablaEquivalente } from "@/components/reportes/Figura";
import { SelectorJornadaResumen } from "@/components/reportes/SelectorJornadaResumen";
import { IconoChevron } from "@/components/ui/iconos";
import { nombreJornada, type SeleccionJornada } from "@/config/jornadas";
import { NIVELES, obtenerNivel } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal, formatearEntero, formatearPorcentaje } from "@/lib/formato";
import { proporcion } from "@/lib/puntajes";
import type { CifrasGrupo, IndicadorGrupo, ResumenGrupo } from "@/lib/reportes";
import { validarSeleccionResumen } from "@/lib/validacion";
import { cargarResumenGrupo } from "../../cargarReporte";
import { exigirDocente } from "../../exigirDocente";

// Resumen del grupo (PRD §11.3, FR-25): how the group did as a whole, for
// one jornada or both. Docente only (proxy.ts gates /reportes/**, and the
// page re-checks with exigirDocente).
//
// The §5.11 exception: this is the only page whose jornada comes from the
// request (`?jornada=manana|noche|ambas`, validated by
// validarSeleccionResumen; missing or invalid → the session's jornada). It is
// read-only: it never writes and never changes the session. Jornadas are
// compared by competencia, each with its own team from config, never by team
// number. Participants never appear here, only the group's figures.

// Not validated in dev; see the note in app/[competencia]/layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Resumen del grupo · Nivela",
  robots: { index: false, follow: false },
};

// Value gutters, wide enough for "12 · 60 %" and "2,10 · Intermedio".
const ANCHO_CONTEO = "4.5rem";
const ANCHO_PUNTAJE = "7rem";

type Props = PageProps<"/reportes/[competencia]/grupo">;

export default function PaginaResumenGrupo({ params, searchParams }: Props) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <ResumenDelGrupo params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

const nombreSeleccion = (seleccion: SeleccionJornada) =>
  seleccion === "ambas" ? TEXTOS_REPORTES.ambasJornadas : nombreJornada(seleccion);

async function ResumenDelGrupo({ params, searchParams }: Props) {
  const { competencia: id } = await params;
  const jornadaSesion = await exigirDocente(`/reportes/${id}/grupo`);
  const validacion = validarSeleccionResumen(id, (await searchParams).jornada, jornadaSesion);
  if (!validacion.ok) notFound();
  const { seleccion, opciones, jornadas } = validacion.datos;
  const competencia = jornadas[0].competencia;

  const resumen = await cargarResumenGrupo(jornadas, "/reportes/[competencia]/grupo");

  return (
    <>
      <Link
        href={`/reportes/${competencia.id}`}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline print:hidden"
      >
        <IconoChevron className="rotate-180" />
        {TEXTOS_REPORTES.volverGeneral}
      </Link>
      <header className="mt-4 mb-6 text-center">
        <p className="text-sub text-ink-3">
          {competencia.nombre} ·{" "}
          {seleccion === "ambas" ? TEXTOS_REPORTES.ambasJornadas : TEXTOS.jornada.actual(nombreJornada(seleccion))}
        </p>
        <h1 className="mt-2 text-h2 font-semibold md:text-display">{TEXTOS_REPORTES.resumenGrupo}</h1>
      </header>
      <div className="flex flex-col items-center gap-6">
        <SelectorJornadaResumen
          competenciaId={competencia.id}
          opciones={opciones.map((o) => ({ id: o, nombre: nombreSeleccion(o) }))}
          actual={seleccion}
        />
        <div className="print:hidden">
          <BotonImprimir variante="primario" />
        </div>
      </div>

      {resumen === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : resumen.vacio ? (
        <p className="mt-10 text-center text-sub text-ink-3">{TEXTOS.reportes.vacio}</p>
      ) : (
        <Contenido resumen={resumen} />
      )}
    </>
  );
}

function Contenido({ resumen }: { resumen: ResumenGrupo }) {
  const { grupo } = resumen;
  const porNivel = barrasParticipantesPorNivel(grupo.niveles);

  return (
    <div className="mt-8 flex flex-col gap-4">
      <KpisGrupo grupo={grupo} />

      <SeccionReporte id="resumen" titulo={TEXTOS_REPORTES.resumenTitulo}>
        <p className="text-body text-ink">{parrafoResumenGrupo(grupo)}</p>
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

      {grupo.indicadores ? (
        <PorIndicador id="por-indicador" titulo={TEXTOS_REPORTES.puntajePromedioPorIndicador} indicadores={grupo.indicadores} />
      ) : (
        // "Ambas jornadas" with two rubrics: one chart per jornada, each with its own indicators.
        resumen.jornadas.map((j) => (
          <PorIndicador
            key={j.jornada}
            id={`por-indicador-${j.jornada}`}
            titulo={`${TEXTOS_REPORTES.puntajePromedioPorIndicador} · ${TEXTOS_REPORTES.columnaJornada(nombreJornada(j.jornada), j.numeroEquipo)}`}
            indicadores={j.indicadores}
          />
        ))
      )}

      {resumen.seleccion === "ambas" && (
        <SeccionReporte id="comparacion" titulo={TEXTOS_REPORTES.comparacionTitulo}>
          <p className="-mt-2 mb-4 text-caption text-ink-2">
            {resumen.mismaRubrica ? TEXTOS_REPORTES.comparacionDescripcion : TEXTOS_REPORTES.comparacionRubricasDistintas}
          </p>
          <ComparacionJornadas jornadas={resumen.jornadas} mismaRubrica={resumen.mismaRubrica} etiquetadaPor="comparacion-titulo" />
        </SeccionReporte>
      )}
    </div>
  );
}

/** KPI tiles (PRD §11.3): puntaje and nivel, the gap, evaluados, ausentes, cobertura, evaluadores completos. */
function KpisGrupo({ grupo }: { grupo: CifrasGrupo }) {
  const total = (n: number, de: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(de));
  const { brecha } = grupo;
  const maximo = brecha !== null && brecha.siguiente === null;
  return (
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
      <Kpi
        etiqueta={TEXTOS_REPORTES.puntajeGrupo}
        valor={grupo.puntaje === null ? "—" : formatearDecimal(grupo.puntaje)}
        detalle={grupo.nivel === null ? undefined : TEXTOS_REPORTES.nivelDetalle(obtenerNivel(grupo.nivel).etiqueta)}
      />
      <Kpi
        etiqueta={TEXTOS_REPORTES.paraSiguienteNivel}
        valor={brecha === null || brecha.faltante === null ? "—" : formatearDecimal(brecha.faltante)}
        detalle={
          maximo
            ? TEXTOS_REPORTES.nivelMaximo
            : brecha?.siguiente
              ? TEXTOS_REPORTES.paraNivel(obtenerNivel(brecha.siguiente).etiqueta)
              : undefined
        }
      />
      <Kpi etiqueta={TEXTOS_REPORTES.participantesEvaluados} valor={total(grupo.participantesEvaluados, grupo.participantesTotal)} />
      <Kpi etiqueta={TEXTOS_REPORTES.ausentes} valor={formatearEntero(grupo.ausentes)} detalle={TEXTOS_REPORTES.ausentesKpi} />
      <Kpi
        etiqueta={TEXTOS_REPORTES.cobertura}
        valor={grupo.cobertura === null ? "—" : formatearPorcentaje(grupo.cobertura)}
        detalle={TEXTOS_REPORTES.evaluacionesDe(formatearEntero(grupo.recibidas), formatearEntero(grupo.esperadas))}
      />
      <Kpi etiqueta={TEXTOS_REPORTES.evaluadoresCompletos} valor={total(grupo.evaluadoresCompletos, grupo.evaluadoresTotal)} />
    </dl>
  );
}

/** "Puntaje promedio por indicador": the simple bars on the 1–4 axis with the threshold lines. */
function PorIndicador({ id, titulo, indicadores }: { id: string; titulo: string; indicadores: readonly IndicadorGrupo[] }) {
  const datos = barrasPuntajePorIndicador(indicadores);
  return (
    <SeccionReporte id={id} titulo={titulo} mensaje={datos.titulo}>
      <FiguraGrafico
        etiquetadaPor={`${id}-titulo ${id}-mensaje`}
        grafico={
          <BarrasHorizontales barras={datos.barras} referencias={datos.referencias} anchoValor={ANCHO_PUNTAJE} anchoEtiqueta="16rem" />
        }
      >
        <TablaEquivalente
          titulo={titulo}
          encabezados={[TEXTOS_REPORTES.indicador, TEXTOS_REPORTES.puntaje, TEXTOS_REPORTES.nivel]}
          filas={indicadores.map((i) => [
            `${TEXTOS.calificacion.indicador(i.numero)}. ${i.titulo}`,
            i.media === null ? "—" : formatearDecimal(i.media),
            i.nivel === null ? TEXTOS_REPORTES.sinDatos : obtenerNivel(i.nivel).etiqueta,
          ])}
        />
      </FiguraGrafico>
    </SeccionReporte>
  );
}
