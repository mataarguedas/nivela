import { z } from "zod";
import { obtenerCompetenciaHabilitada, obtenerIndicador, type Competencia, type Indicador } from "@/config/competencias";
import { equipoDeCompetencia, obtenerEvaluador, type Equipo } from "@/config/equipos";
import {
  LARGO_MAXIMO_DESCRIPCION_IA,
  LARGO_MAXIMO_OBSERVACION,
  LARGO_MINIMO_DESCRIPCION_IA,
} from "@/config/limites";
import { VALORES_NIVEL } from "@/config/niveles";
import { CANTIDAD_MAXIMA_PARTICIPANTES, esNombreValido } from "@/config/participantes";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import { formatearEntero } from "@/lib/formato";

// Request validation for /api/evaluaciones (PRD §10), /api/jev (PRD §8.3),
// /api/reportes and /api/admin/participantes: zod for the shape, then
// cross-checks against src/config (and the participant list from the DB).
// Every rejection carries a Spanish message for the `{ error }` body. Client
// code may `import type` from here; importing values would ship zod to the
// rating pages.

/** Tolerance for the probabilities of a Jev suggestion summing to 1. */
export const TOLERANCIA_SUMA_PROBABILIDADES = 0.02;
// Absorbs float noise, e.g. 0.05 + 0.17 + 0.79 + 0.01 = 1.0200000000000002.
const RUIDO_FLOTANTE = 1e-9;
const CLAVES_PROBABILIDAD = VALORES_NIVEL.map(String);

export const MENSAJES_VALIDACION = {
  cuerpo: "Los datos de la evaluación no son válidos.",
  competencia: "La competencia no existe o no está habilitada.",
  evaluador: "La persona evaluadora no pertenece al equipo de esta competencia.",
  participante: "El participante no existe.",
  indicadores: "La evaluación debe incluir cada indicador de la competencia exactamente una vez.",
  nivel: "Cada indicador necesita un nivel entre 1 y 4.",
  observacion: `Cada observación puede tener como máximo ${formatearEntero(LARGO_MAXIMO_OBSERVACION)} caracteres.`,
  ia: "Los datos de la sugerencia de IA no son válidos.",
  consulta: "Indique la competencia y la persona evaluadora.",
  indicador: "El indicador no existe en esta competencia.",
  descripcion: `La descripción debe tener entre ${formatearEntero(LARGO_MINIMO_DESCRIPCION_IA)} y ${formatearEntero(LARGO_MAXIMO_DESCRIPCION_IA)} caracteres.`,
  solicitudIa: "Los datos de la solicitud de análisis no son válidos.",
  cantidadParticipantes: TEXTOS_ADMIN.cantidadInvalida,
  nombreParticipante: TEXTOS_ADMIN.nombreInvalido,
  listaParticipantes: TEXTOS_ADMIN.listaInvalida,
} as const;

const id = z.string().trim().min(1).max(100);

const esquemaIa = z.object({
  nivelSugerido: z.number().int().min(1).max(4),
  probabilidades: z
    .record(z.string(), z.number().min(0).max(1))
    .refine((p) => {
      const claves = Object.keys(p);
      return claves.length === CLAVES_PROBABILIDAD.length && CLAVES_PROBABILIDAD.every((c) => c in p);
    })
    .refine((p) => Math.abs(Object.values(p).reduce((s, v) => s + v, 0) - 1) <= TOLERANCIA_SUMA_PROBABILIDADES + RUIDO_FLOTANTE),
  confianza: z.number().min(0).max(1),
  modelo: z.string().trim().min(1).max(100),
});

const esquemaCalificacion = z
  .object({
    indicadorId: id,
    nivel: z.number().int().min(1).max(4),
    // Blank observations are stored as null.
    observacion: z
      .string()
      .trim()
      .max(LARGO_MAXIMO_OBSERVACION)
      .nullish()
      .transform((t) => (t ? t : null)),
    origen: z.enum(["manual", "ia"]),
    ia: esquemaIa.nullish().transform((ia) => ia ?? null),
  })
  // An applied suggestion is always saved with its metadata (PRD §5.6.7).
  .refine((c) => c.origen === "manual" || c.ia !== null, { path: ["ia"] });

export const esquemaEvaluacion = z.object({
  competenciaId: id,
  evaluadorId: id,
  participanteId: id,
  calificaciones: z.array(esquemaCalificacion).min(1).max(50),
});

/** What the client sends. */
export type CuerpoEvaluacion = z.input<typeof esquemaEvaluacion>;
/** What the server stores, after validation. */
export type EvaluacionValida = z.output<typeof esquemaEvaluacion>;

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Maps the first zod issue to the message for the field it belongs to. */
function mensajeDe(error: z.ZodError): string {
  const ruta = error.issues[0]?.path ?? [];
  if (ruta.includes("ia")) return MENSAJES_VALIDACION.ia;
  if (ruta.includes("nivel")) return MENSAJES_VALIDACION.nivel;
  if (ruta.includes("observacion")) return MENSAJES_VALIDACION.observacion;
  return MENSAJES_VALIDACION.cuerpo;
}

/**
 * POST /api/evaluaciones body: shape plus every cross-check in PRD §10.
 * `participantes` is the current active list (db/participantes.ts), so a
 * participant the admin has hidden can't receive new evaluations.
 */
