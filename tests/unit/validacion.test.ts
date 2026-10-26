import { describe, expect, it } from "vitest";
import { MENSAJES_VALIDACION, validarConsultaEnviadas, validarEvaluacion, validarSolicitudJev } from "@/lib/validacion";

// POST /api/evaluaciones validation: every rejection case in PRD §10. Also
// the POST /api/jev body (PRD §8.3).

const IA = {
  nivelSugerido: 3,
  probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 },
  confianza: 0.71,
  modelo: "jev-1.13.0",
};

type Calificacion = Record<string, unknown>;

function cuerpo(cambios: Record<string, unknown> = {}, calificaciones?: Calificacion[]) {
  return {
    competenciaId: "adaptabilidad",
    evaluadorId: "jimena-salgado",
    participanteId: "P01",
    calificaciones: calificaciones ?? [1, 2, 3, 4].map((n) => ({ indicadorId: `adaptabilidad-${n}`, nivel: n, origen: "manual" })),
    ...cambios,
  };
}

/** The 4 valid calificaciones with the first one changed. */
function conPrimera(cambios: Calificacion): Calificacion[] {
  const base = cuerpo().calificaciones as Calificacion[];
  return [{ ...base[0], ...cambios }, ...base.slice(1)];
}

function error(datos: unknown) {
  const resultado = validarEvaluacion(datos);
  return resultado.ok ? null : resultado.error;
}

describe("validarEvaluacion: casos válidos", () => {
  it("acepta una evaluación completa", () => {
    const resultado = validarEvaluacion(cuerpo());
    expect(resultado.ok).toBe(true);
  });

  it("normaliza observaciones: recorta y guarda las vacías como null", () => {
    const resultado = validarEvaluacion(
      cuerpo({}, [
        { indicadorId: "adaptabilidad-1", nivel: 1, origen: "manual", observacion: "  Pidió ayuda para reorganizarse.  " },
        { indicadorId: "adaptabilidad-2", nivel: 2, origen: "manual", observacion: "   " },
        { indicadorId: "adaptabilidad-3", nivel: 3, origen: "manual", observacion: null },
        { indicadorId: "adaptabilidad-4", nivel: 4, origen: "manual" },
      ]),
    );
    if (!resultado.ok) throw new Error(resultado.error);
    expect(resultado.datos.calificaciones.map((c) => c.observacion)).toEqual(["Pidió ayuda para reorganizarse.", null, null, null]);
    expect(resultado.datos.calificaciones.every((c) => c.ia === null)).toBe(true);
  });

  it("acepta origen ia con metadatos, y origen manual que conserva los de una sugerencia anterior", () => {
    expect(validarEvaluacion(cuerpo({}, conPrimera({ origen: "ia", nivel: 3, ia: IA }))).ok).toBe(true);
    expect(validarEvaluacion(cuerpo({}, conPrimera({ origen: "manual", nivel: 2, ia: IA }))).ok).toBe(true);
  });

  it("acepta exactamente 1000 caracteres de observación y probabilidades que suman 1 ± 0,02", () => {
    expect(validarEvaluacion(cuerpo({}, conPrimera({ observacion: "a".repeat(1000) }))).ok).toBe(true);
    const casiUno = { ...IA, probabilidades: { "1": 0.05, "2": 0.17, "3": 0.79, "4": 0.01 } }; // 1.02
    expect(validarEvaluacion(cuerpo({}, conPrimera({ origen: "ia", ia: casiUno }))).ok).toBe(true);
  });

  it("acepta la docente u otra integrante del equipo y cualquier participante configurado", () => {
    expect(validarEvaluacion(cuerpo({ evaluadorId: "wesnlyn-garcia-perez", participanteId: "P20" })).ok).toBe(true);
  });
});

