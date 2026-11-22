import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { crearParticipante, generarParticipantes, type Participante } from "@/config/participantes";
import { puntosDesdeNiveles as pts } from "@/lib/puntajes";
import { agregarReporte, type FilaReporte } from "@/lib/reportes";

// agregarReporte against a small hand-computed fixture: 3 evaluators × 3
// participants on the real Adaptabilidad indicators. P01 is rated by all 3,
// P02 by 2, P03 by none. Expected values are worked out in the comments as
// means of levels (1–4); the report shows them in points, pts(m) = (m − 1) ÷ 3 × 100.

const competencia = obtenerCompetencia("manana", "adaptabilidad")!;

const equipo: Equipo = {
  id: "equipo-prueba",
  numero: 9,
  jornada: "manana",
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "e1", nombre: "Ana Núñez", curso: "AGRH 315 Psicología 2" },
    { id: "e2", nombre: "Bea Solís", curso: "AGRH 613 Seminario Integrado de RRHH" },
    { id: "e3", nombre: "Carlos Peña", curso: "AGRH 613 Seminario Integrado de RRHH" },
  ],
};

// P02 has a name and a carnet (set by the admin); P03 only a name. Reports
// label participants by carnet, never by name (PRD §11).
const participantes: Participante[] = [
  crearParticipante(1, null),
  crearParticipante(2, "Ana Pérez", "100000002"),
  crearParticipante(3, "Carla Mora", null),
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
  // General (3,667 + 3,667 + 4 + 4) / 4 = 3,83 → 94 puntos → Experto.
  ...evaluacion("e1", "P01", [4, 4, 4, 4], { 1: { origen: "ia" }, 2: { observacion: "   " } }),
  ...evaluacion("e2", "P01", [4, 3, 4, 4], { 2: { observacion: "Ajustó su método al nuevo procedimiento." } }),
  ...evaluacion("e3", "P01", [3, 4, 4, 4], { 2: { observacion: "Respondió con rapidez." } }),
  // P02. Ind1 1,3 → 2 (SD 1 media) · Ind2 2,2 → 2 (alta) · Ind3 3,1 → 2 (media)
  // Ind4 1,4 → 2,5 (SD 1,5 baja). General (2 + 2 + 2 + 2,5) / 4 = 2,125 → 37,5 → 38 puntos → Intermedio.
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
    expect(reporte.kpis.puntajePromedio).toBeCloseTo(pts((23 / 6 + 2.125) / 2), 10);
    // 2 "ia" levels out of the 20 valid ones; ignored rows don't count.
    expect(reporte.kpis.proporcionIa).toBe(0.1);
  });

  it("por participante: medias por indicador, puntaje y nivel general, evaluaciones y % IA", () => {
    expect(p01.evaluaciones).toBe(3);
    expect(p01.indicadores.map((i) => i.media)).toEqual([11 / 3, 11 / 3, 4, 4].map(pts));
    expect(p01.puntajeGeneral).toBeCloseTo(pts(23 / 6), 10);
    expect(p01.nivelGeneral).toBe(4);
    expect(p01.proporcionIa).toBe(1 / 12);

    expect(p02.evaluaciones).toBe(2);
    expect(p02.indicadores.map((i) => i.media)).toEqual([2, 2, 2, 2.5].map(pts));
    expect(p02.puntajeGeneral).toBeCloseTo(pts(2.125), 10);
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
      { evaluadorId: "e1", nombre: "Ana Núñez", celdas: ["enviada", "enviada", "pendiente"], total: 2, esperadas: 3 },
      { evaluadorId: "e2", nombre: "Bea Solís", celdas: ["enviada", "enviada", "pendiente"], total: 2, esperadas: 3 },
      { evaluadorId: "e3", nombre: "Carlos Peña", celdas: ["enviada", "pendiente", "pendiente"], total: 1, esperadas: 3 },
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

  it("puntajes más altos: con menos de 5 evaluados aparecen todos, con medias y evaluaciones", () => {
    expect(reporte.mejores).toEqual([
      {
        id: "P01",
        etiqueta: "Participante 01",
        puntaje: reporte.ranking[0].puntaje,
        nivel: 4,
        posicion: 1,
        evaluaciones: 3,
        medias: p01.indicadores.map((i) => i.media),
      },
      // The admin's carnet reaches the report as the label, not the name.
      expect.objectContaining({ id: "P02", etiqueta: "1-0000-0002", posicion: 2, nivel: 2, evaluaciones: 2, medias: [2, 2, 2, 2.5].map(pts) }),
    ]);
  });

  it("los reportes identifican por carné (o «Participante NN») y nunca incluyen nombres", () => {
    expect(reporte.participantes.map((p) => p.etiqueta)).toEqual(["Participante 01", "1-0000-0002", "Participante 03"]);
    expect(reporte.cobertura.participantes.map((p) => p.etiqueta)).toEqual(["Participante 01", "1-0000-0002", "Participante 03"]);
    const texto = JSON.stringify(reporte);
    expect(texto).not.toContain("Ana Pérez");
    expect(texto).not.toContain("Carla Mora");
  });

  it("puntajes más altos: los empates comparten posición y los empatados en el corte se incluyen", () => {
    const siete = generarParticipantes(7);
    const empates = agregarReporte(competencia, equipo, siete, [
      ...evaluacion("e1", "P01", [4, 4, 4, 4]), // 100
      ...evaluacion("e1", "P02", [4, 4, 3, 3]), // 83
      ...evaluacion("e1", "P03", [3, 3, 4, 4]), // 83
      ...evaluacion("e1", "P04", [3, 3, 3, 3]), // 67
      ...evaluacion("e1", "P05", [3, 3, 2, 2]), // 50 (5th place, tied)
      ...evaluacion("e1", "P06", [2, 2, 3, 3]), // 50 (5th place, tied)
      ...evaluacion("e1", "P07", [1, 1, 1, 1]), // 0, would be 7th
    ]);
    expect(empates.mejores.map((d) => [d.id, d.posicion])).toEqual([
      ["P01", 1],
      ["P02", 2],
      ["P03", 2],
      ["P04", 4],
      ["P05", 5],
      ["P06", 5],
    ]);
  });

  it("puntajes más altos: el corte es estricto cuando no hay empate en el quinto lugar", () => {
    const seis = generarParticipantes(6);
    const filas = seis.flatMap((p, i) => evaluacion("e1", p.id, [4 - (i % 4), 4 - (i % 4), 4 - Math.floor(i / 4), 4]));
    const resultado = agregarReporte(competencia, equipo, seis, filas);
    expect(resultado.mejores).toHaveLength(5);
    expect(resultado.mejores.map((d) => d.posicion)).toEqual([1, 2, 3, 4, 5]);
    expect(resultado.mejores.map((d) => d.id)).toEqual(resultado.ranking.slice(0, 5).map((r) => r.id));
  });

  it("sin filas: estado vacío", () => {
    const vacio = agregarReporte(competencia, equipo, participantes, []);
    expect(vacio.vacio).toBe(true);
    expect(vacio.ranking).toEqual([]);
    expect(vacio.mejores).toEqual([]);
    expect(vacio.kpis).toEqual({
      participantesEvaluados: 0,
      participantesTotal: 3,
      recibidas: 0,
      esperadas: 9,
      cobertura: 0,
      puntajePromedio: null,
      proporcionIa: null,
      ausentes: 0,
      evaluadoresCompletos: 0,
      evaluadoresTotal: 3,
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

describe("agregarReporte con asistencia (PRD §5.13)", () => {
  // e1 and e3 mark P03 absent (it has no valid evaluations) → Ausente.
  // e3 marks P02 absent while e1 and e2 sent it → Asistencia en conflicto.
  // e1 marks P01 absent although e1 sent P01 (a race): the evaluation wins in
  // the grid and the denominator, but the mark still shows as a conflict.
  // Marks by someone outside the team, for a participant outside the list,
  // and a duplicate are ignored.
  const AUSENCIAS = [
    { evaluadorId: "e1", participanteId: "P03" },
    { evaluadorId: "e3", participanteId: "P03" },
    { evaluadorId: "e3", participanteId: "P03" },
    { evaluadorId: "e3", participanteId: "P02" },
    { evaluadorId: "e1", participanteId: "P01" },
    { evaluadorId: "intruso", participanteId: "P01" },
    { evaluadorId: "e2", participanteId: "P99" },
  ];
  const reporte = agregarReporte(competencia, equipo, participantes, FILAS, AUSENCIAS);
  const [p01, p02, p03] = reporte.participantes;

  it("asistencia por participante: ausente, en conflicto, con las marcas contadas una vez", () => {
    expect(p03).toMatchObject({ asistencia: "ausente", marcasAusente: 2, evaluaciones: 0 });
    expect(p02).toMatchObject({ asistencia: "conflicto", marcasAusente: 1, evaluaciones: 2 });
    expect(p01).toMatchObject({ asistencia: "conflicto", marcasAusente: 1, evaluaciones: 3 });
  });

  it("KPIs: los pares ausentes sin evaluación salen de las esperadas; Ausentes cuenta solo a P03", () => {
    // 3 × 3 = 9 esperadas − 3 pares ausentes (e1·P03, e3·P03, e3·P02) = 6.
    expect(reporte.kpis).toMatchObject({ recibidas: 5, esperadas: 6, ausentes: 1 });
    expect(reporte.kpis.cobertura).toBeCloseTo(5 / 6, 10);
    // Scores are unaffected by attendance.
    expect(p01.puntajeGeneral).toBeCloseTo(pts(23 / 6), 10);
  });

  it("matriz de cobertura con Ausente y las esperadas de cada evaluador", () => {
    expect(reporte.cobertura.filas).toEqual([
      { evaluadorId: "e1", nombre: "Ana Núñez", celdas: ["enviada", "enviada", "ausente"], total: 2, esperadas: 2 },
      { evaluadorId: "e2", nombre: "Bea Solís", celdas: ["enviada", "enviada", "pendiente"], total: 2, esperadas: 3 },
      { evaluadorId: "e3", nombre: "Carlos Peña", celdas: ["enviada", "ausente", "ausente"], total: 1, esperadas: 1 },
    ]);
  });

  it("el denominador sale del tamaño del equipo de la jornada, no de una constante", () => {
    const noche: Equipo = { ...equipo, id: "equipo-noche", jornada: "noche", numero: 1, integrantes: equipo.integrantes.slice(0, 2) };
    const deNoche = agregarReporte(competencia, noche, participantes, FILAS, AUSENCIAS);
    // 2 × 3 = 6 − 1 par ausente (e1·P03; e3 isn't on this team) = 5. e3's rows are ignored too.
    expect(deNoche.kpis).toMatchObject({ recibidas: 4, esperadas: 5, ausentes: 1 });
    expect(deNoche.participantes[2]).toMatchObject({ asistencia: "ausente", marcasAusente: 1 });
    expect(deNoche.participantes[1]).toMatchObject({ asistencia: null, marcasAusente: 0 });
  });

  it("sin marcas nada cambia: asistencia null y esperadas = evaluadores × participantes", () => {
    const sin = agregarReporte(competencia, equipo, participantes, FILAS);
    expect(sin.participantes.every((p) => p.asistencia === null && p.marcasAusente === 0)).toBe(true);
    expect(sin.kpis).toMatchObject({ esperadas: 9, ausentes: 0 });
  });
});

describe("agregarReporte: brecha al siguiente nivel (PRD §7, §11.1)", () => {
  const reporte = agregarReporte(competencia, equipo, participantes, FILAS);
  const [p01, p02, p03] = reporte.participantes;

  it("puntaje general: Experto no tiene siguiente; Intermedio 38 → faltan 13 para Avanzado", () => {
    // P01 23/6 = 3,83 → 94 puntos → Experto.
    expect(p01.brecha).toEqual({ nivelActual: 4, siguiente: null, umbral: null, faltante: null });
    // P02 2,125 → 37,5 se muestra 38 → 51 − 38 = 13.
    expect(p02.brecha).toEqual({ nivelActual: 2, siguiente: 3, umbral: 51, faltante: 13 });
    expect(p03.brecha).toBeNull();
  });

  it("por indicador, con la descripción del siguiente nivel tomada de la rúbrica", () => {
    const [ind1, , , ind4] = p02.indicadores;
    // Ind1 1,3 → 2,00 → 33 puntos, Intermedio: faltan 18 para Avanzado.
    expect(ind1.brecha).toMatchObject({ nivelActual: 2, siguiente: 3, faltante: 18 });
    expect(ind1.descripcionSiguiente).toBe(competencia.indicadores[0].niveles[3]);
    // Ind4 1,4 → 2,50 → 50 puntos, still Intermedio (v1.10): falta 1 para Avanzado.
    expect(ind4.brecha).toMatchObject({ nivelActual: 2, siguiente: 3, faltante: 1 });
    expect(ind4.descripcionSiguiente).toBe(competencia.indicadores[3].niveles[3]);
    // P01 Ind3 = 4: nada que alcanzar.
    expect(p01.indicadores[2]).toMatchObject({ brecha: { siguiente: null }, descripcionSiguiente: null });
    // Sin calificaciones, sin brecha.
    expect(p03.indicadores.every((i) => i.brecha === null && i.descripcionSiguiente === null)).toBe(true);
  });
});

describe("agregarReporte: avance de evaluadores (PRD §11.2)", () => {
  it("mañana: sin cuenta, en progreso y completo con ausentes; los incompletos primero", () => {
    const conE4: Equipo = {
      ...equipo,
      integrantes: [...equipo.integrantes, { id: "e4", nombre: "Dina Mora", curso: "AGRH 315 Psicología 2" }],
    };
    const reporte = agregarReporte(
      competencia,
      conE4,
      participantes,
      FILAS,
      // e1 sent P01 and P02 and marked P03 absent: 2 of 2, complete.
      [{ evaluadorId: "e1", participanteId: "P03" }],
      {
        e1: { estado: "activa", ultimoAcceso: "2026-11-17T14:05:00.000Z", activadaEn: "2026-11-10T13:00:00.000Z" },
        // e2's access was reset: the old activation date no longer shows.
        e2: { estado: "pendiente", ultimoAcceso: null, activadaEn: "2026-11-09T13:00:00.000Z" },
        e3: { estado: "activa", ultimoAcceso: "2026-11-16T20:00:00.000Z" },
        // e4 has no account row: "Sin correo".
      },
    );
    const ENVIADO = "2026-10-25T18:00:00.000Z"; // every fixture row's actualizadoEn
    expect(reporte.avance).toEqual({
      numeroEquipo: 9,
      completos: 1,
      total: 4,
      evaluadores: [
        { evaluadorId: "e4", nombre: "Dina Mora", curso: "AGRH 315 Psicología 2", cuenta: "sin-correo", ultimoAcceso: null, activadaEn: null, ultimoEnvio: null, enviadas: 0, esperadas: 3, ausentes: 0, estado: "sin-iniciar" },
        { evaluadorId: "e2", nombre: "Bea Solís", curso: "AGRH 613 Seminario Integrado de RRHH", cuenta: "pendiente", ultimoAcceso: null, activadaEn: null, ultimoEnvio: ENVIADO, enviadas: 2, esperadas: 3, ausentes: 0, estado: "en-progreso" },
        { evaluadorId: "e3", nombre: "Carlos Peña", curso: "AGRH 613 Seminario Integrado de RRHH", cuenta: "activa", ultimoAcceso: "2026-11-16T20:00:00.000Z", activadaEn: null, ultimoEnvio: ENVIADO, enviadas: 1, esperadas: 3, ausentes: 0, estado: "en-progreso" },
        { evaluadorId: "e1", nombre: "Ana Núñez", curso: "AGRH 315 Psicología 2", cuenta: "activa", ultimoAcceso: "2026-11-17T14:05:00.000Z", activadaEn: "2026-11-10T13:00:00.000Z", ultimoEnvio: ENVIADO, enviadas: 2, esperadas: 2, ausentes: 1, estado: "completo" },
      ],
    });
    expect(reporte.kpis).toMatchObject({ evaluadoresCompletos: 1, evaluadoresTotal: 4 });
  });

  it("noche: otro número y otro tamaño de equipo, tomados del equipo y no de una constante", () => {
    const competenciaNoche = obtenerCompetencia("noche", "adaptabilidad")!;
    const ids = competenciaNoche.indicadores.map((i) => i.id);
    const enviar = (evaluadorId: string, participanteId: string): FilaReporte[] =>
      ids.map((indicadorId) => ({
        evaluadorId,
        participanteId,
        actualizadoEn: "2026-11-17T20:00:00.000Z",
        indicadorId,
        nivel: 3,
        origen: "manual",
        observacion: null,
        iaNivelSugerido: null,
        iaConfianza: null,
      }));
    const equipoNoche: Equipo = {
      id: "equipo-noche-prueba",
      numero: 1,
      jornada: "noche",
      competenciaId: "adaptabilidad",
      integrantes: [
        { id: "n1", nombre: "Elena Rojas", curso: "AGRH 315 Psicología 2" },
        { id: "n2", nombre: "Fabio Ruiz", curso: "AGRH 613 Seminario Integrado de RRHH" },
      ],
    };
    // Same P01/P02 ids as the morning, but this is a separate cohort and a separate aggregation.
    const reporte = agregarReporte(competenciaNoche, equipoNoche, generarParticipantes(2), [...enviar("n1", "P01"), ...enviar("n1", "P02")], [], {
      n1: { estado: "activa", ultimoAcceso: null },
    });
    expect(reporte.avance.numeroEquipo).toBe(1);
    expect(reporte.avance.total).toBe(2);
    expect(reporte.avance.completos).toBe(1);
    expect(reporte.avance.evaluadores.map((a) => [a.evaluadorId, a.cuenta, a.estado, a.enviadas, a.esperadas])).toEqual([
      ["n2", "sin-correo", "sin-iniciar", 0, 2],
      ["n1", "activa", "completo", 2, 2],
    ]);
    // 3,00 → 67 puntos, Avanzado → faltan 9 para Experto, with the night rubric's description.
    expect(reporte.participantes[0].brecha).toMatchObject({ nivelActual: 3, siguiente: 4, faltante: 9 });
    expect(reporte.participantes[0].indicadores[0].descripcionSiguiente).toBe(competenciaNoche.indicadores[0].niveles[4]);
  });

  it("un evaluador con todos sus participantes ausentes queda Completo", () => {
    const reporte = agregarReporte(competencia, equipo, participantes, [], [
      { evaluadorId: "e3", participanteId: "P01" },
      { evaluadorId: "e3", participanteId: "P02" },
      { evaluadorId: "e3", participanteId: "P03" },
    ]);
    const e3 = reporte.avance.evaluadores.find((a) => a.evaluadorId === "e3")!;
    expect(e3).toMatchObject({ enviadas: 0, esperadas: 0, ausentes: 3, estado: "completo" });
  });
});
