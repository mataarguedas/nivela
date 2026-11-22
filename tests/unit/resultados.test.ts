import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { crearParticipante } from "@/config/participantes";
import { resultados, TEXTOS_RESULTADOS } from "@/lib/correos/resultados";
import { ultimosEnvios } from "@/lib/db/envios";
import { puntosDesdeNiveles as pts } from "@/lib/puntajes";
import { agregarReporte, type FilaReporte, type ParAusente } from "@/lib/reportes";
import {
  claveIdempotencia,
  datosResultados,
  motivoOmision,
  seleccionarDestinatarios,
  yaEnviado,
  type UltimoEnvio,
} from "@/lib/resultados";

// Personal results by email (PRD §5.14): what one participant's email
// contains (never evaluator names, individual ratings, observations or AI
// data), who receives one and who is skipped, the idempotency key, and the
// template itself. The fixture goes through agregarReporte, like production.

const competencia = obtenerCompetencia("manana", "adaptabilidad")!;
const CURSO = "AGRH 315 Psicología 2" as const;
const equipo: Equipo = {
  id: "equipo-prueba",
  numero: 4,
  jornada: "manana",
  competenciaId: "adaptabilidad",
  integrantes: [
    { id: "e1", nombre: "Evaluadora Uno Ramírez", curso: CURSO },
    { id: "e2", nombre: "Evaluador Dos Quesada", curso: CURSO },
  ],
};

function evaluacion(evaluadorId: string, participanteId: string, niveles: number[], actualizadoEn: string): FilaReporte[] {
  return niveles.map((nivel, i) => ({
    evaluadorId,
    participanteId,
    actualizadoEn,
    indicadorId: `adaptabilidad-${i + 1}`,
    nivel,
    origen: i === 0 ? "ia" : "manual",
    observacion: `Observación secreta ${evaluadorId} ${i + 1}`,
    iaNivelSugerido: i === 0 ? nivel : null,
    iaConfianza: i === 0 ? 0.87 : null,
  }));
}

// P01: e1 4,4,4,4 and e2 4,4,4,4 → Experto everywhere. P02: e1 2,3,2,1 and
// e2 3,3,2,2 → 2,5 · 3 · 2 · 1,5 → 50 · 67 · 33 · 17 puntos → general 2,25
// → 42 (Intermedio, 8 to Avanzado). P03: no evaluations, marked absent by e2.
// P04: no evaluations.
const participantes = [
  crearParticipante(1, "Ana Lucía Mora Solís", "100000001"),
  crearParticipante(2, "Bruno Chaves", "100000002"),
  crearParticipante(3, "Carla Vega", null),
  crearParticipante(4, null, null),
];
const FILAS = [
  ...evaluacion("e1", "P01", [4, 4, 4, 4], "2026-11-17T15:00:00.000Z"),
  ...evaluacion("e2", "P01", [4, 4, 4, 4], "2026-11-17T16:30:00.000Z"),
  ...evaluacion("e1", "P02", [2, 3, 2, 1], "2026-11-17T15:10:00.000Z"),
  ...evaluacion("e2", "P02", [3, 3, 2, 2], "2026-11-17T15:05:00.000Z"),
];
const AUSENCIAS: ParAusente[] = [{ evaluadorId: "e2", participanteId: "P03" }];
const reporte = agregarReporte(competencia, equipo, participantes, FILAS, AUSENCIAS);
const [p01, p02, p03, p04] = reporte.participantes;
const CONTEXTO = { competencia: "Adaptabilidad", jornada: "Mañana" };

describe("datosResultados", () => {
  it("copia solo los promedios propios del participante, con brecha y siguiente nivel", () => {
    const datos = datosResultados(p02, { ...CONTEXTO, nombre: "Bruno Chaves" })!;
    expect(datos).toMatchObject({
      nombre: "Bruno Chaves",
      competencia: "Adaptabilidad",
      jornada: "Mañana",
      puntajeGeneral: expect.closeTo(pts(2.25), 10),
      nivelGeneral: 2,
      brecha: { siguiente: 3, faltante: 8 },
      evaluaciones: 2,
    });
    expect(datos.indicadores.map((i) => [i.numero, i.media, i.nivel, i.brecha.faltante])).toEqual([
      [1, pts(2.5), 3, 25],
      [2, pts(3), 3, 8],
      [3, pts(2), 2, 17],
      [4, pts(1.5), 1, 8],
    ]);
    expect(datos.indicadores[2].descripcionSiguiente).toBe(competencia.indicadores[2].niveles[3]);
    // Nothing about evaluators, ratings, observations or AI.
    const texto = JSON.stringify(datos);
    for (const prohibido of ["Evaluadora Uno", "Evaluador Dos", "e1", "Observación secreta", "0.87", "100000002", "1-0000-0002"]) {
      expect(texto).not.toContain(prohibido);
    }
  });

  it("sin evaluaciones no hay correo", () => {
    expect(datosResultados(p03, { ...CONTEXTO, nombre: "Carla Vega" })).toBeNull();
    expect(datosResultados(p04, { ...CONTEXTO, nombre: null })).toBeNull();
  });

  it("el reporte guarda la última actualización de las evaluaciones de cada participante", () => {
    expect(p01.actualizadoEn).toBe("2026-11-17T16:30:00.000Z");
    expect(p02.actualizadoEn).toBe("2026-11-17T15:10:00.000Z");
    expect(p03.actualizadoEn).toBeNull();
  });
});

