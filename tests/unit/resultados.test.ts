import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { crearParticipante } from "@/config/participantes";
import { resultados, TEXTOS_RESULTADOS } from "@/lib/correos/resultados";
import { ultimosEnvios } from "@/lib/db/envios";
import { puntosDesdeNiveles as pts } from "@/lib/puntajes";
import { agregarConsolidado, agregarReporte, type EntradaConsolidado, type FilaReporte } from "@/lib/reportes";
import {
  claveIdempotencia,
  datosResultados,
  evaluacionesRecibidas,
  motivoOmision,
  seleccionarDestinatarios,
  ultimaEvaluacion,
  yaEnviado,
  type UltimoEnvio,
} from "@/lib/resultados";

// Personal results by email (PRD §5.14, v1.13): one general report per
// participant with every competencia of the jornada and the overall result.
// What the email contains (never evaluator names, individual ratings,
// observations or AI data), who receives one and who is skipped, the
// idempotency key, and the template itself. The fixture goes through
// agregarReporte / agregarConsolidado, like production.
//
// Adaptabilidad (e1, e2): P01 e1 4,4,4,4 and e2 4,4,4,4 → 100 Experto.
//   P02 e1 2,3,2,1 and e2 3,3,2,2 → 2,5 · 3 · 2 · 1,5 → 50 · 67 · 33 · 17
//   → general 2,25 → 42 (Intermedio, 9 to Avanzado). P03 marked absent by e2.
// Pensamiento crítico (p1): P01 3,3,3,3 → 67 Avanzado. Nobody else.
// Orientación al detalle: no rubric in the fixture (reporte null).
// Promedio entre competencias: P01 (100 + 67) / 2 = 83 Experto (2 of 2),
//   P02 42 Intermedio (1 of 2). P03 and P04: none.

const CURSO = "AGRH 315 Psicología 2" as const;
const adaptabilidad = obtenerCompetencia("manana", "adaptabilidad")!;
const pensamiento = obtenerCompetencia("manana", "pensamiento-critico")!;
const equipoA: Equipo = {
  id: "equipo-a",
  numero: 4,
  jornada: "manana",
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "e1", nombre: "Evaluadora Uno Ramírez", curso: CURSO },
    { id: "e2", nombre: "Evaluador Dos Quesada", curso: CURSO },
  ],
};
const equipoP: Equipo = {
  id: "equipo-p",
  numero: 1,
  jornada: "manana",
  competenciaId: "pensamiento-critico",
  integrantes: [{ id: "p1", nombre: "Evaluador Tres Peña", curso: CURSO }],
};

function evaluacion(prefijo: string, evaluadorId: string, participanteId: string, niveles: number[], actualizadoEn: string): FilaReporte[] {
  return niveles.map((nivel, i) => ({
    evaluadorId,
    participanteId,
    actualizadoEn,
    indicadorId: `${prefijo}-${i + 1}`,
    nivel,
    origen: i === 0 ? "ia" : "manual",
    observacion: `Observación secreta ${evaluadorId} ${i + 1}`,
    iaNivelSugerido: i === 0 ? nivel : null,
    iaConfianza: i === 0 ? 0.87 : null,
  }));
}

const participantes = [
  crearParticipante(1, "Ana Lucía Mora Solís", "100000001"),
  crearParticipante(2, "Bruno Chaves", "100000002"),
  crearParticipante(3, "Carla Vega", null),
  crearParticipante(4, null, null),
];
const ENTRADAS: EntradaConsolidado[] = [
  {
    id: "adaptabilidad",
    nombre: adaptabilidad.nombre,
    reporte: agregarReporte(
      adaptabilidad,
      equipoA,
      participantes,
      [
        ...evaluacion("adaptabilidad", "e1", "P01", [4, 4, 4, 4], "2026-11-17T15:00:00.000Z"),
        ...evaluacion("adaptabilidad", "e2", "P01", [4, 4, 4, 4], "2026-11-17T16:30:00.000Z"),
        ...evaluacion("adaptabilidad", "e1", "P02", [2, 3, 2, 1], "2026-11-17T15:10:00.000Z"),
        ...evaluacion("adaptabilidad", "e2", "P02", [3, 3, 2, 2], "2026-11-17T15:05:00.000Z"),
      ],
      [{ evaluadorId: "e2", participanteId: "P03" }],
    ),
  },
  {
    id: "pensamiento-critico",
    nombre: pensamiento.nombre,
    reporte: agregarReporte(pensamiento, equipoP, participantes, [
      ...evaluacion("pensamiento-critico", "p1", "P01", [3, 3, 3, 3], "2026-11-18T09:00:00.000Z"),
    ]),
  },
  { id: "orientacion-detalle", nombre: "Orientación al detalle", reporte: null },
];
const consolidado = agregarConsolidado(participantes, ENTRADAS);
const [c01, c02, c03, c04] = consolidado.participantes;
const JORNADA = { jornada: "Mañana" };
const PROHIBIDOS = ["Evaluadora Uno", "Evaluador Dos", "Evaluador Tres", "Observación secreta", "100000002", "1-0000-0002", "0.87"];