describe("validarEvaluacion: rechazos (PRD §10)", () => {
  it.each([null, "texto", [], {}, cuerpo({ competenciaId: 7 }), cuerpo({ calificaciones: "x" }), cuerpo({ evaluadorId: "" })])(
    "forma inválida %#",
    (datos) => {
      expect(error(datos)).toBe(MENSAJES_VALIDACION.cuerpo);
    },
  );

  it("competencia inexistente o no habilitada", () => {
    expect(error(cuerpo({ competenciaId: "no-existe" }))).toBe(MENSAJES_VALIDACION.competencia);
    expect(error(cuerpo({ competenciaId: "pensamiento-critico" }))).toBe(MENSAJES_VALIDACION.competencia);
  });

  it("evaluador que no pertenece al equipo de la competencia", () => {
    expect(error(cuerpo({ evaluadorId: "mariana-alfaro-nunez" }))).toBe(MENSAJES_VALIDACION.evaluador); // Equipo 1
    expect(error(cuerpo({ evaluadorId: "nadie" }))).toBe(MENSAJES_VALIDACION.evaluador);
  });

  it("participante inexistente", () => {
    expect(error(cuerpo({ participanteId: "P99" }))).toBe(MENSAJES_VALIDACION.participante);
  });

  it("no tiene exactamente los indicadores de la competencia", () => {
    const base = cuerpo().calificaciones as Calificacion[];
    const faltaUno = base.slice(0, 3);
    const duplicado = [...base.slice(0, 3), { ...base[0] }];
    const ajeno = [...base.slice(0, 3), { indicadorId: "otro-1", nivel: 2, origen: "manual" }];
    const sobra = [...base, { indicadorId: "adaptabilidad-5", nivel: 2, origen: "manual" }];
    for (const calificaciones of [faltaUno, duplicado, ajeno, sobra, []]) {
      expect(error(cuerpo({ calificaciones })), JSON.stringify(calificaciones)).toBe(
        calificaciones.length === 0 ? MENSAJES_VALIDACION.cuerpo : MENSAJES_VALIDACION.indicadores,
      );
    }
  });

  it.each([0, 5, 2.5, -1, "3", null])("nivel fuera de 1–4: %j", (nivel) => {
    expect(error(cuerpo({}, conPrimera({ nivel })))).toBe(MENSAJES_VALIDACION.nivel);
  });

  it("observación de más de 1000 caracteres", () => {
    expect(error(cuerpo({}, conPrimera({ observacion: "a".repeat(1001) })))).toBe(MENSAJES_VALIDACION.observacion);
    expect(MENSAJES_VALIDACION.observacion).toMatch(/1\s000 caracteres/);
  });

  it("origen desconocido", () => {
    expect(error(cuerpo({}, conPrimera({ origen: "otro" })))).toBe(MENSAJES_VALIDACION.cuerpo);
  });

  it("origen ia sin metadatos de la sugerencia", () => {
    expect(error(cuerpo({}, conPrimera({ origen: "ia" })))).toBe(MENSAJES_VALIDACION.ia);
    expect(error(cuerpo({}, conPrimera({ origen: "ia", ia: null })))).toBe(MENSAJES_VALIDACION.ia);
  });

  it.each([
    ["nivelSugerido 0", { ...IA, nivelSugerido: 0 }],
    ["nivelSugerido 2.5", { ...IA, nivelSugerido: 2.5 }],
    ["falta una clave", { ...IA, probabilidades: { "1": 0.2, "2": 0.2, "3": 0.6 } }],
    ["claves 0–3 en vez de 1–4", { ...IA, probabilidades: { "0": 0.05, "1": 0.17, "2": 0.78, "3": 0 } }],
    ["clave extra", { ...IA, probabilidades: { ...IA.probabilidades, "5": 0 } }],
    ["no suma 1", { ...IA, probabilidades: { "1": 0.5, "2": 0.5, "3": 0.5, "4": 0 } }],
    ["probabilidad negativa", { ...IA, probabilidades: { "1": -0.1, "2": 0.3, "3": 0.8, "4": 0 } }],
    ["confianza > 1", { ...IA, confianza: 1.2 }],
    ["modelo vacío", { ...IA, modelo: " " }],
    ["sin modelo", { nivelSugerido: 3, probabilidades: IA.probabilidades, confianza: 0.7 }],
    ["no es objeto", "jev"],
  ])("metadatos de IA mal formados: %s", (_caso, ia) => {
    expect(error(cuerpo({}, conPrimera({ origen: "ia", ia })))).toBe(MENSAJES_VALIDACION.ia);
  });
});

