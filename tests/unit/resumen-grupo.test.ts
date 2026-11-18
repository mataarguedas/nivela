import { describe, expect, it } from "vitest";
import { obtenerCompetencia, type Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import { crearParticipante } from "@/config/participantes";
import { puntosDesdeNiveles as pts } from "@/lib/puntajes";
import { agregarReporte, agregarResumenGrupo, type EntradaResumen, type FilaReporte, type ParAusente } from "@/lib/reportes";

// agregarResumenGrupo (PRD §11.3) over hand-computed fixtures, one per
// jornada, on the real Adaptabilidad rubric (the night team uses the morning
// template). Teams differ in number and size per jornada, as in config: the
// morning one is "Equipo 4" with 3 members here, the night one "Equipo 1"
// with 2. P01 exists in both jornadas with different results, so any mixing
// across jornadas would show up in the numbers. Means are worked out in
// levels (1–4); the report gives them in points, pts(m) = (m − 1) ÷ 3 × 100.

/** Each value in points, compared with float tolerance. */
const enPuntos = (medias: number[]) => medias.map((m) => expect.closeTo(pts(m), 10));

const competencia = obtenerCompetencia("manana", "adaptabilidad")!;

const CURSO = "AGRH 315 Psicología 2" as const;
const equipoManana: Equipo = {
  id: "equipo-manana-prueba",
  numero: 4,
  jornada: "manana",
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "m1", nombre: "Ana Núñez", curso: CURSO },
    { id: "m2", nombre: "Bea Solís", curso: CURSO },
    { id: "m3", nombre: "Carlos Peña", curso: CURSO },
  ],
};
const equipoNoche: Equipo = {
  id: "equipo-noche-prueba",
  numero: 1,
  jornada: "noche",
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "n1", nombre: "Dana Rojas", curso: CURSO },
    { id: "n2", nombre: "Elías Mora", curso: CURSO },
  ],
};

function evaluacion(evaluadorId: string, participanteId: string, niveles: number[]): FilaReporte[] {
  return niveles.map((nivel, i) => ({
    evaluadorId,
    participanteId,
    actualizadoEn: "2026-11-17T18:00:00.000Z",
    indicadorId: `adaptabilidad-${i + 1}`,
    nivel,
    origen: "manual",
    observacion: null,
    iaNivelSugerido: null,
    iaConfianza: null,
  }));
}

// Mañana: P01 rated 4,4,4,4 by m1 and 4,4,3,3 by m2 → means 4, 4, 3,5, 3,5
// → general 3,75 (Experto). P02 rated 2,2,2,2 by m1 → 2 (Intermedio). P03
// marked absent by m3 and never rated → Ausente.
// Group mean (3,75 + 2) / 2 = 2,875 → 62,5 puntos → shown 63 → Avanzado, 12 to Experto.
// Indicator means over participants: (4+2)/2 = 3 · 3 · (3,5+2)/2 = 2,75 · 2,75.
// Received 3 of 3×3 − 1 absent pair = 8. No evaluator complete.
const participantesManana = [crearParticipante(1, null, "100000001"), crearParticipante(2, null), crearParticipante(3, null)];
const filasManana = [
  ...evaluacion("m1", "P01", [4, 4, 4, 4]),
  ...evaluacion("m2", "P01", [4, 4, 3, 3]),
  ...evaluacion("m1", "P02", [2, 2, 2, 2]),
];
const ausenciasManana: ParAusente[] = [{ evaluadorId: "m3", participanteId: "P03" }];

// Noche: P01 rated 1,1,1,1 by n1 and n2 → 1 (Básico); P02 rated 2,2,2,2 by both → 2.
// Group mean 1,5 → 16,7 puntos → shown 17 → Básico, 8 to Intermedio. Indicator means all 1,5.
// Received 4 of 2×2 → cobertura 1; both evaluators complete.
const participantesNoche = [crearParticipante(1, null), crearParticipante(2, null)];
const filasNoche = [
  ...evaluacion("n1", "P01", [1, 1, 1, 1]),
  ...evaluacion("n2", "P01", [1, 1, 1, 1]),
  ...evaluacion("n1", "P02", [2, 2, 2, 2]),
  ...evaluacion("n2", "P02", [2, 2, 2, 2]),
];