describe("datosResultados", () => {
  it("el resultado general y cada competencia con plantilla, solo con los promedios propios del participante", () => {
    const datos = datosResultados(ENTRADAS, "P02", { ...JORNADA, nombre: "Bruno Chaves" })!;
    expect(datos).toMatchObject({
      nombre: "Bruno Chaves",
      jornada: "Mañana",
      promedio: expect.closeTo(pts(2.25), 10),
      nivel: 2,
      brecha: { siguiente: 3, faltante: 9 },
      competenciasEvaluadas: 1,
      competenciasDisponibles: 2,
      evaluaciones: 2,
    });
    // Orientación al detalle has no rubric here: not in the email. Pensamiento crítico has none of P02's evaluations.
    expect(datos.competencias.map((c) => [c.id, c.resultado === null])).toEqual([
      ["adaptabilidad", false],
      ["pensamiento-critico", true],
    ]);
    const adapt = datos.competencias[0].resultado!;
    expect(adapt).toMatchObject({ puntaje: expect.closeTo(pts(2.25), 10), nivel: 2, evaluaciones: 2 });
    expect(adapt.indicadores.map((i) => [i.numero, i.media, i.nivel, i.brecha.faltante])).toEqual([
      // 50 is Intermedio since v1.10 (Avanzado opens at 51).
      [1, pts(2.5), 2, 1],
      [2, pts(3), 3, 9],
      [3, pts(2), 2, 18],
      [4, pts(1.5), 1, 9],
    ]);
    expect(adapt.indicadores[2].descripcionSiguiente).toBe(adaptabilidad.indicadores[2].niveles[3]);
    // Nothing about evaluators, ratings, observations, AI or the carnet.
    const texto = JSON.stringify(datos);
    for (const prohibido of [...PROHIBIDOS, '"e1"', '"p1"']) expect(texto).not.toContain(prohibido);
  });

  it("el promedio entre competencias coincide con el del Reporte consolidado", () => {
    const datos = datosResultados(ENTRADAS, "P01", { ...JORNADA, nombre: null })!;
    expect(datos.promedio).toBeCloseTo(c01.promedio!, 10);
    expect(datos).toMatchObject({ nivel: 4, competenciasEvaluadas: 2, competenciasDisponibles: 2, evaluaciones: 3 });
    expect(datos.competencias[1].resultado).toMatchObject({ puntaje: expect.closeTo(pts(3), 10), nivel: 3, evaluaciones: 1 });
  });

  it("sin evaluaciones en ninguna competencia (o desconocido) no hay correo", () => {
    expect(datosResultados(ENTRADAS, "P03", { ...JORNADA, nombre: "Carla Vega" })).toBeNull();
    expect(datosResultados(ENTRADAS, "P04", { ...JORNADA, nombre: null })).toBeNull();
    expect(datosResultados(ENTRADAS, "P77", { ...JORNADA, nombre: null })).toBeNull();
  });

  it("ultimaEvaluacion: la más reciente en cualquier competencia", () => {
    expect(ultimaEvaluacion(ENTRADAS, "P01")).toBe("2026-11-18T09:00:00.000Z");
    expect(ultimaEvaluacion(ENTRADAS, "P02")).toBe("2026-11-17T15:10:00.000Z");
    expect(ultimaEvaluacion(ENTRADAS, "P03")).toBeNull();
  });
});

