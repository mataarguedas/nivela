"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Chip, TONO_POR_ESTADO } from "@/components/ui/Chip";
import { Dialogo } from "@/components/ui/Dialogo";
import { IconoChevron } from "@/components/ui/iconos";
import { TEXTOS } from "@/config/textos";
import { borrarTodo, estadoParticipante, useBorrador, useEvaluadorSeleccionado } from "@/lib/borrador";
import { consultarEnviadas } from "@/lib/envio";

type ListaParticipantesProps = {
  competenciaId: string;
  nombreCompetencia: string;
  participantes: { id: string; etiqueta: string }[];
  indicadorIds: string[];
  /** Team member ids, to reject a stale or foreign stored selection. */
  evaluadorIds: string[];
};

/**
 * Server `updated_at` by participanteId (PRD §5.4), from GET
 * /api/evaluaciones, fetched each time the list mounts. estadoParticipante()
 * merges it with the local drafts. If the request fails the list just shows
 * the local statuses: sends recorded on this device still read "Enviado".
 */
function useEnviadosServidor(competenciaId: string, evaluadorId: string | null): Record<string, string> {
  const [enviados, setEnviados] = useState<{ clave: string; porParticipante: Record<string, string> } | null>(null);
  const clave = evaluadorId ? `${competenciaId}:${evaluadorId}` : null;

  useEffect(() => {
    if (!evaluadorId || !clave) return;
    const control = new AbortController();
    consultarEnviadas(competenciaId, evaluadorId, control.signal).then((porParticipante) => {
      if (porParticipante && !control.signal.aborted) setEnviados({ clave, porParticipante });
    });
    return () => control.abort();
  }, [competenciaId, evaluadorId, clave]);

  // Ignore a previous evaluator's answer until the new one arrives.
  return enviados && enviados.clave === clave ? enviados.porParticipante : SIN_ENVIOS;
}
const SIN_ENVIOS: Record<string, string> = {};

export function ListaParticipantes({
  competenciaId,
  nombreCompetencia,
  participantes,
  indicadorIds,
  evaluadorIds,
}: ListaParticipantesProps) {
  const router = useRouter();
  const guardado = useEvaluadorSeleccionado(competenciaId);
  const evaluadorId = guardado && evaluadorIds.includes(guardado) ? guardado : null;
  const leido = guardado !== undefined;
  const { borrador } = useBorrador(competenciaId, evaluadorId);
  const enviadosServidor = useEnviadosServidor(competenciaId, evaluadorId);
  const [confirmando, setConfirmando] = useState(false);
  // Borrar todo also clears the evaluator; don't bounce to the evaluator step then.
  const saliendo = useRef(false);

  useEffect(() => {
    if (leido && !evaluadorId && !saliendo.current) router.replace(`/${competenciaId}/evaluador`);
  }, [leido, evaluadorId, competenciaId, router]);

  const listo = evaluadorId !== null && borrador !== undefined;
  const estados = participantes.map((p) =>
    listo ? estadoParticipante(borrador.participantes[p.id], indicadorIds, enviadosServidor[p.id]) : undefined,
  );
  const enviadas = estados.filter((e) => e === "enviado").length;
  const total = participantes.length;

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
              <p className="text-body text-ink-3">{TEXTOS.lista.enviadas(enviadas, total)}</p>
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
                <span className="min-w-0 flex-1 text-body text-ink group-hover:text-link">{participante.etiqueta}</span>
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

