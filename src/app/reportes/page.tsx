import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Chip } from "@/components/ui/Chip";
import { SelectorJornada } from "@/components/ui/SelectorJornada";
import { IconoChevron } from "@/components/ui/iconos";
import { COMPETENCIAS, type Competencia } from "@/config/competencias";
import { competenciaDisponible } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { exigirDocente } from "./exigirDocente";

// Reportes (PRD §5.9, §5.11): jornada switch, then the competencia picker.
// Same rows as Inicio: competencias with a team in the session's jornada open
// their Reporte general; the others are visible but inert ("Próximamente",
// aria-disabled, no href).

export const metadata: Metadata = {
  title: "Reportes · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaReportes() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-12 pb-[max(48px,env(safe-area-inset-bottom))] md:pt-16">
      <Suspense fallback={null}>
        <SelectorCompetencia />
      </Suspense>
    </main>
  );
}

const FILA = "flex min-h-15 w-full items-center gap-3 rounded-tile bg-surface px-4 py-3 text-left";

async function SelectorCompetencia() {
  const jornada = await exigirDocente("/reportes");
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <h1 className="text-center text-h2 font-semibold md:text-display">{TEXTOS.reportes.enlace}</h1>
      <p className="mt-3 mb-6 text-center text-body text-ink-3">{TEXTOS_REPORTES.elegirCompetencia}</p>
      <div className="mb-8">
        <SelectorJornada actual={jornada} />
      </div>
      <ul className="flex flex-col gap-2">
        {COMPETENCIAS.map((competencia) => (
          <li key={competencia.id}>
            <FilaCompetencia competencia={competencia} jornada={jornada} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilaCompetencia({ competencia, jornada }: { competencia: Competencia; jornada: JornadaId }) {
  if (!competenciaDisponible(jornada, competencia)) {
    return (
      <a role="link" aria-disabled="true" className={`${FILA} cursor-not-allowed`}>
        <span className="min-w-0 flex-1 text-body text-ink-2">{competencia.nombre}</span>
        <Chip>{TEXTOS.competencias.proximamente}</Chip>
      </a>
    );
  }
  return (
    <Link href={`/reportes/${competencia.id}`} className={`${FILA} group`}>
      <span className="min-w-0 flex-1 text-body font-semibold text-ink group-hover:text-link">{competencia.nombre}</span>
      <span className="text-caption text-ink-2">{TEXTOS.reportes.general}</span>
      <IconoChevron className="shrink-0 text-ink-2" />
    </Link>
  );
}
