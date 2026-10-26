import { sql } from "drizzle-orm";
import {
  check,
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

// Database schema, exactly PRD §9.2. Ids reference src/config; no names are
// ever stored here. Changes go through `npm run db:generate` (drizzle/).

export const evaluaciones = pgTable(
  "evaluaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competenciaId: text("competencia_id").notNull(),
    evaluadorId: text("evaluador_id").notNull(),
    participanteId: text("participante_id").notNull(),
    /** Mean of the 4 levels, from puntajes.ts. */
    puntaje: numeric("puntaje", { precision: 3, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.competenciaId, t.evaluadorId, t.participanteId)],
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
