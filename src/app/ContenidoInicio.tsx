import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { SelectorJornada } from "@/components/ui/SelectorJornada";
import { IconoChevron } from "@/components/ui/iconos";
import { competenciasDeJornada, type Competencia } from "@/config/competencias";
import { competenciaDisponible } from "@/config/equipos";
import { nombreJornada, type JornadaId } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";

// Inicio's content (PRD §5.2): centered hero on the Ice Wash, then every
// competencia from config. Those with a rubric and a team in the session's jornada link
// to their evaluator step; the rest are visible but inert (aria-disabled, no
// href, so never focusable). `jornada` is null in the prerendered shell,
// before the cookie is read: the hero shows, the rows don't yet.
//
// For an evaluador (`asignada` = their team's competencia id), only that one
// opens, straight to the participant list (no picker, PRD §5.3); any other
// enabled competencia shows "No asignada". `asignada` is undefined for the
// docente.
//
// The docente also gets the Mañana / Noche switch here (PRD §5.11), the same
// SelectorJornada as /reportes: it re-signs the session, so the competencias,
// the evaluator picker and the participant list all follow the chosen jornada.

const ID_LISTA = "competencias";

type Fila = { competencia: Competencia; estado: "disponible" | "proximamente" | "no-asignada" };

function filas(jornada: JornadaId, asignada: string | null | undefined): Fila[] {
  return competenciasDeJornada(jornada).map((competencia) => {
    if (asignada !== undefined && competencia.id !== asignada && competencia.habilitada) {
      return { competencia, estado: "no-asignada" };
    }
    return { competencia, estado: competenciaDisponible(jornada, competencia.id) ? "disponible" : "proximamente" };
  });
}

type ContenidoInicioProps = {
  jornada: JornadaId | null;
  /** An evaluador's team competencia (null: their team has none); undefined for the docente. */
  asignada?: string | null;
  /** The docente may switch jornada from Inicio (PRD §5.11). */
  cambiaJornada?: boolean;
};

export function ContenidoInicio({ jornada, asignada, cambiaJornada = false }: ContenidoInicioProps) {
  const lista = jornada ? filas(jornada, asignada) : [];
  const disponibles = lista.filter((f) => f.estado === "disponible").map((f) => f.competencia);
  const evaluador = asignada !== undefined;
  // The docente picks a team member first; an evaluador is who their account says.
  const ruta = (competencia: Competencia) => (evaluador ? `/${competencia.id}` : `/${competencia.id}/evaluador`);
  // With a single available competencia, "Comenzar" skips straight to it.
  const destinoComenzar = disponibles.length === 1 ? ruta(disponibles[0]) : `#${ID_LISTA}`;
  const sinPropia = jornada !== null && evaluador && disponibles.length === 0;

  return (
    <>
      <section className="bg-wash px-4 pt-16 pb-16 text-center md:pt-24 md:pb-24">
        <h1 className="text-h2 font-semibold md:text-display">{TEXTOS.app.nombre}</h1>
        <p className="mx-auto mt-3 max-w-[560px] text-sub text-ink">{TEXTOS.inicio.titulo}</p>
        <p className="mt-2 text-body text-ink-3">{TEXTOS.app.lema}</p>
        {jornada && cambiaJornada ? (
          <div className="mt-6">
            <SelectorJornada actual={jornada} />
          </div>
        ) : (
          // The non-breaking space keeps the line's height in the shell.
          <p className="mt-2 text-[14px] text-ink-3">{jornada ? TEXTOS.jornada.actual(nombreJornada(jornada)) : " "}</p>
        )}
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
              {lista.map(({ competencia, estado }) => (
                <li key={competencia.id}>
                  <FilaCompetencia competencia={competencia} estado={estado} href={ruta(competencia)} />
                </li>
              ))}
            </ul>
          )}
          {sinPropia && <p className="mt-6 text-center text-body text-ink-3">{TEXTOS.competencias.sinDisponible}</p>}
        </div>
      </section>
    </>
  );
}

const FILA = "flex min-h-15 w-full items-center gap-3 rounded-tile bg-surface px-4 py-3 text-left";

function FilaCompetencia({ competencia, estado, href }: Fila & { href: string }) {
  if (estado !== "disponible") {
    return (
      <a role="link" aria-disabled="true" className={`${FILA} cursor-not-allowed`}>
        <span className="min-w-0 flex-1 text-body text-ink-2">{competencia.nombre}</span>
        <Chip>{estado === "no-asignada" ? TEXTOS.competencias.noAsignada : TEXTOS.competencias.proximamente}</Chip>
      </a>
    );
  }
  return (
    <Link href={href} className={`${FILA} group`}>
      <span className="min-w-0 flex-1 text-body font-semibold text-ink group-hover:text-link">
        {competencia.nombre}
      </span>
      <Chip tono="medio">{TEXTOS.competencias.disponible}</Chip>
      <IconoChevron className="shrink-0 text-ink-2" />
    </Link>
  );
}
