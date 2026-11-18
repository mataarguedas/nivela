import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import { equipoDeCompetencia } from "@/config/equipos";
import { crearParticipante } from "@/config/participantes";
import { BOM, celdaCsv, COLUMNAS_CSV, generarCsv } from "@/lib/csv";
import type { FilaReporte } from "@/lib/reportes";

const competencia = obtenerCompetencia("manana", "adaptabilidad")!;
const equipo = equipoDeCompetencia("manana", "adaptabilidad")!;
/** Every stored participant: P01 with name and carnet, P02 with neither. */
const PARTICIPANTES = [crearParticipante(1, "Ana Pérez", "100000002"), crearParticipante(2, null)];

function fila(extra: Partial<FilaReporte> = {}): FilaReporte {
  return {
    evaluadorId: "ramses-salas-vargas",
    participanteId: "P01",
    actualizadoEn: "2026-10-25T20:05:00.000Z",
    indicadorId: "adaptabilidad-1",
    nivel: 3,
    origen: "manual",
    observacion: null,
    iaNivelSugerido: null,
    iaConfianza: null,
    ...extra,
  };
}

function lineas(csv: string): string[] {
  return csv.slice(BOM.length).split("\r\n");
}

describe("generarCsv", () => {
  it("empieza con BOM y el encabezado exacto de PRD §10", () => {
    const csv = generarCsv("manana", competencia, equipo, [], PARTICIPANTES);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lineas(csv)[0]).toBe(
      "jornada,competencia,evaluador,curso_evaluador,participante,carnet,indicador,nivel,nivel_nombre,origen,ia_nivel_sugerido,ia_confianza,observacion,actualizado",
    );
    expect(COLUMNAS_CSV).toHaveLength(14);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("una fila manual: evaluador con tildes, curso, carné (nunca el nombre), número de indicador, nivel y fecha en hora de Costa Rica", () => {
    const csv = generarCsv("manana", competencia, equipo, [fila()], PARTICIPANTES);
    const [, linea] = lineas(csv);
    expect(linea).toBe("Mañana,Adaptabilidad,Ramsés Salas Vargas,AGRH 315 Psicología 2,P01,100000002,1,3,Avanzado,manual,,,,25/10/2026 14:05");
    expect(csv).not.toContain("Ana Pérez");
  });

  it("una fila con IA: nivel sugerido y confianza a 2 decimales con punto", () => {
    const [, linea] = lineas(
      generarCsv("manana", competencia, equipo, [
        fila({ indicadorId: "adaptabilidad-4", nivel: 4, origen: "ia", iaNivelSugerido: 4, iaConfianza: 0.7099999785423279 }),
      ], PARTICIPANTES),
    );
    expect(linea.split(",").slice(6, 12)).toEqual(["4", "4", "Experto", "ia", "4", "0.71"]);
  });

  it("una persona evaluadora fuera de config se exporta con su id y sin curso", () => {
    const [, linea] = lineas(generarCsv("manana", competencia, equipo, [fila({ evaluadorId: "antiguo-id" })], PARTICIPANTES));
    expect(linea.startsWith("Mañana,Adaptabilidad,antiguo-id,,P01,100000002,")).toBe(true);
  });

  it("la columna jornada nombra la jornada exportada", () => {
    const [, linea] = lineas(generarCsv("noche", competencia, equipo, [fila()], PARTICIPANTES));
    expect(linea.startsWith("Noche,Adaptabilidad,")).toBe(true);
  });

  it("entrecomilla observaciones con comas, comillas y saltos de línea", () => {
    const csv = generarCsv("manana", competencia, equipo, [fila({ observacion: 'Dijo "listo", y\nsiguió' })], PARTICIPANTES);
    expect(csv).toContain(',"Dijo ""listo"", y\nsiguió",25/10/2026 14:05\r\n');
  });

  it("carné: vacío sin carné o fuera de la lista; neutraliza fórmulas", () => {
    const participantes = [...PARTICIPANTES, crearParticipante(3, "Carla", "-12345")];
    const [, sinNombre, desconocido, formula] = lineas(
      generarCsv("manana", competencia, equipo, [fila({ participanteId: "P02" }), fila({ participanteId: "P40" }), fila({ participanteId: "P03" })], participantes),
    );
    expect(sinNombre.split(",").slice(4, 6)).toEqual(["P02", ""]);
    expect(desconocido.split(",").slice(4, 6)).toEqual(["P40", ""]);
    expect(formula.split(",").slice(4, 6)).toEqual(["P03", "'-12345"]);
  });
});

describe("celdaCsv", () => {
  it("neutraliza fórmulas al inicio del texto (inyección CSV)", () => {
    expect(celdaCsv("=SUMA(A1:A9)")).toBe("'=SUMA(A1:A9)");
    expect(celdaCsv("+50")).toBe("'+50");
    expect(celdaCsv("-3 puntos")).toBe("'-3 puntos");
    expect(celdaCsv("@cmd")).toBe("'@cmd");
    expect(celdaCsv("\tTab")).toBe("'\tTab");
    expect(celdaCsv('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
  });

  it("no toca números, texto normal ni vacíos", () => {
    expect(celdaCsv(3)).toBe("3");
    expect(celdaCsv(0.71)).toBe("0.71");
    expect(celdaCsv("Adaptó su método")).toBe("Adaptó su método");
    expect(celdaCsv(null)).toBe("");
  });
});
