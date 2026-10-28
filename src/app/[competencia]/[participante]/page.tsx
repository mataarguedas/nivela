import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { obtenerCompetenciaHabilitada } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";
import { TEXTOS } from "@/config/textos";
import { cargarParticipantes } from "@/lib/db/participantes";
import { PantallaCalificacion } from "./PantallaCalificacion";

// Rating screen (PRD §5.5, FR-5, FR-6). The layouts already answered 404 for
// unknown competencias and malformed participant ids; whether the participant
// is active is checked here against the DB. Params are read behind Suspense
// so moving between participants is instant. The client gets the rubric
// text, the team ids and the participant's name and code; the names never
// go to Jev (only the observation text does).

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
  if (!competencia || !equipo) notFound();

  const participantes = await cargarParticipantes("/[competencia]/[participante]");
  if (!participantes) {
    return (
      <p role="alert" className="px-4 pt-16 text-center text-body text-ink">
        {TEXTOS.lista.errorCarga}
      </p>
    );
  }
  // A participant the admin has hidden (or never created).
  const indice = participantes.findIndex((p) => p.id === idParticipante);
  if (indice === -1) notFound();

  return (
    <PantallaCalificacion
      competencia={{
        id: competencia.id,
        nombre: competencia.nombre,
        definicion: competencia.definicion,
        fuente: competencia.fuente,
        indicadores: competencia.indicadores,
      }}
      participante={participantes[indice]}
      anterior={participantes[indice - 1] ?? null}
      siguiente={participantes[indice + 1] ?? null}
      evaluadorIds={equipo.integrantes.map((i) => i.id)}
    />
  );
}
