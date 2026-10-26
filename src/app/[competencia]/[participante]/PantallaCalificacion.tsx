"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarraEnvio } from "@/components/calificacion/BarraEnvio";
import { IndicadorSeccion } from "@/components/calificacion/IndicadorSeccion";
import { PanelSugerencia } from "@/components/calificacion/PanelSugerencia";
import { Desplegable } from "@/components/ui/Desplegable";
import { IconoChevron } from "@/components/ui/iconos";
import { useToast } from "@/components/ui/Toast";
import type { Indicador } from "@/config/competencias";
import type { Participante } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import {
  aplicarSugerencia,
  conCalificacion,
  conObservacion,
  contarCalificados,
  marcarEnviado,
  nivelManual,
  useBorrador,
  useEvaluadorSeleccionado,
  vaciarEscrituras,
} from "@/lib/borrador";
import { RUTA_ACCESO } from "@/lib/destino";
import { cuerpoEvaluacion, enviarEvaluacion } from "@/lib/envio";

// The rating screen's interactive part. Every change goes straight into the
// selected evaluator's draft (useBorrador: readers see it at once, storage
// gets it after the 300 ms debounce). Without a selected evaluator it sends
// the user to the evaluator step, like the participant list.
//
// "Enviar evaluación" (PRD §5.7) posts the draft as it is at that moment. On
// success it records `enviadoEn`, toasts "Evaluación enviada" and returns to
// the list; on failure the draft stays untouched and the bar offers
// "Reintentar". An expired session goes to /acceso and comes back here.
//
// Each indicator has a Jev panel (PRD §5.6); only one is open at a time, so
// a single filled "Analizar" is on screen. Applying a suggestion stores
// origen "ia" with its metadata; a later manual pick switches to "manual".

type PantallaCalificacionProps = {
  competencia: { id: string; nombre: string; definicion: string; fuente: string; indicadores: Indicador[] };
  participante: Participante;
  anterior: Participante | null;
  siguiente: Participante | null;
  /** Team member ids, to reject a stale or foreign stored selection. */
  evaluadorIds: string[];
};

