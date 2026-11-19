import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CURSOS } from "@/config/equipos";
import { nombreJornada } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import { contextoEvaluacion } from "@/lib/jornadaActual";
import { SelectorEvaluador, type GrupoCurso } from "./SelectorEvaluador";

// Evaluator step (PRD §5.3, FR-3), docente only: an evaluador is sent on to
// the participant list, since their account says who they are. Only the members of the session jornada's
// team assigned to this competencia, grouped by curso. The layout answers 404 for unknown or
// disabled ones. The headings land in the App Shell (as the fallback);
// everything that depends on the URL streams in behind Suspense, so
// navigating here from a sibling page is instant.

// Not validated in dev; see the note in ../layout.tsx.
export const instant = false;

export const metadata: Metadata = {
  title: "Evaluador · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaEvaluador({ params }: PageProps<"/[competencia]/evaluador">) {
  return (
    <main className="flex flex-1 flex-col px-4 pt-12 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-16">
      <div className="mx-auto w-full max-w-[640px]">
        <Suspense fallback={<Encabezado />}>
          <Equipo params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Equipo({ params }: Pick<PageProps<"/[competencia]/evaluador">, "params">) {
  const { competencia: id } = await params;
  const contexto = await contextoEvaluacion(id);
  if (!contexto) notFound();
  const { jornada, competencia, equipo } = contexto;
  // Evaluadores don't choose: their account says who they are (PRD §5.3).
  if (contexto.evaluadorSesion) redirect(`/${competencia.id}`);

  const grupos: GrupoCurso[] = CURSOS.map((curso) => ({
    curso,
    integrantes: equipo.integrantes.filter((i) => i.curso === curso).map(({ id, nombre }) => ({ id, nombre })),
  })).filter((g) => g.integrantes.length > 0);

  return (
    <>
      {/* Names the jornada: the docente may have switched it on Inicio (PRD §5.11). */}
      <Encabezado competencia={`${competencia.nombre} · ${TEXTOS.jornada.actual(nombreJornada(jornada))}`} />
      <SelectorEvaluador competenciaId={competencia.id} grupos={grupos} />
    </>
  );
}

function Encabezado({ competencia }: { competencia?: string }) {
  return (
    <header className="mb-8 text-center">
      {/* The non-breaking space keeps the line's height in the fallback. */}
      <p className="text-[14px] text-ink-2">{competencia ?? " "}</p>
      <h1 className="mt-1 text-h3 font-semibold md:text-h2">{TEXTOS.evaluador.titulo}</h1>
      <p className="mt-2 text-body text-ink-3">{TEXTOS.evaluador.instruccion}</p>
    </header>
  );
}
