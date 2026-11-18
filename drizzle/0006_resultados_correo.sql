CREATE TABLE "envios_resultados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jornada" text NOT NULL,
	"competencia_id" text NOT NULL,
	"participante_id" text NOT NULL,
	"estado" text NOT NULL,
	"motivo" text,
	"enviado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "envios_resultados_jornada_check" CHECK ("envios_resultados"."jornada" in ('manana', 'noche')),
	CONSTRAINT "envios_resultados_estado_check" CHECK ("envios_resultados"."estado" in ('enviado', 'error'))
);
--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "correo" text;--> statement-breakpoint
CREATE INDEX "envios_resultados_participante_idx" ON "envios_resultados" USING btree ("jornada","competencia_id","participante_id");