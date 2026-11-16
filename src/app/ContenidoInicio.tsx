import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { IconoChevron } from "@/components/ui/iconos";
import { COMPETENCIAS, type Competencia } from "@/config/competencias";
import { competenciaDisponible } from "@/config/equipos";
import { nombreJornada, type JornadaId } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";

// Inicio's content (PRD §5.2): centered hero on the Ice Wash, then every
// competencia from config. Those with a team in the session's jornada link
// to their evaluator step; the rest are visible but inert (aria-disabled, no
// href, so never focusable). `jornada` is null in the prerendered shell,
// before the cookie is read: the hero shows, the rows don't yet.

const ID_LISTA = "competencias";

function rutaEvaluador(competencia: Competencia): string {
  return `/${competencia.id}/evaluador`;
}

export function ContenidoInicio({ jornada }: { jornada: JornadaId | null }) {
  const disponibles = jornada ? COMPETENCIAS.filter((c) => competenciaDisponible(jornada, c)) : [];
  // With a single available competencia, "Comenzar" skips straight to it.
  const destinoComenzar = disponibles.length === 1 ? rutaEvaluador(disponibles[0]) : `#${ID_LISTA}`;

  return (
    <>
      <section className="bg-wash px-4 pt-16 pb-16 text-center md:pt-24 md:pb-24">
        <h1 className="text-h2 font-semibold md:text-display">{TEXTOS.app.nombre}</h1>
        <p className="mx-auto mt-3 max-w-[560px] text-sub text-ink">{TEXTOS.inicio.titulo}</p>
        <p className="mt-2 text-body text-ink-3">{TEXTOS.app.lema}</p>
        {/* The non-breaking space keeps the line's height in the shell. */}
        <p className="mt-2 text-[14px] text-ink-3">{jornada ? TEXTOS.jornada.actual(nombreJornada(jornada)) : " "}</p>
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
          {jornada && (
            <ul className="flex flex-col gap-2">
              {COMPETENCIAS.map((competencia) => (
                <li key={competencia.id}>
                  <FilaCompetencia competencia={competencia} disponible={competenciaDisponible(jornada, competencia)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

const FILA = "flex min-h-15 w-full items-center gap-3 rounded-tile bg-surface px-4 py-3 text-left";

function FilaCompetencia({ competencia, disponible }: { competencia: Competencia; disponible: boolean }) {
  if (!disponible) {
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
