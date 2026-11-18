CREATE TABLE "asistencia" (
	"jornada" text NOT NULL,
	"competencia_id" text NOT NULL,
	"evaluador_id" text NOT NULL,
	"participante_id" text NOT NULL,
	"ausente" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asistencia_jornada_competencia_id_evaluador_id_participante_id_pk" PRIMARY KEY("jornada","competencia_id","evaluador_id","participante_id"),
	CONSTRAINT "asistencia_jornada_check" CHECK ("asistencia"."jornada" in ('manana', 'noche'))
);
