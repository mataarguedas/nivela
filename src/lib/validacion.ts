import { z } from "zod";
import { obtenerCompetenciaHabilitada, obtenerIndicador, type Competencia, type Indicador } from "@/config/competencias";
import { equipoDeCompetencia, obtenerEvaluador, type Equipo } from "@/config/equipos";
import { IDS_JORNADA, SELECCIONES_JORNADA, type JornadaId, type SeleccionJornada } from "@/config/jornadas";
import {
  LARGO_MAXIMO_DESCRIPCION_IA,
  LARGO_MAXIMO_OBSERVACION,
  LARGO_MINIMO_DESCRIPCION_IA,
} from "@/config/limites";
import { VALORES_NIVEL } from "@/config/niveles";
import { CANTIDAD_MAXIMA_PARTICIPANTES, esCarnetValido, esIdParticipante, esNombreValido } from "@/config/participantes";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import { formatearEntero } from "@/lib/formato";

// Request validation for /api/evaluaciones (PRD §10), /api/jev (PRD §8.3),
// /api/reportes and /api/admin/participantes: zod for the shape, then
// cross-checks against src/config (and the participant list from the DB).
// The jornada always comes from the session, never from the request: the
// checks below take it as an argument so a request can't reach the other
// cohort's team or participants. The one exception is the docente's
// read-only group summary (validarSeleccionResumen, PRD §11.3).
// Every rejection carries a Spanish message for the `{ error }` body. Client
// code may `import type` from here; importing values would ship zod to the
// rating pages.

/** Tolerance for the probabilities of a Jev suggestion summing to 1. */
export const TOLERANCIA_SUMA_PROBABILIDADES = 0.02;
// Absorbs float noise, e.g. 0.05 + 0.17 + 0.79 + 0.01 = 1.0200000000000002.
const RUIDO_FLOTANTE = 1e-9;
const CLAVES_PROBABILIDAD = VALORES_NIVEL.map(String);

/** Longest email address (RFC 5321 path limit), PRD §5.10 and §9.2. */
export const LARGO_MAXIMO_CORREO = 254;

/** An email as stored (PRD §5.12, §9.2): trimmed, lowercased, valid, ≤ 254. */
export const esquemaCorreo = z.string().trim().toLowerCase().max(LARGO_MAXIMO_CORREO).pipe(z.email());

/** A trimmed email (or "", meaning none) the admin may save for a participant (PRD §5.10). */
export function esCorreoParticipanteValido(texto: string): boolean {
  const limpio = texto.trim();
  return limpio === "" || esquemaCorreo.safeParse(limpio).success;
}

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
  asistencia: "Los datos de asistencia no son válidos.",
  indicador: "El indicador no existe en esta competencia.",
  descripcion: `La descripción debe tener entre ${formatearEntero(LARGO_MINIMO_DESCRIPCION_IA)} y ${formatearEntero(LARGO_MAXIMO_DESCRIPCION_IA)} caracteres.`,
  solicitudIa: "Los datos de la solicitud de análisis no son válidos.",
  cantidadParticipantes: TEXTOS_ADMIN.cantidadInvalida,
  nombreParticipante: TEXTOS_ADMIN.nombreInvalido,
  carnetParticipante: TEXTOS_ADMIN.carneInvalido,
  carnetRepetido: TEXTOS_ADMIN.carneRepetido,
  correoParticipante: TEXTOS_ADMIN.correoInvalido,
  listaParticipantes: TEXTOS_ADMIN.listaInvalida,
  envio: "Los datos del envío no son válidos.",
  correoPrueba: "Ingrese un correo electrónico válido para la prueba.",
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
 * `participantes` is the jornada's current active list (db/participantes.ts),
 * so a participant the admin has hidden can't receive new evaluations.
 */
