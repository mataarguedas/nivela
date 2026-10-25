import { notFound } from "next/navigation";
import { obtenerParticipante, PARTICIPANTES } from "@/config/participantes";

// Unknown participants get a real 404 before anything streams, for the same
// reason the parent layout checks the competencia (see ../layout.tsx, which
// also explains `instant = false`).

export const instant = false;

export function generateStaticParams() {
  return PARTICIPANTES.map((p) => ({ participante: p.id }));
}

export default async function LayoutParticipante({ children, params }: LayoutProps<"/[competencia]/[participante]">) {
  const { participante } = await params;
  if (!obtenerParticipante(participante)) notFound();
  return children;
}
