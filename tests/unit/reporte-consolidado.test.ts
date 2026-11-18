import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  barrasPuntajePorCompetencia,
  fraseFuertesDebiles,
  parrafoConsolidado,
  parrafoParticipante,
  tituloPuntajePorCompetencia,
} from "@/components/reportes/datosGraficos";
import { DEFINICIONES_COMPETENCIA, obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { crearParticipante } from "@/config/participantes";
import { BOM, generarCsvConsolidado } from "@/lib/csv";
import {
  agregarConsolidado,
  agregarParticipanteConsolidado,
  agregarReporte,
  tableroConsolidado,
  type EntradaConsolidado,
  type FilaReporte,
  type ReporteConsolidado,
} from "@/lib/reportes";

// Reporte consolidado (PRD §11.4): every competencia of a jornada side by
// side, built on each competencia's own Reporte. Hand-computed fixture on the
// real morning rubrics of Adaptabilidad and Pensamiento crítico, plus
// Orientación al detalle as a competencia without a rubric/team (null). Team
// numbers and sizes are fixture values, never config's.
//
// Adaptabilidad (team "Equipo 4", a1 and a2):
//   P01 by a1: 4,4,3,3 → 3,50 Experto · P02 by a1: 2,2,2,2 → 2,00 Intermedio
//   P03 marked absent by a2, never rated → Ausente.
//   Group (3,5 + 2) / 2 = 2,75 Avanzado. Received 2 of 2×3 − 1 = 5 (40 %). 0 of 2 complete.
// Pensamiento crítico (team "Equipo 1", p1):
//   P01: 2,2,2,2 → 2,00 · P03: 3,3,3,3 → 3,00. Group 2,50 Avanzado. Received 2 of 3. 0 of 1 complete.
// Promedio entre competencias: P01 (3,5 + 2) / 2 = 2,75 Avanzado (2 competencias),
//   P02 2,00 (1), P03 3,00 (1). Group (2,75 + 2 + 3) / 3 = 2,5833 → Avanzado.

const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
const db = vi.hoisted(() => ({ obtenerReporteConsolidado: vi.fn() }));
const dbParticipantes = vi.hoisted(() => ({ obtenerTodosLosParticipantes: vi.fn() }));
vi.mock("@/lib/sesion", () => sesion);
vi.mock("@/lib/db/reportes", () => db);
vi.mock("@/lib/db/participantes", () => dbParticipantes);

const { GET } = await import("@/app/api/reportes/consolidado/csv/route");

const CURSO = "AGRH 315 Psicología 2" as const;
const adaptabilidad = obtenerCompetencia("manana", "adaptabilidad")!;
const pensamiento = obtenerCompetencia("manana", "pensamiento-critico")!;

const equipoA: Equipo = {
  id: "equipo-a",
  numero: 4,
  jornada: "manana",
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "a1", nombre: "Ana Núñez", curso: CURSO },
    { id: "a2", nombre: "Bea Solís", curso: CURSO },
  ],
};
const equipoP: Equipo = {
  id: "equipo-p",
  numero: 1,
  jornada: "manana",
  competenciaId: "pensamiento-critico",
  integrantes: [{ id: "p1", nombre: "Carlos Peña", curso: CURSO }],
};

const participantes = [
  crearParticipante(1, "Tamara Prueba", "100000001"),
  crearParticipante(2, "Luis Prueba"),
  crearParticipante(3, "Pamela Prueba", "100000003"),
];

function evaluacion(prefijo: string, evaluadorId: string, participanteId: string, niveles: number[]): FilaReporte[] {
  return niveles.map((nivel, i) => ({
    evaluadorId,
    participanteId,
    actualizadoEn: "2026-11-18T18:00:00.000Z",
    indicadorId: `${prefijo}-${i + 1}`,
    nivel,
    origen: "manual",
    observacion: null,
    iaNivelSugerido: null,
    iaConfianza: null,
  }));
}