describe("destinatarios y omitidos", () => {
  it("evaluaciones sumadas entre competencias", () => {
    expect([c01, c02, c03, c04].map(evaluacionesRecibidas)).toEqual([3, 2, 0, 0]);
  });

  it("motivo: sin evaluaciones (o ausente) antes que sin correo", () => {
    expect(motivoOmision(c02, true)).toBeNull();
    expect(motivoOmision(c02, false)).toBe("sin-correo");
    expect(motivoOmision(c03, true)).toBe("ausente");
    expect(motivoOmision(c04, false)).toBe("sin-evaluaciones");
  });

  it("separa destinatarios y omitidos con su motivo, competencias evaluadas y último envío, etiquetados por carné", () => {
    const envio: UltimoEnvio = { estado: "enviado", enviadoEn: "2026-11-18T20:00:00.000Z", enviados: 1 };
    const seleccion = seleccionarDestinatarios(consolidado.participantes, new Set(["P01", "P03", "P04"]), new Map([["P01", envio]]));
    expect(seleccion.destinatarios).toEqual([
      { id: "P01", etiqueta: "1-0000-0001", evaluaciones: 3, competenciasEvaluadas: 2, ultimoEnvio: envio },
    ]);
    expect(seleccion.omitidos.map((o) => [o.id, o.etiqueta, o.motivo])).toEqual([
      ["P02", "1-0000-0002", "sin-correo"],
      ["P03", "Participante 03", "ausente"],
      ["P04", "Participante 04", "sin-evaluaciones"],
    ]);
    expect(JSON.stringify(seleccion)).not.toMatch(/Ana|Bruno|Carla/);
  });

  it("ya enviado solo si el último intento salió bien: tras un error se reintenta solo", () => {
    expect(yaEnviado(null)).toBe(false);
    expect(yaEnviado({ estado: "enviado", enviadoEn: "x", enviados: 1 })).toBe(true);
    expect(yaEnviado({ estado: "error", enviadoEn: "x", enviados: 1 })).toBe(false);
  });

  it("ultimosEnvios: el último intento por participante y cuántos salieron bien", () => {
    const t = (h: number) => new Date(Date.UTC(2026, 10, 17, h));
    const ultimos = ultimosEnvios([
      { participanteId: "P01", estado: "error", enviadoEn: t(10) },
      { participanteId: "P01", estado: "enviado", enviadoEn: t(11) },
      { participanteId: "P02", estado: "enviado", enviadoEn: t(11) },
      { participanteId: "P02", estado: "error", enviadoEn: t(12) },
    ]);
    expect(ultimos.get("P01")).toEqual({ estado: "enviado", enviadoEn: t(11).toISOString(), enviados: 1 });
    expect(ultimos.get("P02")).toEqual({ estado: "error", enviadoEn: t(12).toISOString(), enviados: 1 });
    expect(ultimos.has("P03")).toBe(false);
  });
});

describe("claveIdempotencia", () => {
  const actualizado = "2026-11-18T09:00:00.000Z";
  it("jornada, participante y la última evaluación en cualquier competencia; mismo envío → misma clave", () => {
    const clave = claveIdempotencia("manana", "P01", actualizado, 0);
    expect(clave).toBe(`manana-consolidado-P01-${Date.parse(actualizado)}`);
    expect(claveIdempotencia("manana", "P01", actualizado, 0)).toBe(clave);
    // P01 of the other jornada and newer evaluations are other emails.
    expect(claveIdempotencia("noche", "P01", actualizado, 0)).not.toBe(clave);
    expect(claveIdempotencia("manana", "P01", "2026-11-19T09:00:00.000Z", 0)).not.toBe(clave);
  });

  it("un «Reenviar» deliberado cambia la clave; reintentar ese reenvío la repite", () => {
    const primero = claveIdempotencia("manana", "P01", actualizado, 0);
    const reenvio = claveIdempotencia("manana", "P01", actualizado, 1);
    expect(reenvio).toBe(`${primero}-reenvio-1`);
    expect(claveIdempotencia("manana", "P01", actualizado, 1)).toBe(reenvio);
    expect(claveIdempotencia("manana", "P01", actualizado, 2)).toBe(`${primero}-reenvio-2`);
  });
});

