CREATE TABLE "participantes" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" smallint NOT NULL,
	"nombre" text,
	"activo" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participantes_numero_unique" UNIQUE("numero"),
	CONSTRAINT "participantes_numero_check" CHECK ("participantes"."numero" between 1 and 99)
);
