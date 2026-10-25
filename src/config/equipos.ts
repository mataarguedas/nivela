// Teams from PRD Appendix B. Names only: never add emails or phone numbers.
// Integrante ids are stored in the DB and in local drafts, so never change an
// existing id, even if the name's spelling is corrected.

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
  competenciaId: string;
  integrantes: Integrante[];
};

const PSICOLOGIA: Curso = "AGRH 315 Psicología 2";
const SEMINARIO: Curso = "AGRH 613 Seminario Integrado de RRHH";

export const EQUIPOS: readonly Equipo[] = [
  {
    id: "equipo-1",
    numero: 1,
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
    competenciaId: "adaptabilidad",
    integrantes: [
      { id: "wesnlyn-garcia-perez", nombre: "Wesnlyn García Pérez", curso: PSICOLOGIA },
      { id: "stacy-zamora-rodriguez", nombre: "Stacy Zamora Rodríguez", curso: PSICOLOGIA },
      { id: "ramses-salas-vargas", nombre: "Ramsés Salas Vargas", curso: PSICOLOGIA },
      { id: "sebastian-chaves", nombre: "Sebastian Chaves", curso: PSICOLOGIA },
      { id: "kristel-barrantes-lopez", nombre: "Kristel Barrantes López", curso: SEMINARIO },
      { id: "angelina-mata-arguedas", nombre: "Angelina Mata Arguedas", curso: SEMINARIO },
      { id: "allison-campos-morera", nombre: "Allison Campos Morera", curso: SEMINARIO },
      { id: "jimena-salgado", nombre: "Jimena Salgado", curso: SEMINARIO },
    ],
  },
  {
    id: "equipo-5",
    numero: 5,
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
];

export function equipoDeCompetencia(competenciaId: string): Equipo | undefined {
  return EQUIPOS.find((e) => e.competenciaId === competenciaId);
}

/** The evaluator, only if they belong to the team assigned to that competencia. */
export function obtenerEvaluador(competenciaId: string, integranteId: string): Integrante | undefined {
  return equipoDeCompetencia(competenciaId)?.integrantes.find((i) => i.id === integranteId);
}
