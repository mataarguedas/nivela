"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { TEXTOS } from "@/config/textos";
import { useEvaluadorSeleccionado } from "@/lib/borrador";

// The evaluator's name in the nav's right slot (PRD §12). The nav lives in
// the root layout, but the selection is per competencia and only in
// localStorage, so the [competencia] layout publishes its team here and the
// nav reads it. Team names therefore ship only with the routes that show
// them, never with /acceso. For the docente the name links to the evaluator
// step to switch; a signed-in evaluador (`fijo`) is who their account says,
// so their name is plain text.

type Integrante = { id: string; nombre: string };
type Equipo = { competenciaId: string; integrantes: readonly Integrante[]; fijo: string | null };

let publicado: Equipo | null = null;
const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function publicar(equipo: Equipo | null) {
  publicado = equipo;
  for (const oyente of oyentes) oyente();
}

/** Renders nothing; makes `integrantes` available to the nav while mounted. */
export function PublicarEvaluadorNav({ competenciaId, integrantes, fijo }: Equipo) {
  useEffect(() => {
    const equipo = { competenciaId, integrantes, fijo };
    publicar(equipo);
    return () => {
      if (publicado === equipo) publicar(null);
    };
  }, [competenciaId, integrantes, fijo]);
  return null;
}

export function NavEvaluador() {
  const equipo = useSyncExternalStore(
    suscribir,
    () => publicado,
    () => null,
  );
  if (!equipo) return null;
  if (equipo.fijo) {
    const nombre = equipo.integrantes.find((i) => i.id === equipo.fijo)?.nombre;
    return nombre ? (
      <span className="inline-flex min-h-11 min-w-0 items-center px-2 text-[14px] text-ink-3">
        <span className="sr-only">{TEXTOS.evaluador.enNav} </span>
        <span className="truncate">{nombre}</span>
      </span>
    ) : null;
  }
  return <NombreEvaluador equipo={equipo} />;
}

function NombreEvaluador({ equipo }: { equipo: Equipo }) {
  const evaluadorId = useEvaluadorSeleccionado(equipo.competenciaId);
  const nombre = equipo.integrantes.find((i) => i.id === evaluadorId)?.nombre;
  if (!nombre) return null;
  return (
    <Link
      href={`/${equipo.competenciaId}/evaluador`}
      className="inline-flex min-h-11 min-w-0 items-center rounded-pill px-2 text-[14px] text-ink-3 hover:text-ink"
    >
      <span className="sr-only">{TEXTOS.evaluador.enNav} </span>
      <span className="truncate">{nombre}</span>
    </Link>
  );
}
