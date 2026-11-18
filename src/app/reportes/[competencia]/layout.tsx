import { notFound } from "next/navigation";
import { DEFINICIONES_COMPETENCIA } from "@/config/competencias";
import { competenciaConEquipo } from "@/config/equipos";

// Unknown or disabled competencias get a real 404 before anything streams,
// for the reasons in app/[competencia]/layout.tsx (which also explains
// `instant = false`: every page below must export it too). Config-only, like
// that layout: the pages check the session jornada's team (cargarReporte).

export const instant = false;

export function generateStaticParams() {
  return DEFINICIONES_COMPETENCIA.filter((d) => competenciaConEquipo(d.id)).map((d) => ({ competencia: d.id }));
}

export default async function LayoutReporte({ children, params }: LayoutProps<"/reportes/[competencia]">) {
  if (!competenciaConEquipo((await params).competencia)) notFound();
  return children;
}
