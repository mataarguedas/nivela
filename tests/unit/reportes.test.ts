import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import type { Participante } from "@/config/participantes";
import { agregarReporte, type FilaReporte } from "@/lib/reportes";

// agregarReporte against a small hand-computed fixture: 3 evaluators × 3
// participants on the real Adaptabilidad indicators. P01 is rated by all 3,
// P02 by 2, P03 by none. Expected values are worked out in the comments.

const competencia = obtenerCompetencia("adaptabilidad")!;

const equipo: Equipo = {
  id: "equipo-prueba",
  numero: 9,
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "e1", nombre: "Ana Núñez", curso: "AGRH 315 Psicología 2" },
    { id: "e2", nombre: "Bea Solís", curso: "AGRH 613 Seminario Integrado de RRHH" },
    { id: "e3", nombre: "Carlos Peña", curso: "AGRH 613 Seminario Integrado de RRHH" },
  ],
};

const participantes: Participante[] = [
  { id: "P01", etiqueta: "Participante 01" },
  { id: "P02", etiqueta: "Participante 02" },
  { id: "P03", etiqueta: "Participante 03" },
];

type Extra = Partial<Pick<FilaReporte, "origen" | "observacion" | "indicadorId">>;

function evaluacion(evaluadorId: string, participanteId: string, niveles: number[], extras: Record<number, Extra> = {}): FilaReporte[] {
  return niveles.map((nivel, i) => ({
    evaluadorId,
    participanteId,
    actualizadoEn: "2026-10-25T18:00:00.000Z",
    indicadorId: `adaptabilidad-${i + 1}`,
    nivel,
    origen: "manual",
    observacion: null,
    iaNivelSugerido: null,
    iaConfianza: null,
    ...extras[i + 1],
  }));
}

const FILAS: FilaReporte[] = [
  // P01. Ind1 4,4,3 → 3,67 (SD 0,47 alta) · Ind2 4,3,4 → 3,67 · Ind3 4 · Ind4 4
  // General (3,667 + 3,667 + 4 + 4) / 4 = 3,83 → Experto.
  ...evaluacion("e1", "P01", [4, 4, 4, 4], { 1: { origen: "ia" }, 2: { observacion: "   " } }),
  ...evaluacion("e2", "P01", [4, 3, 4, 4], { 2: { observacion: "Ajustó su método al nuevo procedimiento." } }),
  ...evaluacion("e3", "P01", [3, 4, 4, 4], { 2: { observacion: "Respondió con rapidez." } }),
  // P02. Ind1 1,3 → 2 (SD 1 media) · Ind2 2,2 → 2 (alta) · Ind3 3,1 → 2 (media)
  // Ind4 1,4 → 2,5 (SD 1,5 baja). General (2 + 2 + 2 + 2,5) / 4 = 2,125 → Intermedio.
  ...evaluacion("e1", "P02", [1, 2, 3, 1]),
  ...evaluacion("e2", "P02", [3, 2, 1, 4], { 4: { origen: "ia" } }),
  // Ignored: an evaluator outside the team, a participant outside config, an
  // indicator outside the competencia, and an out-of-range level.
  ...evaluacion("intruso", "P03", [4, 4, 4, 4]),
  ...evaluacion("e1", "P99", [4, 4, 4, 4]),
  ...evaluacion("e3", "P03", [2], { 1: { indicadorId: "otro-indicador" } }),
  ...evaluacion("e3", "P03", [7]),
];