describe("validarConsultaEnviadas", () => {
  const consulta = (texto: string) => validarConsultaEnviadas(new URLSearchParams(texto));

  it("acepta competencia habilitada y una integrante de su equipo", () => {
    expect(consulta("competencia=adaptabilidad&evaluador=jimena-salgado")).toEqual({
      ok: true,
      datos: { competenciaId: "adaptabilidad", evaluadorId: "jimena-salgado" },
    });
  });

  it("rechaza parámetros faltantes, competencia no habilitada o evaluador ajeno", () => {
    expect(consulta("competencia=adaptabilidad")).toEqual({ ok: false, error: MENSAJES_VALIDACION.consulta });
    expect(consulta("competencia=pensamiento-critico&evaluador=felipe-lopez")).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.competencia,
    });
    expect(consulta("competencia=adaptabilidad&evaluador=felipe-lopez")).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.evaluador,
    });
  });
});

describe("validarSolicitudJev (POST /api/jev)", () => {
  const TEXTO = "Reorganizó sus actividades sin ayuda tras el cambio de prioridades.";
  const BASE = { competenciaId: "adaptabilidad", indicadorId: "adaptabilidad-3", texto: TEXTO };

  it("acepta una solicitud válida y devuelve la competencia y el indicador de la configuración", () => {
    const resultado = validarSolicitudJev({ ...BASE, texto: `
 ${TEXTO} 	` });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.competencia.id).toBe("adaptabilidad");
    expect(resultado.datos.indicador.numero).toBe(3);
    expect(resultado.datos.texto).toBe(TEXTO);
  });

  it("descarta campos extra: no llegan a Jev", () => {
    const resultado = validarSolicitudJev({ ...BASE, participanteId: "P01", evaluadorId: "jimena-salgado" });
    expect(resultado.ok && Object.keys(resultado.datos)).toEqual(["competencia", "indicador", "texto"]);
  });

  it.each([
    ["no es un objeto", "texto", MENSAJES_VALIDACION.solicitudIa],
    ["nulo", null, MENSAJES_VALIDACION.solicitudIa],
    ["sin competencia", { indicadorId: "adaptabilidad-3", texto: TEXTO }, MENSAJES_VALIDACION.solicitudIa],
    ["sin texto", { competenciaId: "adaptabilidad", indicadorId: "adaptabilidad-3" }, MENSAJES_VALIDACION.descripcion],
    ["texto no es cadena", { ...BASE, texto: 42 }, MENSAJES_VALIDACION.descripcion],
    ["19 caracteres tras recortar", { ...BASE, texto: `  ${"a".repeat(19)}  ` }, MENSAJES_VALIDACION.descripcion],
    ["1501 caracteres", { ...BASE, texto: "a".repeat(1501) }, MENSAJES_VALIDACION.descripcion],
    ["competencia inexistente", { ...BASE, competenciaId: "liderazgo" }, MENSAJES_VALIDACION.competencia],
    ["competencia deshabilitada", { ...BASE, competenciaId: "orientacion-resultados" }, MENSAJES_VALIDACION.competencia],
    ["indicador inexistente", { ...BASE, indicadorId: "adaptabilidad-5" }, MENSAJES_VALIDACION.indicador],
  ])("rechaza: %s", (_caso, datos, mensaje) => {
    expect(validarSolicitudJev(datos)).toEqual({ ok: false, error: mensaje });
  });

  it("los límites 20 y 1500 son inclusivos", () => {
    expect(validarSolicitudJev({ ...BASE, texto: "a".repeat(20) }).ok).toBe(true);
    expect(validarSolicitudJev({ ...BASE, texto: "a".repeat(1500) }).ok).toBe(true);
  });

  it("el mensaje de longitud usa el formato es-CR", () => {
    expect(MENSAJES_VALIDACION.descripcion).toBe("La descripción debe tener entre 20 y 1 500 caracteres.");
  });
});
