import { notFound } from "next/navigation";
import { PublicarEvaluadorNav } from "@/components/ui/NavEvaluador";
import { COMPETENCIAS, obtenerCompetenciaHabilitada } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";

// Shared by every /[competencia] route (evaluator step, participant list,
// rating screen). Unknown or disabled competencias get a real 404 here: the
// check runs before anything streams. A notFound() inside a page's Suspense
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
  return COMPETENCIAS.filter((c) => c.habilitada).map((c) => ({ competencia: c.id }));
}

export default async function LayoutCompetencia({ children, params }: LayoutProps<"/[competencia]">) {
  const { competencia: id } = await params;
  const competencia = obtenerCompetenciaHabilitada(id);
  const equipo = competencia && equipoDeCompetencia(competencia.id);
  if (!competencia || !equipo) notFound();

  // Only id and name reach the client: never more than the evaluator list shows.
  const integrantes = equipo.integrantes.map(({ id, nombre }) => ({ id, nombre }));
  return (
    <>
      <PublicarEvaluadorNav competenciaId={competencia.id} integrantes={integrantes} />
      {children}
    </>
  );
}
