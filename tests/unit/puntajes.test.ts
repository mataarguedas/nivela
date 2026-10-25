import { describe, expect, it } from "vitest";
import {
  acuerdo,
  cobertura,
  coincidencia,
  desviacionEstandar,
  nivelGeneral,
  promedio,
  puntajeEvaluacion,
  puntajeGeneral,
  puntajeIndicador,
  redondear2,
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

  it("puntaje por indicador es la media entre evaluadores", () => {
    expect(puntajeIndicador([2, 3, 4])).toBe(3);
    expect(puntajeIndicador([1, 2])).toBe(1.5);
  });

  it("puntaje general es la media de las medias por indicador, no de los niveles crudos", () => {
    // Indicator means 2, 3, 3, 4 → 3, regardless of how many ratings each has.
    expect(puntajeGeneral([2, 3, 3, 4])).toBe(3);
    expect(puntajeGeneral([puntajeIndicador([1, 2, 3])!, 4])).toBe(3);
  });
});

describe("nivelGeneral", () => {
  it.each([
    [1, 1],
    [1.49, 1],
    [1.5, 2],
    [2.49, 2],
    [2.5, 3],
    [3.49, 3],
    [3.5, 4],
    [4, 4],
  ] as const)("%d → nivel %d", (puntaje, nivel) => {
    expect(nivelGeneral(puntaje)).toBe(nivel);
  });

  it("clasifica con el valor redondeado que se muestra", () => {
    // Displayed as "1,50", so it must read Intermedio, not Básico.
    expect(nivelGeneral(1.497)).toBe(2);
    expect(nivelGeneral(1.494)).toBe(1);
    // Float noise from a mean of means must not drop below a boundary.
    expect(nivelGeneral(2.4999999999999996)).toBe(3);
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
});
