import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { IconoChevron } from "@/components/ui/iconos";
import { COMPETENCIAS, type Competencia } from "@/config/competencias";
import { TEXTOS } from "@/config/textos";

// Inicio (PRD §5.2): centered hero on the Ice Wash, then every competencia
// from config. Enabled ones link to their evaluator step; disabled ones are
// visible but inert (aria-disabled, no href, so never focusable). Fully
// static: it prerenders into the shell.

const ID_LISTA = "competencias";

function rutaEvaluador(competencia: Competencia): string {
  return `/${competencia.id}/evaluador`;
}

export default function Inicio() {
  const habilitadas = COMPETENCIAS.filter((c) => c.habilitada);
  // With a single enabled competencia, "Comenzar" skips straight to it.
  const destinoComenzar = habilitadas.length === 1 ? rutaEvaluador(habilitadas[0]) : `#${ID_LISTA}`;

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-wash px-4 pt-16 pb-16 text-center md:pt-24 md:pb-24">
        <h1 className="text-h2 font-semibold md:text-display">{TEXTOS.app.nombre}</h1>
        <p className="mx-auto mt-3 max-w-[560px] text-sub text-ink">{TEXTOS.inicio.titulo}</p>
        <p className="mt-2 text-body text-ink-3">{TEXTOS.app.lema}</p>
        <div className="mt-8">
          <Boton href={destinoComenzar} tamano="grande">
            {TEXTOS.inicio.comenzar}
          </Boton>
        </div>
      </section>

      <section
        id={ID_LISTA}
        aria-labelledby={`${ID_LISTA}-titulo`}
        className="scroll-mt-11 px-4 pt-12 pb-[max(48px,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-[640px]">
          <h2 id={`${ID_LISTA}-titulo`} className="mb-6 text-center text-h3 font-semibold">
            {TEXTOS.competencias.titulo}
          </h2>
          <ul className="flex flex-col gap-2">
            {COMPETENCIAS.map((competencia) => (
              <li key={competencia.id}>
                <FilaCompetencia competencia={competencia} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

const FILA = "flex min-h-15 w-full items-center gap-3 rounded-tile bg-surface px-4 py-3 text-left";

function FilaCompetencia({ competencia }: { competencia: Competencia }) {
  if (!competencia.habilitada) {
    return (
      <a role="link" aria-disabled="true" className={`${FILA} cursor-not-allowed`}>
        <span className="min-w-0 flex-1 text-body text-ink-2">{competencia.nombre}</span>
        <Chip>{TEXTOS.competencias.proximamente}</Chip>
      </a>
    );
  }
  return (
    <Link href={rutaEvaluador(competencia)} className={`${FILA} group`}>
      <span className="min-w-0 flex-1 text-body font-semibold text-ink group-hover:text-link">
        {competencia.nombre}
      </span>
      <Chip tono="medio">{TEXTOS.competencias.disponible}</Chip>
      <IconoChevron className="shrink-0 text-ink-2" />
    </Link>
  );
}
