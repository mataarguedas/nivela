"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarraEnvio } from "@/components/calificacion/BarraEnvio";
import { IndicadorSeccion } from "@/components/calificacion/IndicadorSeccion";
import { PanelSugerencia } from "@/components/calificacion/PanelSugerencia";
import { Boton } from "@/components/ui/Boton";
import { Chip, TONO_POR_ESTADO } from "@/components/ui/Chip";
import { Desplegable } from "@/components/ui/Desplegable";
import { Dialogo } from "@/components/ui/Dialogo";
import { IconoChevron } from "@/components/ui/iconos";
import { useToast } from "@/components/ui/Toast";
import type { Indicador } from "@/config/competencias";
import { etiquetaGrupo, etiquetaNumero, type Participante } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import {
  aplicarSugerencia,
  conCalificacion,
  conObservacion,
  contarCalificados,
  descartarEnviosBorrados,
  marcarEnviado,
  nivelManual,
  useBorrador,
  useEvaluadorActivo,
  vaciarEscrituras,
} from "@/lib/borrador";
import { guardarAsistencia } from "@/lib/asistencia";
import { RUTA_ACCESO } from "@/lib/destino";
import { consultarEnviadas, cuerpoEvaluacion, enviarEvaluacion } from "@/lib/envio";

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
//
// Attendance (PRD §5.13): "Marcar ausente" (secondary, under the header)
// asks for confirmation and saves the mark to the server at once; nothing
// is stored offline. While absent, the bottom bar shows the notice and
// "Marcar presente" instead of "Enviar evaluación". The draft is never
// touched by either action.

/**
 * This evaluator's absent mark for the participant, read from GET
 * /api/evaluaciones on mount. `conocido` is false until the server answers;
 * if it can't, the screen behaves as "present" and the server still refuses
 * to accept an evaluation for an absent participant (409).
 *
 * `envios` is that same answer's sends (null if the server couldn't answer),
 * so the screen can drop a local send record the server no longer has
 * (descartarEnviosBorrados, PRD §5.4).
 */
function useAsistencia(competenciaId: string, evaluadorId: string | null, participanteId: string) {
  const clave = evaluadorId ? `${competenciaId}:${evaluadorId}:${participanteId}` : null;
  const [estado, setEstado] = useState<{
    clave: string;
    ausente: boolean;
    envios: { enviadas: Record<string, string>; consultadoEn: Date } | null;
  } | null>(null);

  useEffect(() => {
    if (!evaluadorId || !clave) return;
    const control = new AbortController();
    const consultadoEn = new Date();
    consultarEnviadas(competenciaId, evaluadorId, control.signal).then((datos) => {
      if (control.signal.aborted) return;
      setEstado({
        clave,
        ausente: datos?.ausentes.includes(participanteId) ?? false,
        envios: datos ? { enviadas: datos.enviadas, consultadoEn } : null,
      });
    });
    return () => control.abort();
  }, [competenciaId, evaluadorId, participanteId, clave]);

  const actual = estado && estado.clave === clave ? estado : null;
  const fijar = (ausente: boolean) => {
    if (clave) setEstado((previo) => ({ clave, ausente, envios: previo?.clave === clave ? previo.envios : null }));
  };
  return { ausente: actual?.ausente ?? false, conocido: actual !== null, envios: actual?.envios ?? null, fijar };
}

type PantallaCalificacionProps = {
  competencia: { id: string; nombre: string; definicion: string; fuente: string; indicadores: Indicador[] };
  participante: Participante;
  anterior: Participante | null;
  siguiente: Participante | null;
  /** Team member ids, to reject a stale or foreign stored selection. */
  evaluadorIds: string[];
  /** The signed-in evaluador (their account); null for the docente, who picks. */
  evaluadorSesion: string | null;
};

