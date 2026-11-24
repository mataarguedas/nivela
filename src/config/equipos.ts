// Teams from PRD Appendix B, one set per jornada. Names only: never add
// emails or phone numbers. Integrante ids are stored in the DB and in local
// drafts, so never change an existing id, even if the name's spelling is
// corrected, and keep them unique across jornadas (the config test checks).
//
// A team is identified by jornada + competencia. `numero` is only a display
// label for that jornada (morning Equipo 4 and night Equipo 1 are both
// Adaptabilidad) and team sizes vary, so never look a team up by number or
// hard-code a number or size.

import { obtenerCompetenciaHabilitada } from "./competencias";
import { IDS_JORNADA, type JornadaId } from "./jornadas";

export const CURSOS = ["AGRH 315 Psicología 2", "AGRH 613 Seminario Integrado de RRHH"] as const;

export type Curso = (typeof CURSOS)[number];

export type Integrante = {
  id: string;
  nombre: string;
  curso: Curso;
};

export type Equipo = {
  id: string;
  numero: number;
  jornada: JornadaId;
  competenciaId: string;
  integrantes: Integrante[];
};

const PSICOLOGIA: Curso = "AGRH 315 Psicología 2";
const SEMINARIO: Curso = "AGRH 613 Seminario Integrado de RRHH";

