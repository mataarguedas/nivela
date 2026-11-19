import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { nombreJornada } from "@/config/jornadas";
import { etiquetaNumero, ordenarPorGrupo } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import { cargarParticipantes } from "@/lib/db/participantes";
import { contextoEvaluacion } from "@/lib/jornadaActual";
import { ListaParticipantes } from "./ListaParticipantes";

// Participant list (PRD §5.4, FR-4). Statuses come from the local draft of
// the evaluator (the signed-in evaluador, or the docente's selection), so the list itself is a client component; without
// a selected evaluator it sends the user to the evaluator step. The layout
// already answered 404 for unknown competencias; params are read behind
// Suspense so navigating here from a sibling page is instant. Participants
// (names set by the admin) are read from the DB at request time, for the
// session's jornada only.

// Not validated in dev; see the note in ../layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Participantes · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaParticipantes({ params }: PageProps<"/[competencia]">) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-12 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-16">
      <div className="mx-auto w-full max-w-[640px]">
        <Suspense fallback={null}>
          <Lista params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Lista({ params }: Pick<PageProps<"/[competencia]">, "params">) {
  const { competencia: id } = await params;
  // Null too when an evaluador opens another team's competencia, or when
  // the jornada has no rubric for it.
  const contexto = await contextoEvaluacion(id);
  if (!contexto) notFound();
  const { jornada, competencia, equipo, evaluadorSesion } = contexto;

  const participantes = await cargarParticipantes("/[competencia]", jornada);
  if (!participantes) {
    return (
      <p role="alert" className="pt-10 text-center text-body text-ink">
        {TEXTOS.lista.errorCarga}
      </p>
    );
  }

  return (
    <ListaParticipantes
      competenciaId={competencia.id}
      // Names the jornada: the docente may have switched it on Inicio (PRD §5.11).
      nombreCompetencia={`${competencia.nombre} · ${TEXTOS.jornada.actual(nombreJornada(jornada))}`}
      // By group, then by number (PRD §5.4, v1.8); the rating screen walks the same order.
      participantes={ordenarPorGrupo(participantes).map((p) => ({
        id: p.id,
        etiqueta: p.etiqueta,
        detalle: p.nombre ? etiquetaNumero(p.numero) : null,
        grupo: p.grupo,
      }))}
      indicadorIds={competencia.indicadores.map((i) => i.id)}
      evaluadorIds={equipo.integrantes.map((i) => i.id)}
      evaluadorSesion={evaluadorSesion}
    />
  );
}