function entrada(jornada: JornadaId): EntradaResumen {
  if (jornada === "manana") {
    const reporte = agregarReporte(competencia, equipoManana, participantesManana, filasManana, ausenciasManana);
    return { jornada, competencia, equipo: equipoManana, reporte };
  }
  return { jornada, competencia, equipo: equipoNoche, reporte: agregarReporte(competencia, equipoNoche, participantesNoche, filasNoche) };
}

describe("agregarResumenGrupo: una jornada", () => {
  it("mañana: puntaje del grupo, nivel, brecha y participación", () => {
    const resumen = agregarResumenGrupo([entrada("manana")]);
    expect(resumen.seleccion).toBe("manana");
    expect(resumen.vacio).toBe(false);
    expect(resumen.competencia).toEqual({ id: "adaptabilidad", nombre: "Adaptabilidad" });
    const { grupo } = resumen;
    expect(grupo.puntaje).toBeCloseTo(pts(2.875), 10);
    expect(grupo.nivel).toBe(3);
    expect(grupo.brecha).toEqual({ nivelActual: 3, siguiente: 4, umbral: 75, faltante: 12 });
    expect(grupo).toMatchObject({
      participantesEvaluados: 2,
      participantesTotal: 3,
      ausentes: 1,
      recibidas: 3,
      esperadas: 8,
      evaluadoresCompletos: 0,
      evaluadoresTotal: 3,
    });
    expect(grupo.cobertura).toBeCloseTo(3 / 8, 10);
    expect([...grupo.niveles].sort()).toEqual([2, 4]);
  });

  it("promedio por indicador y los indicadores más fuertes y más débiles (con empates)", () => {
    const { grupo } = agregarResumenGrupo([entrada("manana")]);
    expect(grupo.indicadores?.map((i) => i.media)).toEqual(enPuntos([3, 3, 2.75, 2.75]));
    expect(grupo.indicadores?.map((i) => i.nivel)).toEqual([3, 3, 3, 3]);
    // 3 → 67 puntos: 8 to Experto.
    expect(grupo.indicadores?.[0].brecha).toMatchObject({ siguiente: 4, faltante: 8 });
    expect(grupo.masFuertes.map((i) => i.numero)).toEqual([1, 2]);
    expect(grupo.masDebiles.map((i) => i.numero)).toEqual([3, 4]);
  });

  it("noche: el equipo de esa jornada, con su número y su tamaño", () => {
    const resumen = agregarResumenGrupo([entrada("noche")]);
    expect(resumen.seleccion).toBe("noche");
    expect(resumen.jornadas).toHaveLength(1);
    expect(resumen.jornadas[0]).toMatchObject({ jornada: "noche", numeroEquipo: 1, evaluadoresTotal: 2, evaluadoresCompletos: 2 });
    expect(resumen.grupo.puntaje).toBeCloseTo(pts(1.5), 10);
    expect(resumen.grupo.brecha).toEqual({ nivelActual: 1, siguiente: 2, umbral: 25, faltante: 8 });
    expect(resumen.grupo.cobertura).toBe(1);
    // All indicators equal: each one is both the strongest and the weakest.
    expect(resumen.grupo.masFuertes).toHaveLength(4);
    expect(resumen.grupo.masDebiles).toHaveLength(4);
  });

  it("sin evaluaciones: vacío, sin puntaje ni extremos", () => {
    const reporte = agregarReporte(competencia, equipoManana, participantesManana, []);
    const resumen = agregarResumenGrupo([{ jornada: "manana", competencia, equipo: equipoManana, reporte }]);
    expect(resumen.vacio).toBe(true);
    expect(resumen.grupo).toMatchObject({ puntaje: null, nivel: null, brecha: null, participantesEvaluados: 0, cobertura: 0 });
    expect(resumen.grupo.masFuertes).toEqual([]);
  });
});