export function PantallaCalificacion({
  competencia,
  participante,
  anterior,
  siguiente,
  evaluadorIds,
}: PantallaCalificacionProps) {
  const router = useRouter();
  const guardado = useEvaluadorSeleccionado(competencia.id);
  const evaluadorId = guardado && evaluadorIds.includes(guardado) ? guardado : null;
  const leido = guardado !== undefined;
  const { borrador, actualizar } = useBorrador(competencia.id, evaluadorId);
  const rutaLista = `/${competencia.id}`;

  useEffect(() => {
    if (leido && !evaluadorId) router.replace(`${rutaLista}/evaluador`);
  }, [leido, evaluadorId, rutaLista, router]);

  const entrada = evaluadorId ? borrador?.participantes[participante.id] : undefined;
  const indicadorIds = competencia.indicadores.map((i) => i.id);
  const faltan = indicadorIds.length - contarCalificados(entrada, indicadorIds);
  const { mostrar } = useToast();
  const [envio, setEnvio] = useState<"inactivo" | "enviando" | "error">("inactivo");
  const [panelAbierto, setPanelAbierto] = useState<string | null>(null);

  async function enviar() {
    if (!evaluadorId || !entrada || envio === "enviando") return;
    const ids = { competenciaId: competencia.id, evaluadorId, participanteId: participante.id };
    const cuerpo = cuerpoEvaluacion(ids, entrada, indicadorIds);
    if (!cuerpo) return;
    const modificadoEnEnviado = entrada.modificadoEn;
    setEnvio("enviando");
    const respuesta = await enviarEvaluacion(cuerpo);
    // Next keeps this page's state alive after navigating away (back/forward
    // and revisits restore it), so never leave "enviando" behind.
    setEnvio(respuesta.ok || respuesta.status === 401 ? "inactivo" : "error");

    if (respuesta.ok) {
      // Applied to the current draft: the user may have edited while the request was in flight.
      actualizar((actual) => marcarEnviado(actual, participante.id, modificadoEnEnviado));
      vaciarEscrituras(); // persist before leaving the page
      mostrar(TEXTOS.envio.exito);
      router.push(rutaLista);
      return;
    }
    if (respuesta.status === 401) {
      vaciarEscrituras();
      const destino = new URLSearchParams({ next: `${rutaLista}/${participante.id}`, motivo: "expirada" });
      router.push(`${RUTA_ACCESO}?${destino}`);
    }
  }

  function cambiar(indicadorId: string, cambio: Parameters<typeof conCalificacion>[3]) {
    actualizar((actual) => conCalificacion(actual, participante.id, indicadorId, cambio));
  }

  return (
    <>
      {/* Scroll margins keep a focused field clear of the sticky nav and bar. */}
      <div className="mx-auto w-full max-w-[640px] px-4 pt-2 pb-12 [&_*]:scroll-mt-16 [&_*]:scroll-mb-28">
        <Link
          href={rutaLista}
          aria-label={TEXTOS.calificacion.volverALista}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-pill px-2 text-[14px] text-link hover:underline"
        >
          <IconoChevron className="shrink-0 rotate-180" />
          {TEXTOS.lista.titulo}
        </Link>

        <header className="mt-4 text-center">
          <p className="text-[14px] text-ink-2">{competencia.nombre}</p>
          <h1 className="mt-1 text-h3 font-semibold md:text-h2">{participante.etiqueta}</h1>
        </header>

        <div className="mt-8 rounded-tile bg-surface px-4 py-2">
          <Desplegable titulo={TEXTOS.calificacion.definicion}>
            <p className="text-body text-ink">{competencia.definicion}</p>
            <p className="mt-2 pb-2 text-caption text-ink-3">{TEXTOS.calificacion.fuente(competencia.fuente)}</p>
          </Desplegable>
        </div>

        <p className="mt-4 text-caption text-ink-3">
          <span className="font-semibold">{TEXTOS.calificacion.notaTecnicaTitulo}</span> {TEXTOS.calificacion.notaTecnica}
        </p>

        <div className="mt-12 flex flex-col gap-14">
          {competencia.indicadores.map((indicador) => (
            <IndicadorSeccion
              key={indicador.id}
              indicador={indicador}
              calificacion={entrada?.calificaciones[indicador.id]}
              alCambiarNivel={(nivel) => cambiar(indicador.id, nivelManual(nivel))}
              alCambiarObservacion={(texto) => cambiar(indicador.id, conObservacion(texto))}
              panelAbierto={panelAbierto === indicador.id}
              alAlternarPanel={(abierto) => setPanelAbierto(abierto ? indicador.id : null)}
              panelSugerencia={
                <PanelSugerencia
                  competenciaId={competencia.id}
                  indicador={indicador}
                  observacionActual={entrada?.calificaciones[indicador.id]?.observacion}
                  alAplicar={(nivel, ia, observacion) => cambiar(indicador.id, aplicarSugerencia(nivel, ia, observacion))}
                />
              }
            />
          ))}
        </div>

        <nav aria-label={TEXTOS.calificacion.otrosParticipantes} className="mt-14 flex items-center justify-between gap-3">
          {anterior ? (
            <EnlaceParticipante href={`${rutaLista}/${anterior.id}`} prefijo={TEXTOS.calificacion.anterior} direccion="anterior">
              {anterior.etiqueta}
            </EnlaceParticipante>
          ) : (
            <span />
          )}
          {siguiente && (
            <EnlaceParticipante href={`${rutaLista}/${siguiente.id}`} prefijo={TEXTOS.calificacion.siguiente} direccion="siguiente">
              {siguiente.etiqueta}
            </EnlaceParticipante>
          )}
        </nav>
      </div>

      <BarraEnvio faltan={faltan} alEnviar={enviar} enviando={envio === "enviando"} error={envio === "error"} />
    </>
  );
}

function EnlaceParticipante({
  href,
  prefijo,
  direccion,
  children,
}: {
  href: string;
  prefijo: string;
  direccion: "anterior" | "siguiente";
  children: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 rounded-pill px-2 text-[14px] text-link hover:underline"
    >
      {direccion === "anterior" && <IconoChevron className="shrink-0 rotate-180" />}
      <span className="sr-only">{prefijo} </span>
      {children}
      {direccion === "siguiente" && <IconoChevron className="shrink-0" />}
    </Link>
  );
}