export function PantallaCalificacion({
  competencia,
  participante,
  anterior,
  siguiente,
  evaluadorIds,
  evaluadorSesion,
}: PantallaCalificacionProps) {
  const router = useRouter();
  const { evaluadorId, leido } = useEvaluadorActivo(competencia.id, evaluadorIds, evaluadorSesion);
  const { borrador: guardado, actualizar } = useBorrador(competencia.id, evaluadorId);
  const asistencia = useAsistencia(competencia.id, evaluadorId, participante.id);
  const rutaLista = `/${competencia.id}`;

  useEffect(() => {
    if (leido && !evaluadorId) router.replace(`${rutaLista}/evaluador`);
  }, [leido, evaluadorId, rutaLista, router]);

  // An evaluation deleted on the server (PRD §5.4): the old ratings leave the
  // screen at once and the stored draft right after, so it starts empty.
  const envios = asistencia.envios;
  const borrador =
    guardado && envios
      ? descartarEnviosBorrados(guardado, envios.enviadas, [participante.id], envios.consultadoEn)
      : guardado;
  const hayDescarte = borrador !== guardado;
  useEffect(() => {
    if (!hayDescarte || !envios) return;
    actualizar((actual) => descartarEnviosBorrados(actual, envios.enviadas, [participante.id], envios.consultadoEn));
  }, [hayDescarte, envios, participante.id, actualizar]);

  const entrada = evaluadorId ? borrador?.participantes[participante.id] : undefined;
  const indicadorIds = competencia.indicadores.map((i) => i.id);
  const faltan = indicadorIds.length - contarCalificados(entrada, indicadorIds);
  const { mostrar } = useToast();
  const [envio, setEnvio] = useState<"inactivo" | "enviando" | "error">("inactivo");
  const [panelAbierto, setPanelAbierto] = useState<string | null>(null);
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);
  const [confirmandoAusente, setConfirmandoAusente] = useState(false);

  function irAAcceso() {
    vaciarEscrituras();
    const destino = new URLSearchParams({ next: `${rutaLista}/${participante.id}`, motivo: "expirada" });
    router.push(`${RUTA_ACCESO}?${destino}`);
  }

  async function cambiarAsistencia(ausente: boolean) {
    if (!evaluadorId || guardandoAsistencia) return;
    setGuardandoAsistencia(true);
    const respuesta = await guardarAsistencia({
      competenciaId: competencia.id,
      evaluadorId,
      participanteId: participante.id,
      ausente,
    });
    setGuardandoAsistencia(false);
    if (respuesta.ok) {
      asistencia.fijar(respuesta.ausente);
      return;
    }
    if (respuesta.status === 401) irAAcceso();
    else mostrar(respuesta.status === 409 ? TEXTOS.asistencia.yaEnviada : TEXTOS.asistencia.error);
  }

  function confirmarAusente() {
    setConfirmandoAusente(false);
    void cambiarAsistencia(true);
  }

  async function enviar() {
    if (!evaluadorId || !entrada || envio === "enviando" || asistencia.ausente) return;
    const ids = { competenciaId: competencia.id, evaluadorId, participanteId: participante.id };
    const cuerpo = cuerpoEvaluacion(ids, entrada, indicadorIds);
    if (!cuerpo) return;
    const modificadoEnEnviado = entrada.modificadoEn;
    setEnvio("enviando");
    const respuesta = await enviarEvaluacion(cuerpo);
    // Next keeps this page's state alive after navigating away (back/forward
    // and revisits restore it), so never leave "enviando" behind.
    // 409: marked absent (e.g. on another device): show that instead of an error.
    setEnvio(respuesta.ok || respuesta.status === 401 || respuesta.status === 409 ? "inactivo" : "error");
    if (!respuesta.ok && respuesta.status === 409) asistencia.fijar(true);

    if (respuesta.ok) {
      // Applied to the current draft: the user may have edited while the request was in flight.
      actualizar((actual) => marcarEnviado(actual, participante.id, modificadoEnEnviado));
      vaciarEscrituras(); // persist before leaving the page
      mostrar(TEXTOS.envio.exito);
      router.push(rutaLista);
      return;
    }
    if (respuesta.status === 401) irAAcceso();
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
          <h1 className="mt-1 text-h3 font-semibold break-words md:text-h2">{participante.etiqueta}</h1>
          {/* With a name, the number still matches the person's tag; the group is the COFI group (v1.8). */}
          {(participante.nombre || participante.grupo !== null) && (
            <p className="mt-1 text-[14px] text-ink-2">
              {[
                participante.nombre ? etiquetaNumero(participante.numero) : null,
                participante.grupo !== null ? etiquetaGrupo(participante.grupo) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {/* Attendance (PRD §5.5, §5.13): the way back is "Marcar presente" in the bar. */}
          <div className="mt-4 flex min-h-11 justify-center">
            {asistencia.ausente ? (
              <Chip tono={TONO_POR_ESTADO.ausente} className="self-center">
                {TEXTOS.estados.ausente}
              </Chip>
            ) : (
              <Boton
                variante="secundario"
                onClick={() => setConfirmandoAusente(true)}
                disabled={!evaluadorId || !asistencia.conocido}
                cargando={guardandoAsistencia}
                textoCargando={TEXTOS.asistencia.guardando}
              >
                {TEXTOS.asistencia.marcarAusente}
              </Boton>
            )}
          </div>
        </header>

        <div className="mt-8 rounded-tile bg-surface px-4 py-2">
          <Desplegable titulo={TEXTOS.calificacion.definicion}>
            {/* Some templates have more than one paragraph, separated by "
". */}
            <p className="text-body whitespace-pre-line text-ink">{competencia.definicion}</p>
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

      <BarraEnvio
        faltan={faltan}
        alEnviar={enviar}
        enviando={envio === "enviando"}
        error={envio === "error"}
        ausente={asistencia.ausente}
        alMarcarPresente={() => void cambiarAsistencia(false)}
        guardandoAsistencia={guardandoAsistencia}
      />

      <Dialogo
        abierto={confirmandoAusente}
        alCerrar={() => setConfirmandoAusente(false)}
        titulo={TEXTOS.asistencia.marcarAusente}
        descripcion={TEXTOS.asistencia.confirmar(participante.etiqueta)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmandoAusente(false)}>
              {TEXTOS.ui.cancelar}
            </Boton>
            <Boton onClick={confirmarAusente}>{TEXTOS.asistencia.marcarAusente}</Boton>
          </>
        }
      />
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