describe("agregarReporte", () => {
  const reporte = agregarReporte(competencia, equipo, participantes, FILAS);
  const [p01, p02, p03] = reporte.participantes;

  it("KPIs: evaluados, recibidas/esperadas, cobertura, puntaje promedio y % IA", () => {
    expect(reporte.vacio).toBe(false);
    expect(reporte.competencia).toEqual({ id: "adaptabilidad", nombre: "Adaptabilidad" });
    expect(reporte.kpis).toMatchObject({ participantesEvaluados: 2, participantesTotal: 3, recibidas: 5, esperadas: 9 });
    expect(reporte.kpis.cobertura).toBeCloseTo(5 / 9, 10);
    expect(reporte.kpis.puntajePromedio).toBeCloseTo((23 / 6 + 2.125) / 2, 10);
    // 2 "ia" levels out of the 20 valid ones; ignored rows don't count.
    expect(reporte.kpis.proporcionIa).toBe(0.1);
  });

  it("por participante: medias por indicador, puntaje y nivel general, evaluaciones y % IA", () => {
    expect(p01.evaluaciones).toBe(3);
    expect(p01.indicadores.map((i) => i.media)).toEqual([11 / 3, 11 / 3, 4, 4]);
    expect(p01.puntajeGeneral).toBeCloseTo(23 / 6, 10);
    expect(p01.nivelGeneral).toBe(4);
    expect(p01.proporcionIa).toBe(1 / 12);

    expect(p02.evaluaciones).toBe(2);
    expect(p02.indicadores.map((i) => i.media)).toEqual([2, 2, 2, 2.5]);
    expect(p02.puntajeGeneral).toBe(2.125);
    expect(p02.nivelGeneral).toBe(2);
    expect(p02.proporcionIa).toBe(1 / 8);
  });

  it("acuerdo con rango, desviación y cada nivel de coincidencia", () => {
    expect(p01.indicadores[0].acuerdo).toMatchObject({ min: 3, max: 4, coincidencia: "alta" });
    expect(p01.indicadores[0].acuerdo!.desviacion).toBeCloseTo(Math.sqrt(2 / 9), 10);
    expect(p02.indicadores.map((i) => i.acuerdo?.coincidencia)).toEqual(["media", "alta", "media", "baja"]);
    expect(p02.indicadores[3].acuerdo).toMatchObject({ min: 1, max: 4, desviacion: 1.5 });
  });

  it("distribución por participante e indicador", () => {
    expect(p01.indicadores[0].distribucion).toEqual({ 1: 0, 2: 0, 3: 1, 4: 2 });
    expect(p02.indicadores[3].distribucion).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1 });
  });

  it("observaciones con nombre y nivel, en el orden del equipo, sin las vacías", () => {
    expect(p01.indicadores[1].observaciones).toEqual([
      { evaluador: "Bea Solís", nivel: 3, texto: "Ajustó su método al nuevo procedimiento." },
      { evaluador: "Carlos Peña", nivel: 4, texto: "Respondió con rapidez." },
    ]);
    expect(p01.indicadores[0].observaciones).toEqual([]);
  });

  it("un participante sin evaluaciones aparece con valores nulos y sin posición en el ranking", () => {
    expect(p03).toMatchObject({ id: "P03", evaluaciones: 0, puntajeGeneral: null, nivelGeneral: null, proporcionIa: null });
    expect(p03.indicadores.every((i) => i.media === null && i.acuerdo === null)).toBe(true);
    expect(reporte.ranking.map((r) => r.id)).toEqual(["P01", "P02"]);
    expect(reporte.ranking[0]).toMatchObject({ etiqueta: "Participante 01", nivel: 4 });
  });

  it("distribución general por indicador con todas las calificaciones válidas", () => {
    expect(reporte.distribucion.map((d) => d.numero)).toEqual([1, 2, 3, 4]);
    // Ind1: P01 4,4,3 and P02 1,3.
    expect(reporte.distribucion[0]).toMatchObject({ conteo: { 1: 1, 2: 0, 3: 2, 4: 2 }, total: 5 });
    expect(reporte.distribucion[0].titulo).toBe(competencia.indicadores[0].titulo);
  });

  it("matriz de cobertura evaluador × participante en el orden de config", () => {
    expect(reporte.cobertura.participantes.map((p) => p.id)).toEqual(["P01", "P02", "P03"]);
    expect(reporte.cobertura.filas).toEqual([
      { evaluadorId: "e1", nombre: "Ana Núñez", enviadas: [true, true, false], total: 2 },
      { evaluadorId: "e2", nombre: "Bea Solís", enviadas: [true, true, false], total: 2 },
      { evaluadorId: "e3", nombre: "Carlos Peña", enviadas: [true, false, false], total: 1 },
    ]);
  });

  it("empates en el ranking se ordenan por código", () => {
    const empate = agregarReporte(competencia, equipo, participantes, [
      ...evaluacion("e1", "P03", [3, 3, 3, 3]),
      ...evaluacion("e1", "P02", [3, 3, 3, 3]),
      ...evaluacion("e1", "P01", [2, 2, 2, 2]),
    ]);
    expect(empate.ranking.map((r) => r.id)).toEqual(["P02", "P03", "P01"]);
  });

  it("sin filas: estado vacío", () => {
    const vacio = agregarReporte(competencia, equipo, participantes, []);
    expect(vacio.vacio).toBe(true);
    expect(vacio.ranking).toEqual([]);
    expect(vacio.kpis).toEqual({
      participantesEvaluados: 0,
      participantesTotal: 3,
      recibidas: 0,
      esperadas: 9,
      cobertura: 0,
      puntajePromedio: null,
      proporcionIa: null,
    });
    expect(vacio.distribucion[0]).toMatchObject({ conteo: { 1: 0, 2: 0, 3: 0, 4: 0 }, total: 0 });
    expect(vacio.cobertura.filas.every((f) => f.total === 0)).toBe(true);
  });

  it("solo filas ajenas también es estado vacío", () => {
    const ajenas = agregarReporte(competencia, equipo, participantes, evaluacion("intruso", "P01", [4, 4, 4, 4]));
    expect(ajenas.vacio).toBe(true);
    expect(ajenas.kpis.recibidas).toBe(0);
  });
});
