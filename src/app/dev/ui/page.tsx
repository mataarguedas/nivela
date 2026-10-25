import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPETENCIAS } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";
import { Muestrario } from "./Muestrario";

// Dev-only component showcase for reviewing the UI kit on a phone. Returns 404
// in production builds. It breaks the "one primary button per view" rule on
// purpose, to show every state side by side.

export const metadata: Metadata = {
  title: "Componentes · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaComponentes() {
  if (process.env.NODE_ENV === "production") notFound();

  const competencia = COMPETENCIAS.find((c) => c.habilitada && c.indicadores.length > 0);
  const indicador = competencia?.indicadores[0];
  const integrante = competencia && equipoDeCompetencia(competencia.id)?.integrantes[0];
  if (!indicador || !integrante) notFound();

  return <Muestrario indicador={indicador} nombreEvaluador={integrante.nombre} />;
}
