import { notFound } from "next/navigation";
import { COMPETENCIAS } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";
import { validarCompetenciaReporte } from "@/lib/validacion";

// Unknown or disabled competencias get a real 404 before anything streams,
// for the reasons in app/[competencia]/layout.tsx (which also explains
// `instant = false`: every page below must export it too).

export const instant = false;

export function generateStaticParams() {
  return COMPETENCIAS.filter((c) => c.habilitada && equipoDeCompetencia(c.id)).map((c) => ({ competencia: c.id }));
}

export default async function LayoutReporte({ children, params }: LayoutProps<"/reportes/[competencia]">) {
  const { competencia } = await params;
  if (!validarCompetenciaReporte(competencia).ok) notFound();
  return children;
}
