import { notFound } from "next/navigation";
import { COMPETENCIAS, obtenerCompetenciaHabilitada } from "@/config/competencias";
import { competenciaConEquipo } from "@/config/equipos";

// Unknown or disabled competencias get a real 404 before anything streams,
// for the reasons in app/[competencia]/layout.tsx (which also explains
// `instant = false`: every page below must export it too). Config-only, like
// that layout: the pages check the session jornada's team (cargarReporte).

export const instant = false;

export function generateStaticParams() {
  return COMPETENCIAS.filter(competenciaConEquipo).map((c) => ({ competencia: c.id }));
}

export default async function LayoutReporte({ children, params }: LayoutProps<"/reportes/[competencia]">) {
  const competencia = obtenerCompetenciaHabilitada((await params).competencia);
  if (!competencia || !competenciaConEquipo(competencia)) notFound();
  return children;
}
