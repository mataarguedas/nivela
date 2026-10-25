import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { obtenerCompetenciaHabilitada } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";
import { PARTICIPANTES } from "@/config/participantes";
import { PantallaCalificacion } from "./PantallaCalificacion";

// Rating screen (PRD §5.5, FR-5, FR-6). The layouts already answered 404 for
// unknown competencias and participants; params are read behind Suspense so
// moving between participants is instant. Only the rubric text, the
// participant codes and the team ids reach the client: no names.

// Not validated in dev; see the note in ../layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Calificación · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaCalificacion({ params }: PageProps<"/[competencia]/[participante]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <Calificacion params={params} />
      </Suspense>
    </main>
  );
}

async function Calificacion({ params }: Pick<PageProps<"/[competencia]/[participante]">, "params">) {
  const { competencia: idCompetencia, participante: idParticipante } = await params;
  const competencia = obtenerCompetenciaHabilitada(idCompetencia);
  const equipo = competencia && equipoDeCompetencia(competencia.id);
  const indice = PARTICIPANTES.findIndex((p) => p.id === idParticipante);
  if (!competencia || !equipo || indice === -1) notFound();

  return (
    <PantallaCalificacion
      competencia={{
        id: competencia.id,
        nombre: competencia.nombre,
        definicion: competencia.definicion,
        fuente: competencia.fuente,
        indicadores: competencia.indicadores,
      }}
      participante={PARTICIPANTES[indice]}
      anterior={PARTICIPANTES[indice - 1] ?? null}
      siguiente={PARTICIPANTES[indice + 1] ?? null}
      evaluadorIds={equipo.integrantes.map((i) => i.id)}
    />
  );
}
