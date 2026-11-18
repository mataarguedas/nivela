import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnvioResultados, type VistaPrevia } from "@/components/reportes/EnvioResultados";
import { IconoChevron } from "@/components/ui/iconos";
import { nombreJornada } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ENVIO, TEXTOS_REPORTES } from "@/config/textosReportes";
import { plantillaParaParticipante, type ContextoEnvio } from "@/lib/envioResultados";
import { validarCompetenciaReporte } from "@/lib/validacion";
import { cargarEnvio } from "../../cargarReporte";
import { exigirDocente } from "../../exigirDocente";

// Envío de resultados (PRD §5.14, FR-26): the docente sends each participant
// their personal results, for the session's jornada only. Docente only
// (proxy.ts gates /reportes/**, and the page re-checks). Everything is
// computed here on the server; the preview for `?participante=` is rendered
// from the same template the send uses, so it is exactly the email that
// participant receives. Its address appears only in that preview, never in a
// list; participants are otherwise labelled by carnet, as in every report.

// Not validated in dev; see the note in app/[competencia]/layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Enviar resultados · Nivela",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/reportes/[competencia]/enviar">;

export default function PaginaEnviarResultados({ params, searchParams }: Props) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6 md:pt-10">
      <div className="mx-auto w-full max-w-[980px]">
        <Suspense fallback={<p className="pt-10 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
          <EnvioDeResultados params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function EnvioDeResultados({ params, searchParams }: Props) {
  const { competencia: id } = await params;
  const jornada = await exigirDocente(`/reportes/${id}/enviar`);
  const validacion = validarCompetenciaReporte(id, jornada);
  if (!validacion.ok) notFound();
  const { competencia, equipo } = validacion.datos;
  const contexto = await cargarEnvio(jornada, competencia, equipo, "/reportes/[competencia]/enviar");
  const { participante } = await searchParams;

  return (
    <>
      <Link
        href={`/reportes/${competencia.id}`}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-1 text-[14px] text-link hover:underline"
      >
        <IconoChevron className="rotate-180" />
        {TEXTOS_REPORTES.volverGeneral}
      </Link>
      <header className="mt-4 mb-6 text-center">
        <p className="text-sub text-ink-3">
          {competencia.nombre} · {TEXTOS.jornada.actual(nombreJornada(jornada))}
        </p>
        <h1 className="mt-2 text-h2 font-semibold md:text-display">{TEXTOS_ENVIO.titulo}</h1>
      </header>
      <p className="mx-auto max-w-[640px] text-center text-body text-ink-3">{TEXTOS_ENVIO.descripcion}</p>

      {contexto === null ? (
        <p role="alert" className="mt-10 text-center text-body text-ink">
          {TEXTOS_REPORTES.errorCarga}
        </p>
      ) : contexto.reporte.vacio ? (
        <p className="mt-10 pb-12 text-center text-sub text-ink-3">{TEXTOS.reportes.vacio}</p>
      ) : (
        <EnvioResultados
          competenciaId={competencia.id}
          destinatarios={contexto.seleccion.destinatarios}
          omitidos={contexto.seleccion.omitidos}
          previa={vistaPrevia(contexto, typeof participante === "string" ? participante : undefined)}
        />
      )}
    </>
  );
}

/** The preview for the requested recipient, or the first one; null without recipients. */
function vistaPrevia(contexto: ContextoEnvio, pedido: string | undefined): VistaPrevia | null {
  const { destinatarios } = contexto.seleccion;
  const fila = destinatarios.find((d) => d.id === pedido) ?? destinatarios[0];
  const para = fila && contexto.correos.get(fila.id);
  const plantilla = fila && plantillaParaParticipante(contexto, fila.id);
  if (!fila || !para || !plantilla) return null;
  return { participanteId: fila.id, etiqueta: fila.etiqueta, para, asunto: plantilla.asunto, html: plantilla.html };
}
