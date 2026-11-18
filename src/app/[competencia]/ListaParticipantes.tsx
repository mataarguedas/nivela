"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Chip, TONO_POR_ESTADO } from "@/components/ui/Chip";
import { Dialogo } from "@/components/ui/Dialogo";
import { IconoChevron } from "@/components/ui/iconos";
import { TEXTOS } from "@/config/textos";
import { borrarTodo, estadoParticipante, useBorrador, useEvaluadorActivo } from "@/lib/borrador";
import { consultarEnviadas, type EstadoServidor } from "@/lib/envio";

type ListaParticipantesProps = {
  competenciaId: string;
  nombreCompetencia: string;
  /** `detalle`: "Participante 07" under a name, so it matches the person's tag; null without a name. */
  participantes: { id: string; etiqueta: string; detalle: string | null }[];
  indicadorIds: string[];
  /** Team member ids, to reject a stale or foreign stored selection. */
  evaluadorIds: string[];
  /** The signed-in evaluador (their account); null for the docente, who picks. */
  evaluadorSesion: string | null;
};

/**
 * What the server knows about this evaluator (PRD §5.4): `updated_at` by
 * participanteId and the participants they marked absent, from one GET
 * /api/evaluaciones each time the list mounts. estadoParticipante() merges
 * the sends with the local drafts; an absent mark overrides every status.
 * If the request fails the list just shows the local statuses: sends
 * recorded on this device still read "Enviado".
 */
function useEstadoServidor(competenciaId: string, evaluadorId: string | null): EstadoServidor {
  const [estado, setEstado] = useState<{ clave: string; datos: EstadoServidor } | null>(null);
  const clave = evaluadorId ? `${competenciaId}:${evaluadorId}` : null;

  useEffect(() => {
    if (!evaluadorId || !clave) return;
    const control = new AbortController();
    consultarEnviadas(competenciaId, evaluadorId, control.signal).then((datos) => {
      if (datos && !control.signal.aborted) setEstado({ clave, datos });
    });
    return () => control.abort();
  }, [competenciaId, evaluadorId, clave]);

  // Ignore a previous evaluator's answer until the new one arrives.
  return estado && estado.clave === clave ? estado.datos : SIN_DATOS;
}
const SIN_DATOS: EstadoServidor = { enviadas: {}, ausentes: [] };

export function ListaParticipantes({
  competenciaId,
  nombreCompetencia,
  participantes,
  indicadorIds,
  evaluadorIds,
  evaluadorSesion,
}: ListaParticipantesProps) {
  const router = useRouter();
  const { evaluadorId, leido } = useEvaluadorActivo(competenciaId, evaluadorIds, evaluadorSesion);
  const { borrador } = useBorrador(competenciaId, evaluadorId);
  const servidor = useEstadoServidor(competenciaId, evaluadorId);
  const [confirmando, setConfirmando] = useState(false);
  // Borrar todo also clears the evaluator; don't bounce to the evaluator step then.
  const saliendo = useRef(false);

  useEffect(() => {
    if (leido && !evaluadorId && !saliendo.current) router.replace(`/${competenciaId}/evaluador`);
  }, [leido, evaluadorId, competenciaId, router]);

  const listo = evaluadorId !== null && borrador !== undefined;
  const ausentes = new Set(servidor.ausentes);
  const estados = participantes.map((p) => {
    if (!listo) return undefined;
    if (ausentes.has(p.id)) return "ausente" as const;
    return estadoParticipante(borrador.participantes[p.id], indicadorIds, servidor.enviadas[p.id]);
  });
  const enviadas = estados.filter((e) => e === "enviado").length;
  const cantidadAusentes = estados.filter((e) => e === "ausente").length;
  // Absent participants leave the total and are counted apart (PRD §5.4).
  const total = participantes.length - cantidadAusentes;

  function confirmarBorrado() {
    saliendo.current = true;
    setConfirmando(false);
    borrarTodo();
    router.push("/");
  }

  return (
    <>
      <header className="mb-8 text-center">
        <p className="text-[14px] text-ink-2">{nombreCompetencia}</p>
        <h1 className="mt-1 text-h3 font-semibold md:text-h2">{TEXTOS.lista.titulo}</h1>
        {/* Fixed height so the list doesn't jump when the summary appears. */}
        <div className="mx-auto mt-4 h-10 max-w-[280px]">
          {listo && (
            <>
              <p className="text-body text-ink-3">
                {cantidadAusentes > 0
                  ? TEXTOS.asistencia.resumen(enviadas, total, cantidadAusentes)
                  : TEXTOS.lista.enviadas(enviadas, total)}
              </p>
              <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-pill bg-hairline">
                <div className="h-full rounded-pill bg-link" style={{ width: `${total ? (enviadas / total) * 100 : 0}%` }} />
              </div>
            </>
          )}
        </div>
      </header>

      <ul className="flex flex-col gap-2" aria-busy={!listo || undefined}>
        {participantes.map((participante, indice) => {
          const estado = estados[indice];
          return (
            <li key={participante.id}>
              <Link
                href={`/${competenciaId}/${participante.id}`}
                className="group flex min-h-14 w-full items-center gap-3 rounded-tile bg-surface px-4 py-3"
              >
                <span className="min-w-0 flex-1 break-words">
                  <span className="block text-body text-ink group-hover:text-link">{participante.etiqueta}</span>
                  {participante.detalle && <span className="block text-caption text-ink-2">{participante.detalle}</span>}
                </span>
                {estado && <Chip tono={TONO_POR_ESTADO[estado]}>{TEXTOS.estados[estado]}</Chip>}
                <IconoChevron className="shrink-0 text-ink-2" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex justify-center">
        <Boton variante="secundario" onClick={() => setConfirmando(true)} disabled={!leido}>
          {TEXTOS.lista.borrarTodo}
        </Boton>
      </div>

      <Dialogo
        abierto={confirmando}
        alCerrar={() => setConfirmando(false)}
        titulo={TEXTOS.lista.borrarTodo}
        descripcion={TEXTOS.lista.confirmarBorrado}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              {TEXTOS.ui.cancelar}
            </Boton>
            <Boton onClick={confirmarBorrado}>{TEXTOS.lista.borrarTodo}</Boton>
          </>
        }
      />
    </>
  );
}