/** The fixture's entries; `conBasico` adds p1 -> P02 at 1,1,1,1 in Pensamiento crítico (Básico). */
function entradas({ conBasico = false } = {}): EntradaConsolidado[] {
  const reporteA = agregarReporte(
    adaptabilidad,
    equipoA,
    participantes,
    [...evaluacion("adaptabilidad", "a1", "P01", [4, 4, 3, 3]), ...evaluacion("adaptabilidad", "a1", "P02", [2, 2, 2, 2])],
    [{ evaluadorId: "a2", participanteId: "P03" }],
  );
  const reporteP = agregarReporte(pensamiento, equipoP, participantes, [
    ...evaluacion("pensamiento-critico", "p1", "P01", [2, 2, 2, 2]),
    ...evaluacion("pensamiento-critico", "p1", "P03", [3, 3, 3, 3]),
    ...(conBasico ? evaluacion("pensamiento-critico", "p1", "P02", [1, 1, 1, 1]) : []),
  ]);
  return [
    { id: "adaptabilidad", nombre: adaptabilidad.nombre, reporte: reporteA },
    { id: "pensamiento-critico", nombre: pensamiento.nombre, reporte: reporteP },
    { id: "orientacion-detalle", nombre: "Orientación al detalle", reporte: null },
  ];
}

function construir(opciones?: { conBasico?: boolean }): ReporteConsolidado {
  return agregarConsolidado(participantes, entradas(opciones));
}

it("ninguna competencia usa el id «consolidado» (la ruta estática tiene prioridad sobre [competencia])", () => {
  expect(DEFINICIONES_COMPETENCIA.map((d) => d.id)).not.toContain("consolidado");
});

describe("agregarConsolidado", () => {
  const reporte = construir();

  it("resume cada competencia con su propio equipo y deja la que no tiene plantilla como no disponible", () => {
    const [a, p, o] = reporte.competencias;
    expect(a).toMatchObject({
      id: "adaptabilidad",
      disponible: true,
      numeroEquipo: 4,
      conEvaluaciones: true,
      nivel: 3,
      participantesEvaluados: 2,
      participantesTotal: 3,
      recibidas: 2,
      esperadas: 5,
      ausentes: 1,
      evaluadoresCompletos: 0,
      evaluadoresTotal: 2,
    });
    expect(a.puntaje).toBeCloseTo(2.75, 10);
    expect(a.cobertura).toBeCloseTo(0.4, 10);
    expect(a.brecha).toEqual({ nivelActual: 3, siguiente: 4, umbral: 3.5, faltante: 0.75 });
    expect(p).toMatchObject({ numeroEquipo: 1, nivel: 3, recibidas: 2, esperadas: 3, evaluadoresTotal: 1 });
    expect(p.puntaje).toBeCloseTo(2.5, 10);
    expect(o).toMatchObject({ disponible: false, numeroEquipo: null, conEvaluaciones: false, puntaje: null, evaluadoresTotal: 0 });
  });

  it("cada participante tiene su puntaje general por competencia (por carné) y el promedio entre competencias", () => {
    const [p01, p02, p03] = reporte.participantes;
    expect(p01.etiqueta).toBe("100000001");
    expect(p01.celdas).toEqual([
      { puntaje: 3.5, nivel: 4, evaluaciones: 1, asistencia: null },
      { puntaje: 2, nivel: 2, evaluaciones: 1, asistencia: null },
      null,
    ]);
    expect(p01).toMatchObject({ competenciasEvaluadas: 2, nivel: 3 });
    expect(p01.promedio).toBeCloseTo(2.75, 10);
    expect(p01.brecha?.faltante).toBe(0.75);

    expect(p02.etiqueta).toBe("Participante 02");
    expect(p02.celdas[1]).toEqual({ puntaje: null, nivel: null, evaluaciones: 0, asistencia: null });
    expect(p02).toMatchObject({ competenciasEvaluadas: 1, promedio: 2, nivel: 2 });

    // Absent in Adaptabilidad, evaluated in Pensamiento crítico: attendance is per competencia.
    expect(p03.celdas[0]).toEqual({ puntaje: null, nivel: null, evaluaciones: 0, asistencia: "ausente" });
    expect(p03).toMatchObject({ competenciasEvaluadas: 1, promedio: 3, nivel: 3 });
  });

  it("los KPI suman solo las competencias disponibles", () => {
    expect(reporte.vacio).toBe(false);
    expect(reporte.kpis).toMatchObject({
      competenciasDisponibles: 2,
      competenciasConEvaluaciones: 2,
      competenciasTotal: 3,
      participantesEvaluados: 3,
      participantesTotal: 3,
      recibidas: 4,
      esperadas: 8,
      nivelGrupo: 3,
      evaluadoresCompletos: 0,
      evaluadoresTotal: 3,
    });
    expect(reporte.kpis.cobertura).toBeCloseTo(0.5, 10);
    expect(reporte.kpis.promedioGrupo).toBeCloseTo(7.75 / 3, 10);
  });

  it("sin evaluaciones en ninguna competencia está vacío y nadie tiene promedio", () => {
    const vacio = agregarConsolidado(participantes, [
      { id: "adaptabilidad", nombre: adaptabilidad.nombre, reporte: agregarReporte(adaptabilidad, equipoA, participantes, []) },
      { id: "orientacion-detalle", nombre: "Orientación al detalle", reporte: null },
    ]);
    expect(vacio.vacio).toBe(true);
    expect(vacio.kpis.promedioGrupo).toBeNull();
    expect(vacio.kpis.participantesEvaluados).toBe(0);
    expect(vacio.participantes.every((p) => p.promedio === null && p.competenciasEvaluadas === 0)).toBe(true);
  });
});

