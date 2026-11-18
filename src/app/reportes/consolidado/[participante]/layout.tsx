import { notFound } from "next/navigation";
import { esIdParticipante } from "@/config/participantes";

// Same check as app/reportes/[competencia]/[participante]/layout.tsx: a
// malformed id is a real 404 here; whether the participant is active in the
// session's jornada is checked by the page at request time.

export const instant = false;

export function generateStaticParams() {
  return [{ participante: "P01" }];
}

export default async function LayoutParticipanteConsolidado({
  children,
  params,
}: LayoutProps<"/reportes/consolidado/[participante]">) {
  const { participante } = await params;
  if (!esIdParticipante(participante)) notFound();
  return children;
}