export function validarEvaluacion(
  datos: unknown,
  participantes: readonly { id: string }[],
  jornada: JornadaId,
): Resultado<EvaluacionValida> {
  const forma = esquemaEvaluacion.safeParse(datos);
  if (!forma.success) return { ok: false, error: mensajeDe(forma.error) };
  const evaluacion = forma.data;

  const competencia = obtenerCompetenciaHabilitada(jornada, evaluacion.competenciaId);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  if (!obtenerEvaluador(jornada, competencia.id, evaluacion.evaluadorId)) {
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
export function validarConsultaEnviadas(parametros: URLSearchParams, jornada: JornadaId): Resultado<ConsultaEnviadas> {
  const consulta = esquemaConsulta.safeParse(Object.fromEntries(parametros));
  if (!consulta.success) return { ok: false, error: MENSAJES_VALIDACION.consulta };
  const competencia = obtenerCompetenciaHabilitada(jornada, consulta.data.competencia);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  if (!obtenerEvaluador(jornada, competencia.id, consulta.data.evaluador)) {
    return { ok: false, error: MENSAJES_VALIDACION.evaluador };
  }
  return { ok: true, datos: { competenciaId: competencia.id, evaluadorId: consulta.data.evaluador } };
}

const esquemaAsistencia = z.object({
  competenciaId: id,
  // Optional for an evaluador (the route fills in the session's integranteId);
  // the docente names the team member it rates as, like in /api/evaluaciones.
  evaluadorId: id.optional(),
  participanteId: id,
  ausente: z.boolean(),
});

export type CuerpoAsistencia = z.input<typeof esquemaAsistencia>;
export type AsistenciaValida = { competenciaId: string; evaluadorId: string; participanteId: string; ausente: boolean };

/**
 * PUT /api/asistencia body (PRD §5.13, §10). `evaluadorSesion` is the
 * evaluador's integranteId (null for the docente); the caller has already
 * answered 403 for another evaluator's id. Same cross-checks as an
 * evaluation: enabled competencia, a member of the jornada's team, and a
 * participant active in the jornada.
 */
export function validarAsistencia(
  datos: unknown,
  participantes: readonly { id: string }[],
  jornada: JornadaId,
  evaluadorSesion: string | null,
): Resultado<AsistenciaValida> {
  const forma = esquemaAsistencia.safeParse(datos);
  if (!forma.success) return { ok: false, error: MENSAJES_VALIDACION.asistencia };
  const evaluadorId = forma.data.evaluadorId ?? evaluadorSesion;
  if (!evaluadorId) return { ok: false, error: MENSAJES_VALIDACION.asistencia };

  const competencia = obtenerCompetenciaHabilitada(jornada, forma.data.competenciaId);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  if (!obtenerEvaluador(jornada, competencia.id, evaluadorId)) return { ok: false, error: MENSAJES_VALIDACION.evaluador };
  if (!participantes.some((p) => p.id === forma.data.participanteId)) return { ok: false, error: MENSAJES_VALIDACION.participante };

  return {
    ok: true,
    datos: { competenciaId: competencia.id, evaluadorId, participanteId: forma.data.participanteId, ausente: forma.data.ausente },
  };
}

// Unknown keys are stripped: nothing but these three fields can reach Jev,
// and the rubric text always comes from config, never from the client.
const esquemaSolicitudJev = z.object({
  competenciaId: id,
  indicadorId: id,
  texto: z.string().trim().min(LARGO_MINIMO_DESCRIPCION_IA).max(LARGO_MAXIMO_DESCRIPCION_IA),
});

export type SolicitudJevValida = { competencia: Competencia; indicador: Indicador; texto: string };

/**
 * POST /api/jev body: shape, then the competencia and its indicator from the
 * session jornada's rubric in config (each jornada's team has its own).
 */
export function validarSolicitudJev(datos: unknown, jornada: JornadaId): Resultado<SolicitudJevValida> {
  const forma = esquemaSolicitudJev.safeParse(datos);
  if (!forma.success) {
    const enTexto = forma.error.issues[0]?.path.includes("texto");
    return { ok: false, error: enTexto ? MENSAJES_VALIDACION.descripcion : MENSAJES_VALIDACION.solicitudIa };
  }
  const competencia = obtenerCompetenciaHabilitada(jornada, forma.data.competenciaId);
  if (!competencia) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  const indicador = obtenerIndicador(competencia, forma.data.indicadorId);
  if (!indicador) return { ok: false, error: MENSAJES_VALIDACION.indicador };
  return { ok: true, datos: { competencia, indicador, texto: forma.data.texto } };
}

export type CompetenciaReporte = { competencia: Competencia; equipo: Equipo };

/** /api/reportes/[competencia] param: a competencia with a rubric and a team in the jornada. */
export function validarCompetenciaReporte(valor: unknown, jornada: JornadaId): Resultado<CompetenciaReporte> {
  const forma = id.safeParse(valor);
  const competencia = forma.success ? obtenerCompetenciaHabilitada(jornada, forma.data) : undefined;
  const equipo = competencia && equipoDeCompetencia(jornada, competencia.id);
  if (!competencia || !equipo) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  return { ok: true, datos: { competencia, equipo } };
}

export type JornadaResumen = CompetenciaReporte & { jornada: JornadaId };

export type SeleccionResumen = {
  seleccion: SeleccionJornada;
  /** What the "Jornada" selector offers: the jornadas with this competencia, plus "ambas" when it is in all of them. */
  opciones: SeleccionJornada[];
  /** The selected jornadas, each with its own rubric and team, in JORNADAS order. */
  jornadas: JornadaResumen[];
};

const esquemaSeleccionJornada = z.enum(SELECCIONES_JORNADA);

/**
 * The group summary's `?jornada=manana|noche|ambas` (PRD §11.3): the single
 * place a jornada comes from the request (§5.11). It only selects what a
 * read-only page shows; it never writes and never changes the session.
 * Missing, invalid or not offered for this competencia (e.g. "ambas" when one
 * jornada has no rubric for it) falls back to the session's jornada. An error
 * (a 404) only when the competencia isn't available in the session's jornada
 * either.
 */
export function validarSeleccionResumen(
  competenciaId: unknown,
  valor: unknown,
  jornadaSesion: JornadaId,
): Resultado<SeleccionResumen> {
  const disponibles = IDS_JORNADA.flatMap((jornada): JornadaResumen[] => {
    const validacion = validarCompetenciaReporte(competenciaId, jornada);
    return validacion.ok ? [{ jornada, ...validacion.datos }] : [];
  });
  const opciones: SeleccionJornada[] = disponibles.map((d) => d.jornada);
  if (disponibles.length === IDS_JORNADA.length) opciones.push("ambas");

  const pedida = esquemaSeleccionJornada.safeParse(valor);
  const seleccion =
    pedida.success && opciones.includes(pedida.data)
      ? pedida.data
      : opciones.includes(jornadaSesion)
        ? jornadaSesion
        : undefined;
  if (seleccion === undefined) return { ok: false, error: MENSAJES_VALIDACION.competencia };
  return {
    ok: true,
    datos: {
      seleccion,
      opciones,
      jornadas: seleccion === "ambas" ? disponibles : disponibles.filter((d) => d.jornada === seleccion),
    },
  };
}

const esquemaParticipantes = z.object({
  // The jornada the editor was loaded for; the route compares it with the session's.
  jornada: z.enum(IDS_JORNADA),
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
  // One carnet (or blank) per name, same order (PRD §5.10).
  carnets: z
    .array(
      z
        .string()
        .trim()
        .refine(esCarnetValido)
        .transform((t) => (t ? t : null)),
    )
    .max(CANTIDAD_MAXIMA_PARTICIPANTES),
  // One email (or blank) per name, same order (PRD §5.10, §5.14): trimmed,
  // lowercased, ≤ 254. Only for the results email.
  correos: z
    .array(
      z
        .string()
        .trim()
        .refine(esCorreoParticipanteValido)
        .transform((t) => (t ? t.toLowerCase() : null)),
    )
    .max(CANTIDAD_MAXIMA_PARTICIPANTES),
  confirmar: z.boolean().optional().default(false),
});

export type CuerpoParticipantes = z.input<typeof esquemaParticipantes>;
export type ParticipantesValidos = {
  jornada: JornadaId;
  nombres: (string | null)[];
  carnets: (string | null)[];
  correos: (string | null)[];
  confirmar: boolean;
};

/** The position (0-based) of the first carnet already used earlier in the list, or -1. */
export function indiceCarnetRepetido(carnets: readonly (string | null)[]): number {
  const vistos = new Set<string>();
  for (const [i, carnet] of carnets.entries()) {
    if (carnet === null) continue;
    const clave = carnet.toUpperCase();
    if (vistos.has(clave)) return i;
    vistos.add(clave);
  }
  return -1;
}

/** PUT /api/admin/participantes body: one name, one carnet and one email (each may be blank) per participant, in order. */
export function validarParticipantes(datos: unknown): Resultado<ParticipantesValidos> {
  const forma = esquemaParticipantes.safeParse(datos);
  if (!forma.success) {
    const ruta = forma.error.issues[0]?.path ?? [];
    if (ruta[0] === "cantidad") return { ok: false, error: MENSAJES_VALIDACION.cantidadParticipantes };
    if (ruta[0] === "nombres" && typeof ruta[1] === "number") {
      return { ok: false, error: MENSAJES_VALIDACION.nombreParticipante(ruta[1] + 1) };
    }
    if (ruta[0] === "carnets" && typeof ruta[1] === "number") {
      return { ok: false, error: MENSAJES_VALIDACION.carnetParticipante(ruta[1] + 1) };
    }
    if (ruta[0] === "correos" && typeof ruta[1] === "number") {
      return { ok: false, error: MENSAJES_VALIDACION.correoParticipante(ruta[1] + 1) };
    }
    return { ok: false, error: MENSAJES_VALIDACION.listaParticipantes };
  }
  const { jornada, cantidad, nombres, carnets, correos, confirmar } = forma.data;
  if (nombres.length !== cantidad || carnets.length !== cantidad || correos.length !== cantidad) {
    return { ok: false, error: MENSAJES_VALIDACION.listaParticipantes };
  }
  const repetido = indiceCarnetRepetido(carnets);
  if (repetido >= 0) return { ok: false, error: MENSAJES_VALIDACION.carnetRepetido(repetido + 1) };
  return { ok: true, datos: { jornada, nombres, carnets, correos, confirmar } };
}

const idParticipanteValido = z.string().trim().refine(esIdParticipante);

const esquemaEnvioResultados = z.union([
  z.object({
    participantes: z.array(idParticipanteValido).min(1).max(CANTIDAD_MAXIMA_PARTICIPANTES),
    reenviar: z.boolean().optional().default(false),
  }),
  // "Enviarme una prueba": one participant's email to an address the docente typed (never stored).
  z.object({ prueba: esquemaCorreo, participanteId: idParticipanteValido }),
]);

export type CuerpoEnvioResultados = z.input<typeof esquemaEnvioResultados>;
export type EnvioResultadosValido =
  | { tipo: "envio"; participantes: string[]; reenviar: boolean }
  | { tipo: "prueba"; para: string; participanteId: string };

/** POST /api/reportes/[competencia]/enviar body (PRD §10, §5.14). Scores never come from the client. */
export function validarEnvioResultados(datos: unknown): Resultado<EnvioResultadosValido> {
  const forma = esquemaEnvioResultados.safeParse(datos);
  if (!forma.success) {
    const conPrueba = typeof datos === "object" && datos !== null && "prueba" in datos;
    return { ok: false, error: conPrueba ? MENSAJES_VALIDACION.correoPrueba : MENSAJES_VALIDACION.envio };
  }
  return "prueba" in forma.data
    ? { ok: true, datos: { tipo: "prueba", para: forma.data.prueba, participanteId: forma.data.participanteId } }
    : { ok: true, datos: { tipo: "envio", participantes: forma.data.participantes, reenviar: forma.data.reenviar } };
}
