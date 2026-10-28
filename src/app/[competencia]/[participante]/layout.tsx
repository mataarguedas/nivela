import { notFound } from "next/navigation";
import { esIdParticipante } from "@/config/participantes";

// Ids that can't be a participant ("P01".."P99") get a real 404 before
// anything streams, for the same reason the parent layout checks the
// competencia (see ../layout.tsx, which also explains `instant = false`).
// Whether the participant is currently active comes from the DB, so the page
// checks that at request time, behind its Suspense boundary.

export const instant = false;

// Cache Components needs a sample param to prerender; the list itself is runtime data.
export function generateStaticParams() {
  return [{ participante: "P01" }];
}

export default async function LayoutParticipante({ children, params }: LayoutProps<"/[competencia]/[participante]">) {
  const { participante } = await params;
  if (!esIdParticipante(participante)) notFound();
  return children;
}
