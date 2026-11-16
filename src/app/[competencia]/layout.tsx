import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicarEvaluadorNav } from "@/components/ui/NavEvaluador";
import { COMPETENCIAS, obtenerCompetenciaHabilitada } from "@/config/competencias";
import { competenciaConEquipo, equipoDeCompetencia } from "@/config/equipos";
import { jornadaActual } from "@/lib/jornadaActual";

// Shared by every /[competencia] route (evaluator step, participant list,
// rating screen). Unknown or disabled competencias get a real 404 here: the
// check runs before anything streams. It is config-only (a team in some
// jornada); whether the session's jornada has a team for it needs the cookie,
// so each page checks that behind its Suspense boundary. A notFound() inside a page's Suspense
// boundary would arrive after the shell, as a 200. The price is that entering
// a competencia from outside blocks on this (config-only) render, hence
// `instant = false`; navigations between the pages below stay instant
// because each page reads params behind its own Suspense.
//
// Every page under this layout must ALSO export `instant = false`. In dev,
// Next validates each page for instant navigation on every request; when
// this layout throws notFound() that validation fails, logs an error, and
// leaks memory in the dev server (≈4 MB per 404 request, measured on
// Next 16.4.3, enough to crash it during e2e runs). Production doesn't
// validate. Opting out only silences the checks: the pages keep their
// Suspense structure, so navigations between them are still instant.
//
// In production the very first request for a never-seen param streams the
// fallback shell, so it shows the not-found page with status 200 (plus
// noindex); later requests for that path return 404.

export const instant = false;

// Cache Components needs sample params to prerender.
export function generateStaticParams() {
  return COMPETENCIAS.filter(competenciaConEquipo).map((c) => ({ competencia: c.id }));
}

export default async function LayoutCompetencia({ children, params }: LayoutProps<"/[competencia]">) {
  const { competencia: id } = await params;
  const competencia = obtenerCompetenciaHabilitada(id);
  if (!competencia || !competenciaConEquipo(competencia)) notFound();

  return (
    <>
      <Suspense fallback={null}>
        <EquipoNav competenciaId={competencia.id} />
      </Suspense>
      {children}
    </>
  );
}

/** The session jornada's team for the nav; only that cohort's names reach the client. */
async function EquipoNav({ competenciaId }: { competenciaId: string }) {
  const equipo = equipoDeCompetencia(await jornadaActual(), competenciaId);
  if (!equipo) return null;
  // Only id and name reach the client: never more than the evaluator list shows.
  const integrantes = equipo.integrantes.map(({ id, nombre }) => ({ id, nombre }));
  return <PublicarEvaluadorNav competenciaId={competenciaId} integrantes={integrantes} />;
}
