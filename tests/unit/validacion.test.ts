import { describe, expect, it } from "vitest";
import type { JornadaId } from "@/config/jornadas";
import { generarParticipantes } from "@/config/participantes";
import {
  MENSAJES_VALIDACION,
  validarConsultaEnviadas,
  validarEvaluacion,
  validarParticipantes,
  validarSeleccionResumen,
  validarSolicitudJev,
} from "@/lib/validacion";
import { sinRubrica } from "./sinRubrica";

// POST /api/evaluaciones validation: every rejection case in PRD §10. Also
// the POST /api/jev body (PRD §8.3) and the admin's participant list.

/** The active participants, as db/participantes.ts would return them. */
const PARTICIPANTES = generarParticipantes(20);
const evaluar = (datos: unknown, participantes = PARTICIPANTES, jornada: JornadaId = "manana") =>
  validarEvaluacion(datos, participantes, jornada);

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

/** 4 valid manual calificaciones for a competencia's positional indicator ids. */
function calificacionesDe(competenciaId: string): Calificacion[] {
  return [1, 2, 3, 4].map((n) => ({ indicadorId: `${competenciaId}-${n}`, nivel: n, origen: "manual" }));
}

/** The 4 valid calificaciones with the first one changed. */
function conPrimera(cambios: Calificacion): Calificacion[] {
  const base = cuerpo().calificaciones as Calificacion[];
  return [{ ...base[0], ...cambios }, ...base.slice(1)];
}

function error(datos: unknown) {
  const resultado = evaluar(datos);
  return resultado.ok ? null : resultado.error;
}

