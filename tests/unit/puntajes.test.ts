import { describe, expect, it } from "vitest";
import {
  acuerdo,
  asistenciaParticipante,
  brechaSiguienteNivel,
  cobertura,
  coincidencia,
  desviacionEstandar,
  distribucion,
  estadoAvance,
  evaluacionesEsperadas,
  extremos,
  nivelGeneral,
  promedio,
  proporcion,
  puntajeEvaluacion,
  puntajeGeneral,
  puntajeEntreCompetencias,
  puntajeGrupo,
  puntajeIndicador,
  puntosDesdeNiveles,
  RANGOS_PUNTOS,
  redondear2,
  redondearPuntos,
} from "@/lib/puntajes";

describe("promedio y puntajes", () => {
  it("promedio de una lista vacía es null", () => {
    expect(promedio([])).toBeNull();
    expect(puntajeEvaluacion([])).toBeNull();
    expect(puntajeIndicador([])).toBeNull();
    expect(puntajeGeneral([])).toBeNull();
  });

  it("puntaje de una evaluación es la media de sus 4 niveles", () => {
    expect(puntajeEvaluacion([3, 2, 3, 3])).toBe(2.75);
    expect(puntajeEvaluacion([1, 1, 1, 1])).toBe(1);
    expect(puntajeEvaluacion([4, 4, 4, 4])).toBe(4);
  });

  it("los niveles 1–4 pasan a puntos 0–100: (m − 1) ÷ 3 × 100", () => {
    expect(puntosDesdeNiveles(1)).toBe(0);
    expect(puntosDesdeNiveles(2)).toBeCloseTo(100 / 3, 10);
    expect(puntosDesdeNiveles(2.5)).toBe(50);
    expect(puntosDesdeNiveles(3)).toBeCloseTo(200 / 3, 10);
    expect(puntosDesdeNiveles(4)).toBe(100);
    // Each level, rated alone, falls in its own band.
    for (const nivel of [1, 2, 3, 4] as const) expect(nivelGeneral(puntosDesdeNiveles(nivel))).toBe(nivel);
  });

  it("puntaje por indicador es la media entre evaluadores, en puntos", () => {
    expect(puntajeIndicador([2, 3, 4])).toBeCloseTo(200 / 3, 10);
    expect(puntajeIndicador([1, 4])).toBe(50);
    expect(puntajeIndicador([4, 4])).toBe(100);
  });

  it("puntaje general es la media de los puntajes por indicador, no de los niveles crudos", () => {
    // Indicator scores 0, 50, 50, 100 → 50, regardless of how many ratings each has.
    expect(puntajeGeneral([0, 50, 50, 100])).toBe(50);
    expect(puntajeGeneral([puntajeIndicador([1, 2, 3])!, puntajeIndicador([4])!])).toBeCloseTo(200 / 3, 10);
  });
});

describe("nivelGeneral (0–24 Básico, 25–49 Intermedio, 50–74 Avanzado, 75–100 Experto)", () => {
  it.each([
    [0, 1],
    [24, 1],
    [25, 2],
    [49, 2],
    [50, 3],
    [74, 3],
    [75, 4],
    [100, 4],
  ] as const)("%d → nivel %d", (puntaje, nivel) => {
    expect(nivelGeneral(puntaje)).toBe(nivel);
  });

  it("las bandas de puntos cubren 0–100 sin huecos", () => {
    expect(RANGOS_PUNTOS).toEqual({
      1: { min: 0, max: 24 },
      2: { min: 25, max: 49 },
      3: { min: 50, max: 74 },
      4: { min: 75, max: 100 },
    });
    for (let p = 0; p <= 100; p += 1) {
      const n = nivelGeneral(p);
      expect(p).toBeGreaterThanOrEqual(RANGOS_PUNTOS[n].min);
      expect(p).toBeLessThanOrEqual(RANGOS_PUNTOS[n].max);
    }
  });

  it("clasifica con el valor entero que se muestra", () => {
    // 24,5 is displayed as "25", so it must read Intermedio, not Básico.
    expect(nivelGeneral(24.5)).toBe(2);
    expect(nivelGeneral(24.49)).toBe(1);
    expect(nivelGeneral(74.6)).toBe(4);
    // Float noise from a mean of means must not drop below a boundary.
    expect(nivelGeneral(49.99999999999999)).toBe(3);
    expect(nivelGeneral(puntosDesdeNiveles(1.75))).toBe(2);
    expect(nivelGeneral(puntosDesdeNiveles(3.25))).toBe(4);
  });

  it("redondearPuntos", () => {
    expect(redondearPuntos(66.666)).toBe(67);
    expect(redondearPuntos(33.333)).toBe(33);
    expect(redondearPuntos(24.499999999999996)).toBe(25);
  });

  it("redondear2", () => {
    expect(redondear2(2.745)).toBe(2.75);
    expect(redondear2(1.005)).toBe(1.01);
    expect(redondear2(3.3333333)).toBe(3.33);
  });
});