describe("plantilla del reporte general", () => {
  const correo = resultados(datosResultados(ENTRADAS, "P02", { ...JORNADA, nombre: "Bruno Chaves" })!);

  it("asunto, saludo, resultado general, resumen por competencia y el detalle de las evaluadas", () => {
    expect(correo.asunto).toBe("Su reporte general de competencias · Nivela");
    expect(correo.texto).toContain("Hola, Bruno Chaves:");
    expect(correo.texto).toContain("Estos son sus resultados en las competencias que evaluaron sus pares (jornada Mañana).");
    expect(correo.texto).toContain("Resultado general: Intermedio");
    expect(correo.texto).toContain("Promedio entre competencias: 42 de 100");
    expect(correo.texto).toContain("Le faltan 9 puntos para Avanzado");
    expect(correo.texto).toContain("Con evaluaciones en 1 de 2 competencias.");
    expect(correo.texto).toContain("Recibió 2 evaluaciones de sus pares en total.");
    expect(correo.texto).toContain("- Adaptabilidad: 42 de 100 · Intermedio");
    expect(correo.texto).toContain(`- ${pensamiento.nombre}: Sin evaluaciones`);
    expect(correo.texto).toContain("Puntaje general: 42 de 100 · Intermedio");
    expect(correo.texto).toContain("Recibió 2 evaluaciones en esta competencia.");
    expect(correo.texto).toContain(`Indicador 1. ${adaptabilidad.indicadores[0].titulo}`);
    expect(correo.texto).toContain("Puntaje: 50 de 100 · Intermedio");
    expect(correo.texto).toContain("Puntaje: 17 de 100 · Básico");
    expect(correo.texto).toContain(`Para llegar a Avanzado: ${adaptabilidad.indicadores[2].niveles[3]}`);
    // No detail for a competencia without evaluations, and none for one without a rubric.
    expect(correo.texto).not.toContain(pensamiento.indicadores[0].titulo);
    expect(correo.texto).not.toContain("Orientación al detalle");
    expect(correo.texto).toContain("Estos resultados son el promedio de las evaluaciones que hicieron sus pares, en una escala de 0 a 100");
    expect(correo.texto).toContain("Básico de 0 a 25, Intermedio de 26 a 50, Avanzado de 51 a 75 y Experto de 76 a 100.");
    expect(correo.texto).toContain(TEXTOS_RESULTADOS.cierreGeneral);
    expect(correo.html).toContain("Resumen por competencia");
    expect(correo.html).toContain('<html lang="es-CR">');
  });

  it("varias competencias: el detalle de cada una, en el orden de la configuración", () => {
    const ambos = resultados(datosResultados(ENTRADAS, "P01", { ...JORNADA, nombre: "Ana Lucía Mora Solís" })!);
    expect(ambos.texto).toContain("Resultado general: Experto");
    expect(ambos.texto).toContain("Con evaluaciones en 2 de 2 competencias.");
    expect(ambos.texto).toContain("Recibió 3 evaluaciones de sus pares en total.");
    expect(ambos.texto).toContain("Recibió 1 evaluación en esta competencia.");
    expect(ambos.texto).toContain(`Para llegar a Experto: ${pensamiento.indicadores[0].niveles[4]}`);
    expect(ambos.texto.indexOf("ADAPTABILIDAD")).toBeLessThan(ambos.texto.indexOf(pensamiento.nombre.toUpperCase()));
    expect(ambos.html).toContain(`>${pensamiento.nombre}</h3>`);
  });

  it("nunca incluye nombres de evaluadores, calificaciones individuales, observaciones, datos de IA ni el carné", () => {
    for (const parte of [correo.html, correo.texto, correo.asunto]) {
      for (const prohibido of PROHIBIDOS) expect(parte).not.toContain(prohibido);
    }
  });

  it("no usa bordes ni sombras (DESIGN.md): los bloques se separan con fondo", () => {
    expect(correo.html).not.toMatch(/border-(bottom|top)|box-shadow/);
  });

  it("la fuente queda dentro del atributo style (una comilla doble lo cortaría)", () => {
    expect(correo.html).toContain("font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto");
    expect(correo.html).not.toContain('"Segoe UI"');
  });

  it("Experto en una competencia: «Nivel máximo alcanzado», sin «Para llegar a» en ella", () => {
    const soloExperto = resultados(datosResultados(ENTRADAS.slice(0, 1), "P01", { ...JORNADA, nombre: "Ana" })!);
    expect(soloExperto.texto).toContain("Resultado general: Experto");
    expect(soloExperto.texto).toContain("Nivel máximo alcanzado");
    expect(soloExperto.texto).not.toContain("Le faltan");
    expect(soloExperto.texto).not.toContain("Para llegar a");
    expect(soloExperto.texto).toContain("Con evaluaciones en 1 de 1 competencia.");
  });

  it("sin nombre saluda sin él; la prueba lo dice en el asunto; escapa el HTML", () => {
    const sinNombre = resultados(datosResultados(ENTRADAS, "P02", { ...JORNADA, nombre: null })!);
    expect(sinNombre.texto).toContain("Hola:");
    expect(resultados(datosResultados(ENTRADAS, "P02", { ...JORNADA, nombre: null })!, { prueba: true }).asunto).toBe(
      TEXTOS_RESULTADOS.asuntoPrueba,
    );
    const raro = resultados(datosResultados(ENTRADAS, "P02", { ...JORNADA, nombre: "<b>Bruno</b>" })!);
    expect(raro.html).not.toContain("<b>Bruno</b>");
    expect(raro.html).toContain("&lt;b&gt;Bruno&lt;/b&gt;");
  });
});