export const EQUIPOS: readonly Equipo[] = [
  {
    id: "equipo-1",
    numero: 1,
    jornada: "manana",
    competenciaId: "pensamiento-critico",
    integrantes: [
      { id: "mariana-alfaro-nunez", nombre: "Mariana Alfaro Núñez", curso: PSICOLOGIA },
      { id: "mariela-castillo-zamora", nombre: "Mariela Castillo Zamora", curso: PSICOLOGIA },
      { id: "angelica-ramirez", nombre: "Angelica Ramirez", curso: PSICOLOGIA },
      { id: "felipe-lopez", nombre: "Felipe López", curso: SEMINARIO },
      { id: "adriana-perez", nombre: "Adriana Pérez", curso: SEMINARIO },
      { id: "dorian-campos", nombre: "Dorian Campos", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-2",
    numero: 2,
    jornada: "manana",
    competenciaId: "autorregulacion-emocional",
    integrantes: [
      { id: "anny-varela", nombre: "Anny Varela", curso: PSICOLOGIA },
      { id: "kristel-rocha", nombre: "Kristel Rocha", curso: PSICOLOGIA },
      { id: "anyeli-segura", nombre: "Anyeli Segura", curso: PSICOLOGIA },
      { id: "tiffany-pena", nombre: "Tiffany Peña", curso: PSICOLOGIA },
      { id: "nancy-herrera-rojas", nombre: "Nancy Herrera Rojas", curso: SEMINARIO },
      {
        id: "maria-guadalupe-nunez-arguedas",
        nombre: "María Guadalupe Núñez Arguedas",
        curso: SEMINARIO,
      },
      { id: "monserrat-cespedes-hidalgo", nombre: "Monserrat Céspedes Hidalgo", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-3",
    numero: 3,
    jornada: "manana",
    competenciaId: "orientacion-detalle",
    integrantes: [
      { id: "melany-parrales", nombre: "Melany Parrales", curso: PSICOLOGIA },
      { id: "valeria-mena", nombre: "Valeria Mena", curso: PSICOLOGIA },
      { id: "fiorella-valverde-solano", nombre: "Fiorella Valverde Solano", curso: SEMINARIO },
      { id: "anthony-jimenez-espinoza", nombre: "Anthony Jimenez Espinoza", curso: SEMINARIO },
      { id: "genesis-herrera-norori", nombre: "Genesis Herrera Norori", curso: SEMINARIO },
      { id: "yuliana-villalobos-arroyo", nombre: "Yuliana Villalobos Arroyo", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-4",
    numero: 4,
    jornada: "manana",
    competenciaId: "adaptabilidad",
    integrantes: [
      { id: "wesnlyn-garcia-perez", nombre: "Wesnlyn García Pérez", curso: PSICOLOGIA },
      { id: "stacy-zamora-rodriguez", nombre: "Stacy Zamora Rodríguez", curso: PSICOLOGIA },
      { id: "ramses-salas-vargas", nombre: "Ramsés Salas Vargas", curso: PSICOLOGIA },
      { id: "kristel-barrantes-lopez", nombre: "Kristel Barrantes López", curso: SEMINARIO },
      { id: "angelina-mata-arguedas", nombre: "Angelina Mata Arguedas", curso: SEMINARIO },
      { id: "allison-campos-morera", nombre: "Allison Campos Morera", curso: SEMINARIO },
      { id: "jimena-salgado", nombre: "Jimena Salgado", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-5",
    numero: 5,
    jornada: "manana",
    competenciaId: "orientacion-resultados",
    integrantes: [
      { id: "ariana-castillo-sanchez", nombre: "Ariana Castillo Sánchez", curso: PSICOLOGIA },
      { id: "zury-castro-sandoval", nombre: "Zury Castro Sandoval", curso: PSICOLOGIA },
      { id: "derroy-navas-valverde", nombre: "Derroy Navas Valverde", curso: PSICOLOGIA },
      { id: "anyely-espinoza-mendoza", nombre: "Anyely Espinoza Mendoza", curso: SEMINARIO },
      { id: "genesis-ruiz-martinez", nombre: "Génesis Ruiz Martínez", curso: SEMINARIO },
      { id: "nayeli-araya-solorzano", nombre: "Nayeli Araya Solórzano", curso: SEMINARIO },
    ],
  },
  // Night cohort (PRD Appendix B, "Noche"). The night numbering differs from
  // the morning one: at night Equipo 1 is Adaptabilidad. Never look a team up
  // by numero; use equipoDeCompetencia(jornada, competenciaId).
  {
    id: "equipo-noche-1",
    numero: 1,
    jornada: "noche",
    competenciaId: "adaptabilidad",
    integrantes: [
      { id: "gabriela-salgado", nombre: "Gabriela Salgado", curso: PSICOLOGIA },
      { id: "reylin-centeno", nombre: "Reylin Centeno", curso: PSICOLOGIA },
      { id: "goldine-foster-mclean", nombre: "Goldine Foster Mclean", curso: SEMINARIO },
      { id: "anna-sevilla-lopez", nombre: "Anna Sevilla López", curso: SEMINARIO },
      { id: "ricardo-mendez-ubeda", nombre: "Ricardo Méndez Ubeda", curso: SEMINARIO },
      { id: "maria-celeste-vega-zamora", nombre: "María Celeste Vega Zamora", curso: SEMINARIO },
      { id: "brenda-alfaro", nombre: "Brenda Alfaro", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-noche-2",
    numero: 2,
    jornada: "noche",
    competenciaId: "autorregulacion-emocional",
    integrantes: [
      { id: "raquel-vargas", nombre: "Raquel Vargas", curso: PSICOLOGIA },
      { id: "keilyn-solis", nombre: "Keilyn Solis", curso: PSICOLOGIA },
      { id: "delma-saldana", nombre: "Delma Saldaña", curso: PSICOLOGIA },
      { id: "andy-molina-castro", nombre: "Andy Molina Castro", curso: SEMINARIO },
      { id: "karyme-varela-cantillano", nombre: "Karyme Varela Cantillano", curso: SEMINARIO },
      { id: "nailea-matarrita-quiros", nombre: "Nailea Matarrita Quirós", curso: SEMINARIO },
      { id: "camila-fallas-ceron", nombre: "Camila Fallas Cerón", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-noche-3",
    numero: 3,
    jornada: "noche",
    competenciaId: "pensamiento-critico",
    integrantes: [
      { id: "cristopher-martinez-renteria", nombre: "Cristopher Martínez Rentería", curso: PSICOLOGIA },
      { id: "josue-rodriguez-saborio", nombre: "Josué Rodríguez Saborío", curso: PSICOLOGIA },
      { id: "yubeidi-mendez-ubeda", nombre: "Yubeidi Mendez Ubeda", curso: PSICOLOGIA },
      { id: "emilly-gonzalez-azofeifa", nombre: "Emilly González Azofeifa", curso: SEMINARIO },
      { id: "valery-quesada-oviedo", nombre: "Valery Quesada Oviedo", curso: SEMINARIO },
      { id: "diana-hidalgo", nombre: "Diana Hidalgo", curso: SEMINARIO },
      { id: "mariana-viquez-benavente", nombre: "Mariana Viquez Benavente", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-noche-4",
    numero: 4,
    jornada: "noche",
    competenciaId: "orientacion-detalle",
    integrantes: [
      { id: "melany-aguirre", nombre: "Melany Aguirre", curso: PSICOLOGIA },
      { id: "brittany-badilla", nombre: "Brittany Badilla", curso: PSICOLOGIA },
      { id: "sofia-campos-ramirez", nombre: "Sofía Campos Ramirez", curso: SEMINARIO },
      { id: "kristel-ugalde", nombre: "Kristel Ugalde", curso: SEMINARIO },
      { id: "sandra-gomez-reyes", nombre: "Sandra Gómez Reyes", curso: SEMINARIO },
      { id: "arlyne-aguilera-salazar", nombre: "Arlyne Aguilera Salazar", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-noche-5",
    numero: 5,
    jornada: "noche",
    competenciaId: "orientacion-resultados",
    integrantes: [
      { id: "mariela-salas", nombre: "Mariela Salas", curso: PSICOLOGIA },
      { id: "ximena-badilla-vargas", nombre: "Ximena Badilla Vargas", curso: PSICOLOGIA },
      { id: "yuleissy-vargas-corrales", nombre: "Yuleissy Vargas Corrales", curso: SEMINARIO },
      { id: "kevin-chavarria", nombre: "Kevin Chavarría", curso: SEMINARIO },
      { id: "aldair-hernandez-rodriguez", nombre: "Aldair Hernández Rodríguez", curso: SEMINARIO },
      { id: "tiffany-alfaro", nombre: "Tiffany Alfaro", curso: SEMINARIO },
      { id: "byron-castro-retana", nombre: "Byron Castro Retana", curso: SEMINARIO },
    ],
  },
];

/** The jornada's team for a competencia, only if it has integrantes. */
export function equipoDeCompetencia(jornada: JornadaId, competenciaId: string): Equipo | undefined {
  return EQUIPOS.find((e) => e.jornada === jornada && e.competenciaId === competenciaId && e.integrantes.length > 0);
}

/** The evaluator, only if they belong to the jornada's team assigned to that competencia. */
export function obtenerEvaluador(jornada: JornadaId, competenciaId: string, integranteId: string): Integrante | undefined {
  return equipoDeCompetencia(jornada, competenciaId)?.integrantes.find((i) => i.id === integranteId);
}

/**
 * A member and their team, by integrante id (unique across jornadas). The
 * only way from an account (PRD §5.12) to its jornada and competencia.
 */
export function buscarIntegrante(integranteId: string): { integrante: Integrante; equipo: Equipo } | undefined {
  for (const equipo of EQUIPOS) {
    const integrante = equipo.integrantes.find((i) => i.id === integranteId);
    if (integrante) return { integrante, equipo };
  }
  return undefined;
}

/** A jornada's teams in their own number order (display only; never a lookup key). */
export function equiposDeJornada(jornada: JornadaId): Equipo[] {
  return EQUIPOS.filter((e) => e.jornada === jornada).sort((a, b) => a.numero - b.numero);
}

/** Selectable in this jornada: it has a rubric there (PRD Appendix A) and the jornada has a team with integrantes for it. */
export function competenciaDisponible(jornada: JornadaId, competenciaId: string): boolean {
  return (
    obtenerCompetenciaHabilitada(jornada, competenciaId) !== undefined &&
    equipoDeCompetencia(jornada, competenciaId) !== undefined
  );
}

/** Available in some jornada: the routes that exist at all (static params, config-only 404s). */
export function competenciaConEquipo(competenciaId: string): boolean {
  return IDS_JORNADA.some((jornada) => competenciaDisponible(jornada, competenciaId));
}
