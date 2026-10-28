import { notFound } from "next/navigation";
import { esIdParticipante } from "@/config/participantes";

// Same check as app/[competencia]/[participante]/layout.tsx: a malformed id
// is a real 404 here; whether the participant is active is checked by the
// page at request time.

export const instant = false;

export function generateStaticParams() {
  return [{ participante: "P01" }];
}

export default async function LayoutParticipanteReporte({ children, params }: LayoutProps<"/reportes/[competencia]/[participante]">) {
  const { participante } = await params;
  if (!esIdParticipante(participante)) notFound();
  return children;
}