describe("Puntaje del grupo por competencia (título y barras)", () => {
  const c = (id: string, nombre: string, puntaje: number | null) => ({ id, nombre, puntaje });

  it("nombra la competencia más alta, los empates y los casos sin datos", () => {
    expect(tituloPuntajePorCompetencia([])).toBe("Aún no hay puntajes por competencia.");
    expect(tituloPuntajePorCompetencia([c("a", "Adaptabilidad", null)])).toBe("Aún no hay puntajes por competencia.");
    expect(tituloPuntajePorCompetencia([c("a", "Adaptabilidad", 2.8), c("b", "Orientación al detalle", null)])).toBe(
      "Solo «Adaptabilidad» tiene puntaje (2,80)",
    );
    expect(tituloPuntajePorCompetencia([c("a", "Adaptabilidad", 2.8), c("b", "Orientación al detalle", 3.104)])).toBe(
      "La competencia con el puntaje más alto es «Orientación al detalle» (3,10)",
    );
    expect(
      tituloPuntajePorCompetencia([c("a", "Adaptabilidad", 3.1), c("b", "Orientación al detalle", 3.1), c("c", "Otra", 2)]),
    ).toBe("«Adaptabilidad» y «Orientación al detalle» empatan con el puntaje más alto (3,10)");
    expect(tituloPuntajePorCompetencia([c("a", "Adaptabilidad", 2.5), c("b", "Otra", 2.5)])).toBe(
      "Todas las competencias tienen el mismo puntaje (2,50)",
    );
  });

  it("una barra por competencia en el eje 1–4, sin barra cuando no hay datos", () => {
    const datos = barrasPuntajePorCompetencia([c("a", "Adaptabilidad", 2.75), c("b", "Orientación al detalle", null)]);
    expect(datos.referencias).toHaveLength(3);
    expect(datos.barras[0]).toMatchObject({ clave: "a", etiqueta: "Adaptabilidad", texto: "2,75 · Avanzado", nivel: 3 });
    expect(datos.barras[1]).toMatchObject({ clave: "b", ancho: 0, texto: "Sin datos", nivel: null });
  });
});

