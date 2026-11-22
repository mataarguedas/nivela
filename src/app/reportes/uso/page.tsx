import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotonImprimir } from "@/components/reportes/BotonImprimir";
import { Kpi, SeccionReporte } from "@/components/reportes/Figura";
import { TablaUsoEquipo } from "@/components/reportes/UsoAplicacion";
import { Chip } from "@/components/ui/Chip";
import { IconoChevron } from "@/components/ui/iconos";
import { nombreJornada } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearEntero } from "@/lib/formato";
import type { UsoAplicacion } from "@/lib/reportes";
import { cargarUsoAplicacion } from "../cargarReporte";
import { exigirDocente } from "../exigirDocente";

// Uso de la aplicación (PRD §11.6, v1.14): which evaluators (the students who
// use the app) activated their account and which are rating, for every team
// of the session's jornada. KPI tiles, a one-line summary, the list of who
// hasn't activated yet (to remind them), then one section per team. Built
// from each competencia's "Avance de evaluadores" (lib/reportes.ts
// agregarUsoAplicacion), so it matches the Reportes generales. Account status
// only, never an email. Docente only (proxy.ts gates /reportes/**, and the
// page re-checks with exigirDocente). The static "uso" segment takes
// precedence over /reportes/[competencia]; no competencia has that id.

export const metadata: Metadata = {
  title: "Uso de la aplicación · Nivela",
  robots: { index: false, follow: false },
};

const t = TEXTOS_REPORTES.uso;

export default function PaginaUsoAplicacion() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <UsoDeLaJornada />
        </Suspense>
      </div>
    </main>
  );
}

async function UsoDeLaJornada() {
  const jornada = await exigirDocente("/reportes/uso");
  const uso = await cargarUsoAplicacion(jornada, "/reportes/uso");

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
        <BotonImprimir variante="primario" />
      </div>

      {uso === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : uso.equipos.length === 0 ? (
        <p className="mt-10 text-center text-sub text-ink-3">{t.vacio}</p>
      ) : (
        <Contenido uso={uso} />
      )}
    </>
  );
}

function Contenido({ uso }: { uso: UsoAplicacion }) {
  const { kpis } = uso;
  const total = (n: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(kpis.total));

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Kpi etiqueta={t.kpiActivadas} valor={total(kpis.activadas)} />
        <Kpi etiqueta={t.kpiActividad} valor={total(kpis.conActividad)} detalle={t.kpiActividadDetalle} />
        <Kpi etiqueta={t.kpiCompletos} valor={total(kpis.completos)} />
        <Kpi
          etiqueta={t.kpiSinActivar}
          valor={formatearEntero(kpis.pendientes + kpis.sinCorreo)}
          detalle={t.kpiSinActivarDetalle(formatearEntero(kpis.pendientes), formatearEntero(kpis.sinCorreo))}
        />
      </dl>

      <SeccionReporte id="resumen" titulo={TEXTOS_REPORTES.consolidado.resumenTitulo}>
        <p className="text-body text-ink">
          {t.resumen(
            formatearEntero(kpis.activadas),
            formatearEntero(kpis.total),
            formatearEntero(kpis.conActividad),
            formatearEntero(kpis.completos),
          )}
        </p>
        <p className="mt-2 text-caption text-ink-2">{t.nota}</p>
      </SeccionReporte>

      <SeccionReporte id="sin-activar" titulo={t.sinActivarTitulo}>
        {uso.sinActivar.length === 0 ? (
          <p className="text-body text-ink-3">{t.todosActivaron}</p>
        ) : (
          <>
            <p className="-mt-2 mb-4 text-caption text-ink-2">{t.sinActivarNota}</p>
            <ul aria-labelledby="sin-activar-titulo" className="flex flex-col">
              {uso.sinActivar.map((a) => (
                <li key={a.evaluadorId} className="fila-reporte flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2 even:bg-canvas">
                  <span className="min-w-0 flex-1 break-words">
                    <span className="font-semibold">{a.nombre}</span>
                    <span className="block text-caption text-ink-3">{t.equipo(a.numeroEquipo, a.competencia)}</span>
                  </span>
                  <Chip tono="ausente">{TEXTOS_REPORTES.estadosCuenta[a.cuenta]}</Chip>
                </li>
              ))}
            </ul>
          </>
        )}
      </SeccionReporte>

      {uso.equipos.map((equipo) => (
        <SeccionReporte key={equipo.competenciaId} id={`equipo-${equipo.competenciaId}`} titulo={t.equipo(equipo.numeroEquipo, equipo.competencia)}>
          <TablaUsoEquipo equipo={equipo} etiquetadaPor={`equipo-${equipo.competenciaId}-titulo`} />
        </SeccionReporte>
      ))}
    </div>
  );
}