export function validarEvaluacion(
  datos: unknown,
  participantes: readonly { id: string }[],
): Resultado<EvaluacionValida> {
  const forma = esquemaEvaluacion.safeParse(datos);
  if (!forma.success) return { ok: false, error: mensajeDe(forma.error) };
  const evaluacion = forma.data;

  const competencia = obtenerCompetenciaHabilitada(evaluacion.competenciaId);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  if (!obtenerEvaluador(competencia.id, evaluacion.evaluadorId)) {
    return { ok: false, error: MENSAJES_VALIDACION.evaluador };
  }
  if (!participantes.some((p) => p.id === evaluacion.participanteId)) return { ok: false, error: MENSAJES_VALIDACION.participante };

  const esperados = competencia.indicadores.map((i) => i.id);
  const recibidos = evaluacion.calificaciones.map((c) => c.indicadorId);
  const exactos =
    recibidos.length === esperados.length &&
    new Set(recibidos).size === recibidos.length &&
    recibidos.every((r) => esperados.includes(r));
  if (!exactos) return { ok: false, error: MENSAJES_VALIDACION.indicadores };

  return { ok: true, datos: evaluacion };
}

const esquemaConsulta = z.object({ competencia: id, evaluador: id });

export type ConsultaEnviadas = { competenciaId: string; evaluadorId: string };

/** GET /api/evaluaciones?competencia=&evaluador= */
export function validarConsultaEnviadas(parametros: URLSearchParams): Resultado<ConsultaEnviadas> {
  const consulta = esquemaConsulta.safeParse(Object.fromEntries(parametros));
  if (!consulta.success) return { ok: false, error: MENSAJES_VALIDACION.consulta };
  const competencia = obtenerCompetenciaHabilitada(consulta.data.competencia);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  if (!obtenerEvaluador(competencia.id, consulta.data.evaluador)) {
    return { ok: false, error: MENSAJES_VALIDACION.evaluador };
  }
  return { ok: true, datos: { competenciaId: competencia.id, evaluadorId: consulta.data.evaluador } };
}

// Unknown keys are stripped: nothing but these three fields can reach Jev,
// and the rubric text always comes from config, never from the client.
const esquemaSolicitudJev = z.object({
  competenciaId: id,
  indicadorId: id,
  texto: z.string().trim().min(LARGO_MINIMO_DESCRIPCION_IA).max(LARGO_MAXIMO_DESCRIPCION_IA),
});

export type SolicitudJevValida = { competencia: Competencia; indicador: Indicador; texto: string };

/** POST /api/jev body: shape, then the competencia (habilitada) and its indicator from config. */
export function validarSolicitudJev(datos: unknown): Resultado<SolicitudJevValida> {
  const forma = esquemaSolicitudJev.safeParse(datos);
  if (!forma.success) {
    const enTexto = forma.error.issues[0]?.path.includes("texto");
    return { ok: false, error: enTexto ? MENSAJES_VALIDACION.descripcion : MENSAJES_VALIDACION.solicitudIa };
  }
  const competencia = obtenerCompetenciaHabilitada(forma.data.competenciaId);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  const indicador = obtenerIndicador(competencia, forma.data.indicadorId);
  if (!indicador) return { ok: false, error: MENSAJES_VALIDACION.indicador };
  return { ok: true, datos: { competencia, indicador, texto: forma.data.texto } };
}

export type CompetenciaReporte = { competencia: Competencia; equipo: Equipo };

/** /api/reportes/[competencia] param: an enabled competencia that has a team. */
export function validarCompetenciaReporte(valor: unknown): Resultado<CompetenciaReporte> {
  const forma = id.safeParse(valor);
  const competencia = forma.success ? obtenerCompetenciaHabilitada(forma.data) : undefined;
  const equipo = competencia && equipoDeCompetencia(competencia.id);
  if (!competencia || !equipo) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  return { ok: true, datos: { competencia, equipo } };
}

const esquemaParticipantes = z.object({
  cantidad: z.number().int().min(1).max(CANTIDAD_MAXIMA_PARTICIPANTES),
  // Blank names are stored as null and shown as "Participante NN".
  nombres: z
    .array(
      z
        .string()
        .trim()
        .refine(esNombreValido)
        .transform((t) => (t ? t : null)),
    )
    .max(CANTIDAD_MAXIMA_PARTICIPANTES),
  confirmar: z.boolean().optional().default(false),
});

export type CuerpoParticipantes = z.input<typeof esquemaParticipantes>;
export type ParticipantesValidos = { nombres: (string | null)[]; confirmar: boolean };

/** PUT /api/admin/participantes body: one name (or blank) per participant, in order. */
export function validarParticipantes(datos: unknown): Resultado<ParticipantesValidos> {
  const forma = esquemaParticipantes.safeParse(datos);
  if (!forma.success) {
    const ruta = forma.error.issues[0]?.path ?? [];
    if (ruta[0] === "cantidad") return { ok: false, error: MENSAJES_VALIDACION.cantidadParticipantes };
    if (ruta[0] === "nombres" && typeof ruta[1] === "number") {
      return { ok: false, error: MENSAJES_VALIDACION.nombreParticipante(ruta[1] + 1) };
    }
    return { ok: false, error: MENSAJES_VALIDACION.listaParticipantes };
  }
  const { cantidad, nombres, confirmar } = forma.data;
  if (nombres.length !== cantidad) return { ok: false, error: MENSAJES_VALIDACION.listaParticipantes };
  return { ok: true, datos: { nombres, confirmar } };
}
