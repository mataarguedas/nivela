"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Boton } from "@/components/ui/Boton";
import { Chip, TONO_POR_ESTADO } from "@/components/ui/Chip";
import { Dialogo } from "@/components/ui/Dialogo";
import { IconoChevron } from "@/components/ui/iconos";
import { etiquetaGrupo } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import { borrarTodo, descartarEnviosBorrados, estadoParticipante, useBorrador, useEvaluadorActivo } from "@/lib/borrador";
import { consultarEnviadas, type EstadoServidor } from "@/lib/envio";

type ListaParticipantesProps = {
  competenciaId: string;
  nombreCompetencia: string;
  /**
   * In the order to show them (by group, then number). `detalle`: "Participante 07"
   * under a name, so it matches the person's tag; null without a name. `grupo`:
   * the COFI group (v1.8), null for "Sin grupo".
   */
  participantes: { id: string; etiqueta: string; detalle: string | null; grupo: number | null }[];
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
 * Once the server has answered, local send records it no longer has are
 * dropped (descartarEnviosBorrados): those evaluations were deleted on the
 * server. If the request fails the list just shows the local statuses: sends
 * recorded on this device still read "Enviado".
 */
function useEstadoServidor(competenciaId: string, evaluadorId: string | null): RespuestaServidor | null {
  const [estado, setEstado] = useState<{ clave: string; respuesta: RespuestaServidor } | null>(null);
  const clave = evaluadorId ? `${competenciaId}:${evaluadorId}` : null;

  useEffect(() => {
    if (!evaluadorId || !clave) return;
    const control = new AbortController();
    const consultadoEn = new Date();
    consultarEnviadas(competenciaId, evaluadorId, control.signal).then((datos) => {
      if (datos && !control.signal.aborted) setEstado({ clave, respuesta: { datos, consultadoEn } });
    });
    return () => control.abort();
  }, [competenciaId, evaluadorId, clave]);

  // Ignore a previous evaluator's answer until the new one arrives.
  return estado && estado.clave === clave ? estado.respuesta : null;
}
type RespuestaServidor = { datos: EstadoServidor; consultadoEn: Date };
const SIN_DATOS: EstadoServidor = { enviadas: {}, ausentes: [] };

type Estado = ReturnType<typeof estadoParticipante> | "ausente" | undefined;
type Seccion = { grupo: number | null; indices: number[] };

/**
 * Consecutive runs of the same group (the list arrives sorted by group, PRD
 * §5.4). When nobody has a group there is one untitled section: the plain
 * list from before v1.8.
 */
function secciones(grupos: readonly (number | null)[]): Seccion[] {
  const resultado: Seccion[] = [];
  grupos.forEach((grupo, indice) => {
    const ultima = resultado.at(-1);
    if (ultima && ultima.grupo === grupo) ultima.indices.push(indice);
    else resultado.push({ grupo, indices: [indice] });
  });
  return resultado;
}

// The group picker (PRD §5.4, v1.8): "Todos los grupos" or one group. The
// choice is a per-tab convenience in sessionStorage, so it survives opening a
// participant, "Volver" and a reload; it lives outside the drafts' "nivela:v1:"
// prefix, so borrador.ts never sees it. Read through useSyncExternalStore: the
// server and the first client render both show every group.
const TODOS = "todos";
const SIN_GRUPO = "sin";
const oyentesFiltro = new Set<() => void>();
const filtroEnMemoria = new Map<string, string>();

function claveFiltro(competenciaId: string): string {
  return `nivela-grupo:${competenciaId}`;
}

function leerFiltro(competenciaId: string): string {
  const clave = claveFiltro(competenciaId);
  try {
    return window.sessionStorage.getItem(clave) ?? filtroEnMemoria.get(clave) ?? TODOS;
  } catch {
    return filtroEnMemoria.get(clave) ?? TODOS;
  }
}

function guardarFiltro(competenciaId: string, valor: string) {
  const clave = claveFiltro(competenciaId);
  filtroEnMemoria.set(clave, valor);
  try {
    window.sessionStorage.setItem(clave, valor);
  } catch {
    // Storage blocked: the in-memory copy still works on this page.
  }
  oyentesFiltro.forEach((avisar) => avisar());
}

function suscribirFiltro(avisar: () => void) {
  oyentesFiltro.add(avisar);
  return () => oyentesFiltro.delete(avisar);
}

function valorGrupo(grupo: number | null): string {
  return grupo === null ? SIN_GRUPO : String(grupo);
}

/** "3 de 5 enviadas" for a group; absent participants leave its total, as in the summary. */
function avance(estados: readonly Estado[]): string {
  const ausentes = estados.filter((e) => e === "ausente").length;
  return TEXTOS.lista.enviadas(estados.filter((e) => e === "enviado").length, estados.length - ausentes);
}

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
  const { borrador: borradorGuardado, actualizar } = useBorrador(competenciaId, evaluadorId);
  const respuesta = useEstadoServidor(competenciaId, evaluadorId);
  const servidor = respuesta?.datos ?? SIN_DATOS;
  const [confirmando, setConfirmando] = useState(false);
  // Borrar todo also clears the evaluator; don't bounce to the evaluator step then.
  const saliendo = useRef(false);

  useEffect(() => {
    if (leido && !evaluadorId && !saliendo.current) router.replace(`/${competenciaId}/evaluador`);
  }, [leido, evaluadorId, competenciaId, router]);

  // Evaluations deleted on the server read "Pendiente" right away (`borrador`
  // is the draft without them) and leave the stored draft too.
  const ids = participantes.map((p) => p.id);
  const borrador =
    borradorGuardado && respuesta
      ? descartarEnviosBorrados(borradorGuardado, respuesta.datos.enviadas, ids, respuesta.consultadoEn)
      : borradorGuardado;
  const hayDescartes = borrador !== borradorGuardado;
  useEffect(() => {
    if (!hayDescartes || !respuesta) return;
    actualizar((actual) => descartarEnviosBorrados(actual, respuesta.datos.enviadas, ids, respuesta.consultadoEn));
    // `ids` follows `participantes`; re-running only when a drop is pending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayDescartes, respuesta, actualizar]);

  const listo = evaluadorId !== null && borrador !== undefined;
  const ausentes = new Set(servidor.ausentes);
  const estados: Estado[] = participantes.map((p) => {
    if (!listo) return undefined;
    if (ausentes.has(p.id)) return "ausente" as const;
    return estadoParticipante(borrador.participantes[p.id], indicadorIds, servidor.enviadas[p.id]);
  });
  const enviadas = estados.filter((e) => e === "enviado").length;
  const cantidadAusentes = estados.filter((e) => e === "ausente").length;
  // Absent participants leave the total and are counted apart (PRD §5.4).
  const total = participantes.length - cantidadAusentes;
  const grupos = secciones(participantes.map((p) => p.grupo));
  const conGrupos = participantes.some((p) => p.grupo !== null);
  const idFiltro = useId();
  const guardado = useSyncExternalStore(
    suscribirFiltro,
    () => leerFiltro(competenciaId),
    () => TODOS,
  );
  // A stored group that no longer exists (the admin changed the list) shows every group.
  const filtro = grupos.some((s) => valorGrupo(s.grupo) === guardado) ? guardado : TODOS;
  const visibles = conGrupos && filtro !== TODOS ? grupos.filter((s) => valorGrupo(s.grupo) === filtro) : grupos;

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

      {conGrupos && (
        <div className="mb-6 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor={idFiltro} className="text-[14px] text-ink-2">
            {TEXTOS.lista.filtroGrupo}
          </label>
          <select
            id={idFiltro}
            value={filtro}
            onChange={(e) => guardarFiltro(competenciaId, e.target.value)}
            className="min-h-11 w-full rounded-tile border border-control bg-surface px-3 text-body text-ink focus:border-link sm:w-auto"
          >
            <option value={TODOS}>{TEXTOS.lista.todosLosGrupos}</option>
            {grupos.map(({ grupo, indices }) => (
              <option key={valorGrupo(grupo)} value={valorGrupo(grupo)}>
                {TEXTOS.lista.opcionGrupo(grupo === null ? TEXTOS.lista.sinGrupo : etiquetaGrupo(grupo), indices.length)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Split by COFI group (PRD §5.4, v1.8): a heading and its own progress per group. */}
      <div className="flex flex-col gap-8" aria-busy={!listo || undefined}>
        {visibles.map(({ grupo, indices }) => {
          const titulo = conGrupos ? (grupo === null ? TEXTOS.lista.sinGrupo : etiquetaGrupo(grupo)) : null;
          const idTitulo = `grupo-${grupo ?? "sin"}`;
          const lista = (
            <ul className="flex flex-col gap-2" aria-labelledby={titulo ? idTitulo : undefined}>
              {indices.map((indice) => {
                const participante = participantes[indice];
                const estado = estados[indice];
                return (
                  <li key={participante.id}>
                    <Link
                      href={`/${competenciaId}/${participante.id}`}
                      className="group flex min-h-14 w-full items-center gap-3 rounded-tile bg-surface px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 break-words">
                        <span className="block text-body text-ink group-hover:text-link">{participante.etiqueta}</span>
                        {participante.detalle && (
                          <span className="block text-caption text-ink-2">{participante.detalle}</span>
                        )}
                      </span>
                      {estado && <Chip tono={TONO_POR_ESTADO[estado]}>{TEXTOS.estados[estado]}</Chip>}
                      <IconoChevron className="shrink-0 text-ink-2" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          );
          if (!titulo) return <div key="todos">{lista}</div>;
          return (
            <section key={idTitulo} aria-labelledby={idTitulo}>
              <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                <h2 id={idTitulo} className="text-sub font-semibold text-ink">
                  {titulo}
                </h2>
                {/* Fixed height so the heading doesn't jump when the progress appears. */}
                <p className="min-h-5 shrink-0 text-[14px] text-ink-3">
                  {listo ? avance(indices.map((i) => estados[i])) : null}
                </p>
              </div>
              {lista}
            </section>
          );
        })}
      </div>

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