// Tablero (PRD §11.4) with `conBasico`: Pensamiento crítico becomes P01 2 · P02 1 · P03 3
// → group 2,00. Promedios: P01 2,75 · P02 (2 + 1) / 2 = 1,50 (Intermedio) · P03 3,00.
// Group (2,75 + 1,5 + 3) / 3 = 2,4167 → 2,42 Intermedio, 0,08 to Avanzado. P02 is Básico in Pensamiento crítico.
describe("tableroConsolidado y «En pocas palabras»", () => {
  it("nombra la competencia más fuerte y la más débil y lista a quienes tienen alguna competencia en Básico", () => {
    const reporte = construir({ conBasico: true });
    const tablero = tableroConsolidado(reporte);
    expect(tablero.masFuertes).toEqual([{ id: "adaptabilidad", nombre: "Adaptabilidad", puntaje: 2.75 }]);
    expect(tablero.masDebiles).toEqual([{ id: "pensamiento-critico", nombre: "Pensamiento crítico y analítico", puntaje: 2 }]);
    expect(tablero.conteoNiveles).toEqual({ 1: 0, 2: 1, 3: 2, 4: 0 });
    expect(tablero.atencion).toEqual([
      {
        id: "P02",
        etiqueta: "Participante 02",
        promedio: 1.5,
        nivel: 2,
        competencias: [{ id: "pensamiento-critico", nombre: "Pensamiento crítico y analítico", puntaje: 1 }],
      },
    ]);
    expect(parrafoConsolidado(reporte, tablero)).toBe(
      "El grupo alcanzó un nivel Intermedio (2,42) como promedio entre competencias. Le faltan 0,08 puntos para Avanzado. " +
        "La competencia más fuerte es «Adaptabilidad» (2,75) y la que más necesita refuerzo es «Pensamiento crítico y analítico» (2,00). " +
        "1 participante tiene al menos una competencia en nivel Básico.",
    );
  });

  it("sin nadie en Básico lo dice, y sin puntajes usa una frase neutra", () => {
    const reporte = construir();
    const tablero = tableroConsolidado(reporte);
    expect(tablero.atencion).toEqual([]);
    expect(parrafoConsolidado(reporte, tablero).endsWith(" Ningún participante tiene competencias en nivel Básico.")).toBe(true);
    const vacio = agregarConsolidado(participantes, [{ id: "orientacion-detalle", nombre: "Orientación al detalle", reporte: null }]);
    expect(parrafoConsolidado(vacio, tableroConsolidado(vacio))).toBe("Aún no hay puntajes para calcular el promedio entre competencias.");
  });

  it("fraseFuertesDebiles: empates, puntajes iguales y menos de dos competencias", () => {
    const c = (nombre: string, puntaje: number) => ({ id: nombre, nombre, puntaje });
    expect(fraseFuertesDebiles([c("A", 3)], [c("B", 2)], 1)).toBeNull();
    expect(fraseFuertesDebiles([c("A", 3), c("B", 3)], [c("A", 3), c("B", 3)], 2)).toBe(
      "Todas las competencias tienen el mismo puntaje (3,00).",
    );
    expect(fraseFuertesDebiles([c("A", 3), c("B", 3)], [c("C", 2)], 3)).toBe(
      "Las competencias más fuertes son «A» (3,00) y «B» (3,00) y la que más necesita refuerzo es «C» (2,00).",
    );
    expect(fraseFuertesDebiles([c("A", 3)], [c("B", 2), c("C", 2)], 3)).toBe(
      "La competencia más fuerte es «A» (3,00) y las que más necesitan refuerzo son «B» (2,00) y «C» (2,00).",
    );
  });
});

// Reporte del participante (PRD §11.5) for P01 on the base fixture:
// Adaptabilidad 3,50 Experto (indicators 4, 4, 3, 3), Pensamiento crítico 2,00
// (all four indicators at 2), Orientación al detalle not available.
describe("agregarParticipanteConsolidado", () => {
  it("reúne al participante en todas las competencias, con sus indicadores más altos y más bajos", () => {
    const reporte = agregarParticipanteConsolidado(participantes, entradas(), "P01")!;
    expect(reporte).toMatchObject({
      id: "P01",
      etiqueta: "100000001",
      promedio: 2.75,
      nivel: 3,
      competenciasEvaluadas: 2,
      competenciasDisponibles: 2,
      evaluaciones: 2,
      masFuertes: [{ id: "adaptabilidad", puntaje: 3.5 }],
      masDebiles: [{ id: "pensamiento-critico", puntaje: 2 }],
    });
    expect(reporte.brecha?.faltante).toBe(0.75);
    const [a, p, o] = reporte.competencias;
    expect(a).toMatchObject({ disponible: true, puntaje: 3.5, nivel: 4, evaluaciones: 1, asistencia: null });
    expect(a.brecha).toMatchObject({ siguiente: null, faltante: null });
    expect(a.indicadoresFuertes.map((i) => i.numero)).toEqual([1, 2]);
    expect(a.indicadoresDebiles.map((i) => i.numero)).toEqual([3, 4]);
    expect(a.indicadores[2]).toMatchObject({ media: 3, nivel: 3 });
    // Every indicator equal: the four are both the highest and the lowest.
    expect(p.indicadoresFuertes).toHaveLength(4);
    expect(o).toMatchObject({ disponible: false, puntaje: null, indicadores: [], evaluaciones: 0 });

    expect(parrafoParticipante(reporte)).toBe(
      "El promedio entre competencias es 2,75 (Avanzado), en 2 de 2 competencias. Le faltan 0,75 puntos para Experto. " +
        "La competencia más fuerte es «Adaptabilidad» (3,50) y la que más necesita refuerzo es «Pensamiento crítico y analítico» (2,00).",
    );
  });

  it("con una sola competencia evaluada no compara; ausente se conserva; un id fuera de la lista es null", () => {
    const p02 = agregarParticipanteConsolidado(participantes, entradas(), "P02")!;
    expect(parrafoParticipante(p02)).toBe(
      "El promedio entre competencias es 2,00 (Intermedio), en 1 de 2 competencias. Le faltan 0,50 puntos para Avanzado.",
    );
    const p03 = agregarParticipanteConsolidado(participantes, entradas(), "P03")!;
    expect(p03.competencias[0]).toMatchObject({ puntaje: null, asistencia: "ausente", indicadoresFuertes: [] });
    expect(agregarParticipanteConsolidado(participantes, entradas(), "P09")).toBeNull();
  });
});

