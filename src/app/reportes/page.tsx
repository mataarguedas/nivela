import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TEXTOS } from "@/config/textos";
import { getSesion } from "@/lib/sesion";

// Placeholder until the report area is built (Prompt 9, PRD §5.9). It already
// re-checks the docente role itself instead of trusting proxy.ts alone.

export const metadata: Metadata = {
  title: "Reportes · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaReportes() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-14 md:pt-24">
      <Suspense fallback={null}>
        <ContenidoDocente />
      </Suspense>
    </main>
  );
}

async function ContenidoDocente() {
  const sesion = await getSesion();
  if (sesion?.rol !== "docente") redirect("/acceso?motivo=docente&next=%2Freportes");
  return (
    <div className="text-center">
      <h1 className="text-h2 font-semibold md:text-display">{TEXTOS.reportes.enlace}</h1>
      <p className="mt-3 text-sub text-ink-3">{TEXTOS.competencias.proximamente}</p>
    </div>
  );
}
