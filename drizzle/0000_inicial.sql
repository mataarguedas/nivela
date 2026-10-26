CREATE TABLE "calificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluacion_id" uuid NOT NULL,
	"indicador_id" text NOT NULL,
	"nivel" smallint NOT NULL,
	"observacion" text,
	"origen" text NOT NULL,
	"ia_nivel_sugerido" smallint,
	"ia_probabilidades" jsonb,
	"ia_confianza" real,
	"ia_modelo" text,
	CONSTRAINT "calificaciones_evaluacion_id_indicador_id_unique" UNIQUE("evaluacion_id","indicador_id"),
	CONSTRAINT "calificaciones_nivel_check" CHECK ("calificaciones"."nivel" between 1 and 4),
	CONSTRAINT "calificaciones_origen_check" CHECK ("calificaciones"."origen" in ('manual', 'ia'))
);
--> statement-breakpoint
CREATE TABLE "evaluaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competencia_id" text NOT NULL,
	"evaluador_id" text NOT NULL,
	"participante_id" text NOT NULL,
	"puntaje" numeric(3, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluaciones_competencia_id_evaluador_id_participante_id_unique" UNIQUE("competencia_id","evaluador_id","participante_id")
);
--> statement-breakpoint
CREATE TABLE "uso_jev" (
	"sesion_id" text NOT NULL,
	"ventana" timestamp with time zone NOT NULL,
	"conteo" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uso_jev_sesion_id_ventana_pk" PRIMARY KEY("sesion_id","ventana")
);
--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_evaluacion_id_evaluaciones_id_fk" FOREIGN KEY ("evaluacion_id") REFERENCES "public"."evaluaciones"("id") ON DELETE cascade ON UPDATE no action;