import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
// Relative: drizzle-kit loads this file without the "@/" alias.
import { IDS_JORNADA } from "../../config/jornadas";

// Database schema, exactly PRD §9.2. Ids reference src/config. The only names
// stored are the participants' (set by the admin); evaluator names stay in
// config. Changes go through `npm run db:generate` (drizzle/).
//
// `jornada` (src/config/jornadas.ts) scopes the cohort: participant ids
// P01…P99 repeat across jornadas, so every key that holds one includes it.

export const evaluaciones = pgTable(
  "evaluaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jornada: text("jornada", { enum: IDS_JORNADA }).notNull(),
    competenciaId: text("competencia_id").notNull(),
    evaluadorId: text("evaluador_id").notNull(),
    participanteId: text("participante_id").notNull(),
    /** Mean of the 4 levels, from puntajes.ts. */
    puntaje: numeric("puntaje", { precision: 3, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.jornada, t.competenciaId, t.evaluadorId, t.participanteId),
    check("evaluaciones_jornada_check", sql`${t.jornada} in ('manana', 'noche')`),
  ],
);

export const calificaciones = pgTable(
  "calificaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluacionId: uuid("evaluacion_id")
      .notNull()
      .references(() => evaluaciones.id, { onDelete: "cascade" }),
    indicadorId: text("indicador_id").notNull(),
    nivel: smallint("nivel").notNull(),
    /** Max 1000 chars, enforced by validacion.ts. */
    observacion: text("observacion"),
    origen: text("origen", { enum: ["manual", "ia"] }).notNull(),
    iaNivelSugerido: smallint("ia_nivel_sugerido"),
    iaProbabilidades: jsonb("ia_probabilidades").$type<Record<string, number>>(),
    iaConfianza: real("ia_confianza"),
    iaModelo: text("ia_modelo"),
  },
  (t) => [
    unique().on(t.evaluacionId, t.indicadorId),
    check("calificaciones_nivel_check", sql`${t.nivel} between 1 and 4`),
    check("calificaciones_origen_check", sql`${t.origen} in ('manual', 'ia')`),
  ],
);

export const usoJev = pgTable(
  "uso_jev",
  {
    sesionId: text("sesion_id").notNull(),
    /** Truncated to the hour. */
    ventana: timestamp("ventana", { withTimezone: true }).notNull(),
    conteo: integer("conteo").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sesionId, t.ventana] })],
);

/**
 * Evaluados, managed by the admin (PRD §9.2). Rows are never deleted: lowering
 * the count marks the rest `activo = false`, keeping their names and their
 * evaluations for when the count goes back up. Empty table → the config
 * fallback list (src/config/participantes.ts).
 */
export const participantes = pgTable(
  "participantes",
  {
    jornada: text("jornada", { enum: IDS_JORNADA }).notNull(),
    /** "P01".."P99" within the jornada, the id evaluaciones.participante_id refers to. */
    id: text("id").notNull(),
    numero: smallint("numero").notNull(),
    /** Null → "Participante NN". Max length enforced by validacion.ts. */
    nombre: text("nombre"),
    /** University carnet (PRD §5.10): the reports' label. Null → "Participante NN". PII, never logged. */
    carnet: text("carnet"),
    /**
     * v1.2 (PRD §5.14): where the participant's results are sent. Lowercased,
     * max 254, validated before writing. Null → "Sin correo". PII: never
     * logged, never in reports, the CSV or Jev requests.
     */
    correo: text("correo"),
    /** v1.8 (PRD §5.4): the COFI group from the distribution sheet, 1…20. Null → "Sin grupo". */
    grupo: smallint("grupo"),
    activo: boolean("activo").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.jornada, t.id] }),
    unique().on(t.jornada, t.numero),
    check("participantes_numero_check", sql`${t.numero} between 1 and 99`),
    check("participantes_jornada_check", sql`${t.jornada} in ('manana', 'noche')`),
    check("participantes_grupo_check", sql`${t.grupo} is null or ${t.grupo} between 1 and 20`),
  ],
);

/**
 * Evaluator accounts (PRD §5.12, v1.2): one row per config integrante that
 * has an email. No row, or a null `correo`, reads as "Sin correo"; a null
 * `contrasena_hash` as "Pendiente de activar". The integrante id implies the
 * jornada and the team (config); neither is stored.
 */
export const cuentas = pgTable("cuentas", {
  integranteId: text("integrante_id").primaryKey(),
  /** Lowercased, max 254 (validated before writing). Never logged. */
  correo: text("correo").unique(),
  /** scrypt with a per-account salt (lib/cuentas.ts). Null → not activated. */
  contrasenaHash: text("contrasena_hash"),
  activadaEn: timestamp("activada_en", { withTimezone: true }),
  ultimoAcceso: timestamp("ultimo_acceso", { withTimezone: true }),
  intentosFallidos: smallint("intentos_fallidos").notNull().default(0),
  bloqueadaHasta: timestamp("bloqueada_hasta", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Attendance marks (PRD §5.13, v1.2), per evaluator: "this evaluator didn't
 * see this participant". `ausente = false` is an undone mark ("Marcar
 * presente"); rows are updated, never deleted. Never stored offline.
 */
export const asistencia = pgTable(
  "asistencia",
  {
    jornada: text("jornada", { enum: IDS_JORNADA }).notNull(),
    competenciaId: text("competencia_id").notNull(),
    evaluadorId: text("evaluador_id").notNull(),
    participanteId: text("participante_id").notNull(),
    ausente: boolean("ausente").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.jornada, t.competenciaId, t.evaluadorId, t.participanteId] }),
    check("asistencia_jornada_check", sql`${t.jornada} in ('manana', 'noche')`),
  ],
);

/** 6-digit codes for activation and recovery (PRD §5.12). Only an HMAC of the code is stored. */
export const codigosVerificacion = pgTable(
  "codigos_verificacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integranteId: text("integrante_id")
      .notNull()
      .references(() => cuentas.integranteId, { onDelete: "cascade" }),
    proposito: text("proposito", { enum: ["activar", "recuperar"] }).notNull(),
    /** HMAC-SHA256 with SESSION_SECRET; never the code itself. */
    codigoHash: text("codigo_hash").notNull(),
    expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
    intentos: smallint("intentos").notNull().default(0),
    usadoEn: timestamp("usado_en", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("codigos_verificacion_proposito_check", sql`${t.proposito} in ('activar', 'recuperar')`),
    index("codigos_verificacion_integrante_idx").on(t.integranteId, t.createdAt),
  ],
);

/**
 * Results emails sent (PRD §5.14, v1.2): one row per attempt, so the last row
 * per participant is their status (Enviado / Error) and the number of earlier
 * "enviado" rows numbers a deliberate re-send. Never the address or the body.
 */
export const enviosResultados = pgTable(
  "envios_resultados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jornada: text("jornada", { enum: IDS_JORNADA }).notNull(),
    competenciaId: text("competencia_id").notNull(),
    participanteId: text("participante_id").notNull(),
    estado: text("estado", { enum: ["enviado", "error"] }).notNull(),
    /** Error category only (lib/correo.ts TipoErrorCorreo); null when sent. */
    motivo: text("motivo"),
    enviadoEn: timestamp("enviado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("envios_resultados_jornada_check", sql`${t.jornada} in ('manana', 'noche')`),
    check("envios_resultados_estado_check", sql`${t.estado} in ('enviado', 'error')`),
    index("envios_resultados_participante_idx").on(t.jornada, t.competenciaId, t.participanteId),
  ],
);
