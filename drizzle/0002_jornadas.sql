-- Jornadas (PRD §9.2, v1.1). Hand-edited from drizzle-kit's output: existing
-- rows are the morning cohort, so the columns are added with a default that
-- backfills them, then the default is dropped so every insert names its
-- jornada. The participantes PK was declared inline in 0001, so Postgres
-- named it "participantes_pkey".
ALTER TABLE "evaluaciones" ADD COLUMN "jornada" text DEFAULT 'manana' NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluaciones" ALTER COLUMN "jornada" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "jornada" text DEFAULT 'manana' NOT NULL;--> statement-breakpoint
ALTER TABLE "participantes" ALTER COLUMN "jornada" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "evaluaciones" DROP CONSTRAINT "evaluaciones_competencia_id_evaluador_id_participante_id_unique";--> statement-breakpoint
ALTER TABLE "participantes" DROP CONSTRAINT "participantes_numero_unique";--> statement-breakpoint
ALTER TABLE "participantes" DROP CONSTRAINT "participantes_pkey";--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_jornada_id_pk" PRIMARY KEY("jornada","id");--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_jornada_competencia_id_evaluador_id_participante_id_unique" UNIQUE("jornada","competencia_id","evaluador_id","participante_id");--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_jornada_numero_unique" UNIQUE("jornada","numero");--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_jornada_check" CHECK ("evaluaciones"."jornada" in ('manana', 'noche'));--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_jornada_check" CHECK ("participantes"."jornada" in ('manana', 'noche'));