describe("agregarResumenGrupo: ambas jornadas", () => {
  // Given in either order: the result follows JORNADAS (mañana, noche).
  const resumen = agregarResumenGrupo([entrada("noche"), entrada("manana")]);

  it("cada columna conserva su jornada y su equipo (Equipo 4 en la mañana, Equipo 1 en la noche)", () => {
    expect(resumen.seleccion).toBe("ambas");
    expect(resumen.mismaRubrica).toBe(true);
    expect(resumen.jornadas.map((j) => [j.jornada, j.numeroEquipo, j.evaluadoresTotal])).toEqual([
      ["manana", 4, 3],
      ["noche", 1, 2],
    ]);
    expect(resumen.jornadas[0].puntaje).toBeCloseTo(pts(2.875), 10);
    expect(resumen.jornadas[1].puntaje).toBeCloseTo(pts(1.5), 10);
  });

  it("el grupo combinado cuenta P01 de cada jornada por separado, sin mezclarlos", () => {
    const { grupo } = resumen;
    // 2 evaluated in the morning (3,75 and 2) + 2 at night (1 and 2).
    expect(grupo.participantesEvaluados).toBe(4);
    expect(grupo.participantesTotal).toBe(5);
    expect(grupo.puntaje).toBeCloseTo(pts((3.75 + 2 + 1 + 2) / 4), 10);
    expect(grupo.nivel).toBe(2);
    expect([...grupo.niveles].sort()).toEqual([1, 2, 2, 4]);
    expect(grupo).toMatchObject({ ausentes: 1, recibidas: 7, esperadas: 12, evaluadoresCompletos: 2, evaluadoresTotal: 5 });
    expect(grupo.cobertura).toBeCloseTo(7 / 12, 10);
    // Indicator 1: (4 + 2 + 1 + 2) / 4 = 2,25; indicator 3: (3,5 + 2 + 1 + 2) / 4 = 2,125.
    expect(grupo.indicadores?.map((i) => i.media)).toEqual(enPuntos([2.25, 2.25, 2.125, 2.125]));
  });

  it("con plantillas distintas no promedia los indicadores juntos: cada jornada conserva los suyos", () => {
    // A night rubric of its own, with new indicator ids (PRD §9.1).
    const renombrar = (id: string) => id.replace("adaptabilidad-", "adaptabilidad-noche-");
    const propia: Competencia = { ...competencia, indicadores: competencia.indicadores.map((i) => ({ ...i, id: renombrar(i.id) })) };
    const filas = filasNoche.map((f) => ({ ...f, indicadorId: renombrar(f.indicadorId) }));
    const noche: EntradaResumen = {
      jornada: "noche",
      competencia: propia,
      equipo: equipoNoche,
      reporte: agregarReporte(propia, equipoNoche, participantesNoche, filas),
    };
    const distinto = agregarResumenGrupo([entrada("manana"), noche]);
    expect(distinto.mismaRubrica).toBe(false);
    expect(distinto.grupo.indicadores).toBeNull();
    expect(distinto.grupo.masFuertes).toEqual([]);
    // The KPIs still combine.
    expect(distinto.grupo.puntaje).toBeCloseTo(pts((3.75 + 2 + 1 + 2) / 4), 10);
    expect(distinto.jornadas[1].indicadores.map((i) => i.indicadorId)).toEqual([
      "adaptabilidad-noche-1",
      "adaptabilidad-noche-2",
      "adaptabilidad-noche-3",
      "adaptabilidad-noche-4",
    ]);
    expect(distinto.jornadas[1].indicadores.map((i) => i.media)).toEqual(enPuntos([1.5, 1.5, 1.5, 1.5]));
  });

  it("rechaza entradas vacías, jornadas repetidas o competencias mezcladas", () => {
    expect(() => agregarResumenGrupo([])).toThrow();
    expect(() => agregarResumenGrupo([entrada("manana"), entrada("manana")])).toThrow();
    const otra: EntradaResumen = { ...entrada("noche"), competencia: { ...competencia, id: "otra" } };
    expect(() => agregarResumenGrupo([entrada("manana"), otra])).toThrow();
  });
});