describe("validarEvaluacion: casos válidos", () => {
  it("acepta una evaluación completa", () => {
    const resultado = evaluar(cuerpo());
    expect(resultado.ok).toBe(true);
  });

  it("normaliza observaciones: recorta y guarda las vacías como null", () => {
    const resultado = evaluar(
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
    expect(evaluar(cuerpo({}, conPrimera({ origen: "ia", nivel: 3, ia: IA }))).ok).toBe(true);
    expect(evaluar(cuerpo({}, conPrimera({ origen: "manual", nivel: 2, ia: IA }))).ok).toBe(true);
  });

  it("acepta exactamente 1000 caracteres de observación y probabilidades que suman 1 ± 0,02", () => {
    expect(evaluar(cuerpo({}, conPrimera({ observacion: "a".repeat(1000) }))).ok).toBe(true);
    const casiUno = { ...IA, probabilidades: { "1": 0.05, "2": 0.17, "3": 0.79, "4": 0.01 } }; // 1.02
    expect(evaluar(cuerpo({}, conPrimera({ origen: "ia", ia: casiUno }))).ok).toBe(true);
  });

  it("acepta la docente u otra integrante del equipo y cualquier participante configurado", () => {
    expect(evaluar(cuerpo({ evaluadorId: "wesnlyn-garcia-perez", participanteId: "P20" })).ok).toBe(true);
  });
});

describe("validarEvaluacion: rechazos (PRD §10)", () => {
  it.each([null, "texto", [], {}, cuerpo({ competenciaId: 7 }), cuerpo({ calificaciones: "x" }), cuerpo({ evaluadorId: "" })])(
    "forma inválida %#",
    (datos) => {
      expect(error(datos)).toBe(MENSAJES_VALIDACION.cuerpo);
    },
  );

  it("competencia inexistente o sin rúbrica en la jornada de la sesión", () => {
    sinRubrica("noche", "pensamiento-critico"); // no real night-less rubric since v1.7
    expect(error(cuerpo({ competenciaId: "no-existe" }))).toBe(MENSAJES_VALIDACION.competencia);
    const deNoche = cuerpo({ competenciaId: "pensamiento-critico", evaluadorId: "diana-hidalgo" }, calificacionesDe("pensamiento-critico"));
    expect(evaluar(deNoche, PARTICIPANTES, "noche")).toEqual({ ok: false, error: MENSAJES_VALIDACION.competencia });
  });

  it("de noche se califica con la rúbrica de la noche (v1.7): los ids de la mañana ya no valen", () => {
    const noche = (sufijo: string) =>
      cuerpo(
        { evaluadorId: "gabriela-salgado" },
        [1, 2, 3, 4].map((n) => ({ indicadorId: `adaptabilidad${sufijo}-${n}`, nivel: n, origen: "manual" as const })),
      );
    expect(evaluar(noche("-noche"), PARTICIPANTES, "noche").ok).toBe(true);
    expect(evaluar(noche(""), PARTICIPANTES, "noche")).toEqual({ ok: false, error: MENSAJES_VALIDACION.indicadores });
    expect(evaluar(noche("-noche"), PARTICIPANTES, "manana").ok).toBe(false);
  });

  it("cada rúbrica exige sus propios indicadores", () => {
    const pensamiento = cuerpo({ competenciaId: "pensamiento-critico", evaluadorId: "felipe-lopez" }, calificacionesDe("pensamiento-critico"));
    expect(evaluar(pensamiento).ok).toBe(true);
    // Adaptabilidad's indicator ids don't belong to another competencia's rubric.
    expect(error(cuerpo({ competenciaId: "pensamiento-critico", evaluadorId: "felipe-lopez" }))).toBe(MENSAJES_VALIDACION.indicadores);
  });

  it("evaluador que no pertenece al equipo de la competencia", () => {
    expect(error(cuerpo({ evaluadorId: "mariana-alfaro-nunez" }))).toBe(MENSAJES_VALIDACION.evaluador); // Equipo 1
    expect(error(cuerpo({ evaluadorId: "nadie" }))).toBe(MENSAJES_VALIDACION.evaluador);
  });

  it("evaluador de otra jornada: la jornada de la sesión decide el equipo", () => {
    const resultado = evaluar(cuerpo(), PARTICIPANTES, "noche");
    expect(resultado).toEqual({ ok: false, error: MENSAJES_VALIDACION.evaluador });
  });

  it("participante inexistente", () => {
    expect(error(cuerpo({ participanteId: "P99" }))).toBe(MENSAJES_VALIDACION.participante);
  });

  it("participante que el admin ocultó al bajar la cantidad", () => {
    const resultado = evaluar(cuerpo({ participanteId: "P20" }), generarParticipantes(15));
    expect(resultado).toEqual({ ok: false, error: MENSAJES_VALIDACION.participante });
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
  const consulta = (texto: string, jornada: JornadaId = "manana") => validarConsultaEnviadas(new URLSearchParams(texto), jornada);

  it("acepta competencia habilitada y una integrante de su equipo", () => {
    expect(consulta("competencia=adaptabilidad&evaluador=jimena-salgado")).toEqual({
      ok: true,
      datos: { competenciaId: "adaptabilidad", evaluadorId: "jimena-salgado" },
    });
  });

  it("rechaza parámetros faltantes, competencia sin rúbrica en la jornada o evaluador ajeno", () => {
    sinRubrica("noche", "pensamiento-critico"); // no real night-less rubric since v1.7
    expect(consulta("competencia=adaptabilidad")).toEqual({ ok: false, error: MENSAJES_VALIDACION.consulta });
    expect(consulta("competencia=pensamiento-critico&evaluador=felipe-lopez").ok).toBe(true);
    expect(consulta("competencia=pensamiento-critico&evaluador=diana-hidalgo", "noche")).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.competencia,
    });
    expect(consulta("competencia=adaptabilidad&evaluador=felipe-lopez")).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.evaluador,
    });
    expect(consulta("competencia=adaptabilidad&evaluador=jimena-salgado", "noche")).toEqual({
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
 ${TEXTO} 	` }, "manana");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.competencia.id).toBe("adaptabilidad");
    expect(resultado.datos.indicador.numero).toBe(3);
    expect(resultado.datos.texto).toBe(TEXTO);
  });

  it("descarta campos extra: no llegan a Jev", () => {
    const resultado = validarSolicitudJev({ ...BASE, participanteId: "P01", evaluadorId: "jimena-salgado" }, "manana");
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
    ["indicador inexistente", { ...BASE, indicadorId: "adaptabilidad-5" }, MENSAJES_VALIDACION.indicador],
    ["indicador de otra competencia", { ...BASE, indicadorId: "orientacion-resultados-1" }, MENSAJES_VALIDACION.indicador],
  ])("rechaza: %s", (_caso, datos, mensaje) => {
    expect(validarSolicitudJev(datos, "manana")).toEqual({ ok: false, error: mensaje });
  });

  it("usa la rúbrica de la jornada de la sesión", () => {
    sinRubrica("noche", "orientacion-resultados"); // no real night-less rubric since v1.7
    const solicitud = { competenciaId: "orientacion-resultados", indicadorId: "orientacion-resultados-2", texto: TEXTO };
    const manana = validarSolicitudJev(solicitud, "manana");
    expect(manana.ok && manana.datos.indicador.titulo).toBe(
      "Distribuye el tiempo disponible y supera obstáculos de manera persistente.",
    );
    expect(validarSolicitudJev(solicitud, "noche")).toEqual({ ok: false, error: MENSAJES_VALIDACION.competencia });
  });

  it("los límites 20 y 1500 son inclusivos", () => {
    expect(validarSolicitudJev({ ...BASE, texto: "a".repeat(20) }, "manana").ok).toBe(true);
    expect(validarSolicitudJev({ ...BASE, texto: "a".repeat(1500) }, "manana").ok).toBe(true);
  });

  it("el mensaje de longitud usa el formato es-CR", () => {
    expect(MENSAJES_VALIDACION.descripcion).toBe("La descripción debe tener entre 20 y 1 500 caracteres.");
  });
});

describe("validarParticipantes (PUT /api/admin/participantes)", () => {
  const lista = (nombres: string[], extra: Record<string, unknown> = {}) => ({
    jornada: "manana",
    cantidad: nombres.length,
    nombres,
    carnets: nombres.map(() => ""),
    correos: nombres.map(() => ""),
    ...extra,
  });

  it("acepta nombres con tildes, recorta y guarda los vacíos como null", () => {
    expect(validarParticipantes(lista(["  Ana Pérez ", "", "José Ñúñez Solís"]))).toEqual({
      ok: true,
      datos: {
        jornada: "manana",
        nombres: ["Ana Pérez", null, "José Ñúñez Solís"],
        carnets: [null, null, null],
        grupos: [null, null, null],
        correos: [null, null, null],
        confirmar: false,
      },
    });
    expect(validarParticipantes(lista(["Ana"], { confirmar: true }))).toMatchObject({ ok: true, datos: { confirmar: true } });
  });

  it("acepta un grupo por nombre (v1.8) y rechaza uno fuera de 1…20 o una lista de otro largo", () => {
    expect(validarParticipantes(lista(["Ana", "Bea"], { grupos: [2, null] }))).toMatchObject({
      ok: true,
      datos: { grupos: [2, null] },
    });
    expect(validarParticipantes(lista(["Ana", "Bea"], { grupos: [2, 21] }))).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.grupoParticipante(2),
    });
    expect(validarParticipantes(lista(["Ana", "Bea"], { grupos: [1.5, null] }))).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.grupoParticipante(1),
    });
    expect(validarParticipantes(lista(["Ana", "Bea"], { grupos: [1] }))).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.listaParticipantes,
    });
  });

  it.each([0, 100, 2.5, "5", null])("rechaza la cantidad %j", (cantidad) => {
    expect(validarParticipantes({ jornada: "manana", cantidad, nombres: ["Ana"] })).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.cantidadParticipantes,
    });
  });

  it("rechaza una cantidad que no coincide con los nombres, o un cuerpo sin forma", () => {
    expect(validarParticipantes({ jornada: "manana", cantidad: 3, nombres: ["Ana", "Bea"] })).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.listaParticipantes,
    });
    expect(validarParticipantes({ cantidad: 1, nombres: ["Ana"] })).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.listaParticipantes,
    });
    expect(validarParticipantes(lista(["Ana"], { jornada: "tarde" }))).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.listaParticipantes,
    });
    expect(validarParticipantes(null)).toEqual({ ok: false, error: MENSAJES_VALIDACION.listaParticipantes });
  });

  it.each([
    ["un correo", "ana@ejemplo.com"],
    ["un teléfono", "Ana 8888-1234"],
    ["un salto de línea", "Ana\nPérez"],
    ["más de 80 caracteres", "a".repeat(81)],
  ])("rechaza %s y señala el participante", (_, nombre) => {
    expect(validarParticipantes(lista(["Ana", nombre]))).toEqual({
      ok: false,
      error: MENSAJES_VALIDACION.nombreParticipante(2),
    });
  });
});

describe("validarSeleccionResumen (?jornada= del Resumen del grupo, PRD §11.3)", () => {
  const seleccion = (competencia: string, valor: unknown, sesion: JornadaId) => {
    const r = validarSeleccionResumen(competencia, valor, sesion);
    return r.ok ? { seleccion: r.datos.seleccion, opciones: r.datos.opciones, jornadas: r.datos.jornadas.map((j) => j.jornada) } : null;
  };

  it("Adaptabilidad tiene plantilla en ambas jornadas: ofrece Mañana, Noche y Ambas", () => {
    expect(seleccion("adaptabilidad", "ambas", "manana")).toEqual({
      seleccion: "ambas",
      opciones: ["manana", "noche", "ambas"],
      jornadas: ["manana", "noche"],
    });
    expect(seleccion("adaptabilidad", "noche", "manana")?.jornadas).toEqual(["noche"]);
  });

  it("cada jornada trae su propio equipo: Equipo 4 en la mañana, Equipo 1 en la noche", () => {
    const r = validarSeleccionResumen("adaptabilidad", "ambas", "noche");
    expect(r.ok && r.datos.jornadas.map((j) => [j.jornada, j.equipo.jornada, j.equipo.competenciaId])).toEqual([
      ["manana", "manana", "adaptabilidad"],
      ["noche", "noche", "adaptabilidad"],
    ]);
  });

  it.each([undefined, null, "", "tarde", "AMBAS", ["noche", "ambas"], 1])("un valor ausente o inválido (%j) usa la jornada de la sesión", (valor) => {
    expect(seleccion("adaptabilidad", valor, "noche")?.seleccion).toBe("noche");
    expect(seleccion("adaptabilidad", valor, "manana")?.seleccion).toBe("manana");
  });

  it("«ambas» no se ofrece si una jornada no tiene plantilla: vuelve a la jornada de la sesión", () => {
    sinRubrica("noche", "pensamiento-critico"); // no real night-less rubric since v1.7
    expect(seleccion("pensamiento-critico", "ambas", "manana")).toEqual({
      seleccion: "manana",
      opciones: ["manana"],
      jornadas: ["manana"],
    });
  });

  it("404 solo si la competencia no está en la jornada pedida ni en la de la sesión", () => {
    sinRubrica("noche", "pensamiento-critico"); // no real night-less rubric since v1.7
    expect(seleccion("pensamiento-critico", undefined, "noche")).toBeNull();
    expect(seleccion("pensamiento-critico", "noche", "noche")).toBeNull();
    // An explicit jornada that has it is still a valid read-only view.
    expect(seleccion("pensamiento-critico", "manana", "noche")?.seleccion).toBe("manana");
    expect(seleccion("no-existe", "manana", "manana")).toBeNull();
  });
});