describe("desviación estándar y coincidencia", () => {
  it("desviación vacía es null y un único valor da 0", () => {
    expect(desviacionEstandar([])).toBeNull();
    expect(desviacionEstandar([3])).toBe(0);
  });

  it("usa la desviación poblacional", () => {
    expect(desviacionEstandar([1, 2])).toBe(0.5);
    expect(desviacionEstandar([1, 3])).toBe(1);
    expect(desviacionEstandar([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it.each([
    [0, "alta"],
    [0.5, "alta"],
    [0.5000000000000001, "alta"],
    [0.51, "media"],
    [1, "media"],
    [1.01, "baja"],
    [1.5, "baja"],
  ] as const)("SD %d → %s", (sd, esperado) => {
    expect(coincidencia(sd)).toBe(esperado);
  });

  it("acuerdo devuelve rango, SD y coincidencia", () => {
    expect(acuerdo([])).toBeNull();
    expect(acuerdo([3, 3, 3])).toEqual({ min: 3, max: 3, desviacion: 0, coincidencia: "alta" });
    expect(acuerdo([2, 3])).toEqual({ min: 2, max: 3, desviacion: 0.5, coincidencia: "alta" });
    expect(acuerdo([1, 3])).toEqual({ min: 1, max: 3, desviacion: 1, coincidencia: "media" });
    expect(acuerdo([1, 4])).toEqual({ min: 1, max: 4, desviacion: 1.5, coincidencia: "baja" });
    expect(acuerdo([1, 2, 2, 3])?.coincidencia).toBe("media"); // SD ≈ 0.707
  });
});

describe("cobertura", () => {
  it("es recibidas ÷ (evaluadores × participantes)", () => {
    expect(cobertura(80, 8, 20)).toBe(0.5);
    expect(cobertura(160, 8, 20)).toBe(1);
    expect(cobertura(0, 8, 20)).toBe(0);
  });

  it("es null cuando no se espera ninguna evaluación", () => {
    expect(cobertura(0, 0, 20)).toBeNull();
    expect(cobertura(0, 8, 0)).toBeNull();
  });

  it("los pares marcados ausentes salen del denominador (PRD §7, §5.13)", () => {
    // 8 × 20 = 160 esperadas, 10 pares ausentes → 150.
    expect(evaluacionesEsperadas(8, 20)).toBe(160);
    expect(evaluacionesEsperadas(8, 20, 10)).toBe(150);
    expect(cobertura(150, 8, 20, 10)).toBe(1);
    expect(cobertura(75, 8, 20, 10)).toBe(0.5);
    // A night team of 7: the size comes from the team, never a constant.
    expect(cobertura(70, 7, 20, 0)).toBe(0.5);
  });

  it("todos ausentes: nada esperado, cobertura null; nunca negativo", () => {
    expect(evaluacionesEsperadas(2, 3, 6)).toBe(0);
    expect(cobertura(0, 2, 3, 6)).toBeNull();
    expect(evaluacionesEsperadas(2, 3, 9)).toBe(0);
  });
});

describe("asistenciaParticipante", () => {
  it("ausente con marcas y sin evaluaciones; en conflicto con ambas; null sin marcas", () => {
    expect(asistenciaParticipante(1, 0)).toBe("ausente");
    expect(asistenciaParticipante(5, 0)).toBe("ausente");
    expect(asistenciaParticipante(2, 3)).toBe("conflicto");
    expect(asistenciaParticipante(0, 0)).toBeNull();
    expect(asistenciaParticipante(0, 8)).toBeNull();
  });
});

describe("distribucion y proporcion", () => {
  it("cuenta cuántas calificaciones eligieron cada nivel, con 0 para los que nadie eligió", () => {
    expect(distribucion([3, 3, 1, 4, 3])).toEqual({ 1: 1, 2: 0, 3: 3, 4: 1 });
    expect(distribucion([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 });
  });

  it("proporcion es parte ÷ total, o null sin total", () => {
    expect(proporcion(1, 4)).toBe(0.25);
    expect(proporcion(0, 4)).toBe(0);
    expect(proporcion(0, 0)).toBeNull();
  });
});

describe("brechaSiguienteNivel (PRD §7)", () => {
  it.each([
    // [puntaje, nivel actual, siguiente, umbral, faltante]
    [0, 1, 2, 25, 25],
    [24, 1, 2, 25, 1],
    [25, 2, 3, 50, 25],
    [49, 2, 3, 50, 1],
    [50, 3, 4, 75, 25],
    [61, 3, 4, 75, 14],
    [74, 3, 4, 75, 1],
  ] as const)("%s → nivel %s, faltan %s… para %s", (puntaje, actual, siguiente, umbral, faltante) => {
    expect(brechaSiguienteNivel(puntaje)).toEqual({ nivelActual: actual, siguiente, umbral, faltante });
  });

  it("desde 75 no hay siguiente: Nivel máximo alcanzado", () => {
    for (const puntaje of [75, 83, 100]) {
      expect(brechaSiguienteNivel(puntaje)).toEqual({ nivelActual: 4, siguiente: null, umbral: null, faltante: null });
    }
  });

  it("redondea como nivelGeneral: el puntaje mostrado y la brecha siempre coinciden", () => {
    // 49,6 se muestra como 50: Avanzado, faltan 25 para Experto (no 0,4 para Avanzado).
    expect(brechaSiguienteNivel(49.6)).toEqual({ nivelActual: 3, siguiente: 4, umbral: 75, faltante: 25 });
    expect(brechaSiguienteNivel(49.4)).toMatchObject({ nivelActual: 2, faltante: 1 });
    expect(brechaSiguienteNivel(74.5)).toMatchObject({ nivelActual: 4, siguiente: null });
    // Scores from level means: 2,125 → 37,5 → 38; 7/3 → 44,4 → 44.
    expect(brechaSiguienteNivel(puntosDesdeNiveles(2.125))).toMatchObject({ nivelActual: 2, faltante: 12 });
    expect(brechaSiguienteNivel(puntosDesdeNiveles(7 / 3))).toMatchObject({ nivelActual: 2, faltante: 6 });
    // Up to 74,4: from 74,5 the score shows as 75 (Experto, no next level).
    for (let decimas = 0; decimas < 745; decimas += 1) {
      const p = decimas / 10;
      const { nivelActual, faltante, umbral } = brechaSiguienteNivel(p);
      expect(nivelActual).toBe(nivelGeneral(p));
      expect(faltante).toBe(umbral! - redondearPuntos(p));
      expect(Number.isInteger(faltante)).toBe(true);
    }
  });
});

describe("estadoAvance (PRD §7)", () => {
  it("Sin iniciar con 0 enviadas, En progreso a medias, Completo al llegar a las esperadas", () => {
    expect(estadoAvance(0, 20)).toBe("sin-iniciar");
    expect(estadoAvance(7, 20)).toBe("en-progreso");
    expect(estadoAvance(18, 18)).toBe("completo");
  });

  it("sin nada esperado (todos ausentes) es Completo", () => {
    expect(estadoAvance(0, 0)).toBe("completo");
  });
});

describe("puntajeGrupo y extremos (PRD §7, §11.3)", () => {
  it("el puntaje del grupo es el promedio de los puntajes generales recibidos", () => {
    expect(puntajeGrupo([])).toBeNull();
    expect(puntajeGrupo([3.83, 2.125])).toBeCloseTo(2.9775, 10);
  });

  it("el promedio entre competencias promedia los puntajes generales recibidos (PRD §7, §11.4)", () => {
    expect(puntajeEntreCompetencias([])).toBeNull();
    expect(puntajeEntreCompetencias([3.5, 2])).toBe(2.75);
    expect(puntajeEntreCompetencias([3.25])).toBe(3.25);
  });

  it("extremos compara en puntos enteros, ignora los nulos y conserva los empates", () => {
    expect(extremos([])).toBeNull();
    expect(extremos([null, null])).toBeNull();
    expect(extremos([75, null, 37, 50])).toEqual({ maximos: [0], minimos: [2] });
    // 49,6 se muestra como 50: empata con 50.
    expect(extremos([50, 67, 49.6, 66.7])).toEqual({ maximos: [1, 3], minimos: [0, 2] });
    expect(extremos([58, 58])).toEqual({ maximos: [0, 1], minimos: [0, 1] });
  });
});