describe("destinatarios y omitidos", () => {
  it("motivo: sin evaluaciones (o ausente) antes que sin correo", () => {
    expect(motivoOmision(p02, true)).toBeNull();
    expect(motivoOmision(p02, false)).toBe("sin-correo");
    expect(motivoOmision(p03, true)).toBe("ausente");
    expect(motivoOmision(p04, false)).toBe("sin-evaluaciones");
  });

  it("separa destinatarios y omitidos con su motivo y su último envío, etiquetados por carné", () => {
    const envio: UltimoEnvio = { estado: "enviado", enviadoEn: "2026-11-17T20:00:00.000Z", enviados: 1 };
    const seleccion = seleccionarDestinatarios(reporte.participantes, new Set(["P01", "P03", "P04"]), new Map([["P01", envio]]));
    expect(seleccion.destinatarios).toEqual([{ id: "P01", etiqueta: "1-0000-0001", evaluaciones: 2, ultimoEnvio: envio }]);
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
  const actualizado = "2026-11-17T16:30:00.000Z";
  it("jornada, competencia, participante y la última evaluación; mismo envío → misma clave", () => {
    const clave = claveIdempotencia("manana", "adaptabilidad", "P01", actualizado, 0);
    expect(clave).toBe(`manana-adaptabilidad-P01-${Date.parse(actualizado)}`);
    expect(claveIdempotencia("manana", "adaptabilidad", "P01", actualizado, 0)).toBe(clave);
    // P01 of the other jornada and newer evaluations are other emails.
    expect(claveIdempotencia("noche", "adaptabilidad", "P01", actualizado, 0)).not.toBe(clave);
    expect(claveIdempotencia("manana", "adaptabilidad", "P01", "2026-11-18T09:00:00.000Z", 0)).not.toBe(clave);
  });

  it("un «Reenviar» deliberado cambia la clave; reintentar ese reenvío la repite", () => {
    const primero = claveIdempotencia("manana", "adaptabilidad", "P01", actualizado, 0);
    const reenvio = claveIdempotencia("manana", "adaptabilidad", "P01", actualizado, 1);
    expect(reenvio).toBe(`${primero}-reenvio-1`);
    expect(claveIdempotencia("manana", "adaptabilidad", "P01", actualizado, 1)).toBe(reenvio);
    expect(claveIdempotencia("manana", "adaptabilidad", "P01", actualizado, 2)).toBe(`${primero}-reenvio-2`);
  });
});

describe("plantilla de resultados", () => {
  const correo = resultados(datosResultados(p02, { ...CONTEXTO, nombre: "Bruno Chaves" })!);

  it("asunto, saludo por nombre, nivel, puntaje, evaluaciones y brecha por indicador", () => {
    expect(correo.asunto).toBe("Sus resultados de Adaptabilidad · Nivela");
    expect(correo.texto).toContain("Hola, Bruno Chaves:");
    expect(correo.texto).toContain("Estos son sus resultados en la competencia Adaptabilidad (jornada Mañana).");
    expect(correo.texto).toContain("Nivel general: Intermedio");
    expect(correo.texto).toContain("Puntaje general: 42 de 100");
    expect(correo.texto).toContain("Le faltan 8 puntos para Avanzado");
    expect(correo.texto).toContain("Recibió 2 evaluaciones de sus pares.");
    expect(correo.texto).toContain(`Indicador 1. ${competencia.indicadores[0].titulo}`);
    expect(correo.texto).toContain("Puntaje: 50 de 100 · Avanzado");
    expect(correo.texto).toContain("Puntaje: 17 de 100 · Básico");
    expect(correo.texto).toContain(`Para llegar a Avanzado: ${competencia.indicadores[2].niveles[3]}`);
    expect(correo.texto).toContain("Estos resultados son el promedio de las evaluaciones que hicieron sus pares, en una escala de 0 a 100");
    expect(correo.texto).toContain("Básico de 0 a 24, Intermedio de 25 a 49, Avanzado de 50 a 74 y Experto de 75 a 100.");
    expect(correo.html).toContain("Intermedio");
    expect(correo.html).toContain('<html lang="es-CR">');
  });

  it("nunca incluye nombres de evaluadores, calificaciones individuales, observaciones ni el carné", () => {
    for (const parte of [correo.html, correo.texto, correo.asunto]) {
      for (const prohibido of ["Evaluadora Uno", "Evaluador Dos", "Observación secreta", "100000002", "1-0000-0002", "IA"]) {
        expect(parte).not.toContain(prohibido);
      }
    }
  });

  it("la fuente queda dentro del atributo style (una comilla doble lo cortaría)", () => {
    expect(correo.html).toContain("font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto");
    expect(correo.html).not.toContain('"Segoe UI"');
  });

  it("Experto: «Nivel máximo alcanzado», sin «Para llegar a»", () => {
    const experto = resultados(datosResultados(p01, { ...CONTEXTO, nombre: "Ana Lucía Mora Solís" })!);
    expect(experto.texto).toContain("Nivel general: Experto");
    expect(experto.texto).toContain("Nivel máximo alcanzado");
    expect(experto.texto).not.toContain("Le faltan");
    expect(experto.texto).not.toContain("Para llegar a");
    expect(experto.texto).toContain("Hola, Ana Lucía Mora Solís:");
  });

  it("sin nombre saluda sin él; la prueba lo dice en el asunto; escapa el HTML", () => {
    const sinNombre = resultados(datosResultados(p02, { ...CONTEXTO, nombre: null })!);
    expect(sinNombre.texto).toContain("Hola:");
    expect(resultados(datosResultados(p02, { ...CONTEXTO, nombre: null })!, { prueba: true }).asunto).toBe(
      TEXTOS_RESULTADOS.asuntoPrueba("Adaptabilidad"),
    );
    const raro = resultados(datosResultados(p02, { ...CONTEXTO, nombre: "<b>Bruno</b>" })!);
    expect(raro.html).not.toContain("<b>Bruno</b>");
    expect(raro.html).toContain("&lt;b&gt;Bruno&lt;/b&gt;");
  });
});
