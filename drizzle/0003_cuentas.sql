CREATE TABLE "codigos_verificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integrante_id" text NOT NULL,
	"proposito" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"intentos" smallint DEFAULT 0 NOT NULL,
	"usado_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codigos_verificacion_proposito_check" CHECK ("codigos_verificacion"."proposito" in ('activar', 'recuperar'))
);
--> statement-breakpoint
CREATE TABLE "cuentas" (
	"integrante_id" text PRIMARY KEY NOT NULL,
	"correo" text,
	"contrasena_hash" text,
	"activada_en" timestamp with time zone,
	"ultimo_acceso" timestamp with time zone,
	"intentos_fallidos" smallint DEFAULT 0 NOT NULL,
	"bloqueada_hasta" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuentas_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "codigos_verificacion" ADD CONSTRAINT "codigos_verificacion_integrante_id_cuentas_integrante_id_fk" FOREIGN KEY ("integrante_id") REFERENCES "public"."cuentas"("integrante_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_verificacion_integrante_idx" ON "codigos_verificacion" USING btree ("integrante_id","created_at");