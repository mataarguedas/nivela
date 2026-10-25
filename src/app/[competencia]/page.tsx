import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { obtenerCompetenciaHabilitada } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";
import { PARTICIPANTES } from "@/config/participantes";
import { ListaParticipantes } from "./ListaParticipantes";

// Participant list (PRD §5.4, FR-4). Statuses come from the local draft of
// the selected evaluator, so the list itself is a client component; without
// a selected evaluator it sends the user to the evaluator step. The layout
// already answered 404 for unknown competencias; params are read behind
// Suspense so navigating here from a sibling page is instant.

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
  const competencia = obtenerCompetenciaHabilitada(id);
  const equipo = competencia && equipoDeCompetencia(competencia.id);
  if (!competencia || !equipo) notFound();

  return (
    <ListaParticipantes
      competenciaId={competencia.id}
      nombreCompetencia={competencia.nombre}
      participantes={PARTICIPANTES.map(({ id, etiqueta }) => ({ id, etiqueta }))}
      indicadorIds={competencia.indicadores.map((i) => i.id)}
      evaluadorIds={equipo.integrantes.map((i) => i.id)}
    />
  );
}