const lineas = (csv: string) => csv.slice(BOM.length).split("\r\n");

describe("generarCsvConsolidado", () => {
  it("una fila por participante con las competencias disponibles lado a lado, carné y nunca el nombre", () => {
    const csv = generarCsvConsolidado("manana", construir(), participantes);
    expect(csv.startsWith(BOM)).toBe(true);
    const [encabezado, p01, p02, p03, fin] = lineas(csv);
    expect(encabezado).toBe(
      "jornada,participante,carnet,adaptabilidad_puntaje,adaptabilidad_nivel,adaptabilidad_evaluaciones," +
        "pensamiento-critico_puntaje,pensamiento-critico_nivel,pensamiento-critico_evaluaciones," +
        "competencias_evaluadas,promedio_competencias,nivel_promedio",
    );
    expect(p01).toBe("Mañana,P01,100000001,3.5,Experto,1,2,Intermedio,1,2,2.75,Avanzado");
    expect(p02).toBe("Mañana,P02,,2,Intermedio,1,,,0,1,2,Intermedio");
    expect(p03).toBe("Mañana,P03,100000003,,,0,3,Avanzado,1,1,3,Avanzado");
    expect(fin).toBe("");
    expect(csv).not.toMatch(/Prueba/);
  });
});

describe("GET /api/reportes/consolidado/csv", () => {
  const DOCENTE = { rol: "docente", sid: "0123456789abcdef0123", jornada: "manana" };

  beforeEach(() => {
    sesion.getSesion.mockResolvedValue(DOCENTE);
    db.obtenerReporteConsolidado.mockResolvedValue(construir());
    dbParticipantes.obtenerTodosLosParticipantes.mockResolvedValue(participantes);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("401 sin sesión y 403 para un evaluador, sin tocar la base de datos", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    sesion.getSesion.mockResolvedValue({ rol: "evaluador", sid: "0123456789abcdef0123", jornada: "manana", integranteId: "a1" });
    const respuesta = await GET();
    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({ error: "Esta sección requiere el código docente." });
    expect(db.obtenerReporteConsolidado).not.toHaveBeenCalled();
  });

  it("descarga el CSV de la jornada de la sesión", async () => {
    sesion.getSesion.mockResolvedValue({ ...DOCENTE, jornada: "noche" });
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    expect(db.obtenerReporteConsolidado).toHaveBeenCalledWith("noche");
    expect(dbParticipantes.obtenerTodosLosParticipantes).toHaveBeenCalledWith("noche");
    expect(respuesta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(respuesta.headers.get("Content-Disposition")).toMatch(/^attachment; filename="nivela-consolidado-noche-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(await respuesta.text()).toContain("Noche,P01,100000001,");
  });

  it("500 con mensaje en español si la base de datos falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.obtenerReporteConsolidado.mockRejectedValue(new Error("caída"));
    const respuesta = await GET();
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "No se pudo generar el CSV. Intente de nuevo." });
  });
});
