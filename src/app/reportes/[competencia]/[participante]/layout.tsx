import { notFound } from "next/navigation";
import { obtenerParticipante, PARTICIPANTES } from "@/config/participantes";

// Unknown participants get a real 404 before anything streams (see
// app/[competencia]/layout.tsx on `instant = false`).

export const instant = false;

export function generateStaticParams() {
  return PARTICIPANTES.map((p) => ({ participante: p.id }));
}

export default async function LayoutReporteParticipante({
  children,
  params,
}: LayoutProps<"/reportes/[competencia]/[participante]">) {
  const { participante } = await params;
  if (!obtenerParticipante(participante)) notFound();
  return children;
}
