import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarIntegrante } from "@/config/equipos";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_CUENTAS } from "@/config/textosAdmin";
import { cuentaAdmin, listarCuentasJornada } from "@/lib/cuentas";
import { getDb } from "@/lib/db";
import { cambiarCorreo, cuentaPorCorreo, cuentaPorId, restablecerAcceso } from "@/lib/db/cuentas";
import { registrarError } from "@/lib/registro";
import { getSesion, type Sesion } from "@/lib/sesion";
import { esquemaCorreo } from "@/lib/validacion";

// /api/admin/cuentas (PRD §5.12, §10): the admin's "Cuentas de evaluadores",
// for the session's jornada only. GET lists the jornada's members with their
// account; PUT { integranteId, correo } sets or clears an email (a new email
// returns the account to "Pendiente de activar"); PUT { integranteId,
// restablecer: true } clears the password. Admin only, re-checked here.
// Emails never reach a log line.

const RUTA = "/api/admin/cuentas";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

async function sesionAdmin(): Promise<Sesion | Response> {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol !== "admin") return responder({ error: TEXTOS.sesion.soloAdmin }, 403);
  return sesion;
}

export async function GET() {
  const sesion = await sesionAdmin();
  if (sesion instanceof Response) return sesion;
  const inicio = Date.now();
  try {
    return responder({ grupos: await listarCuentasJornada(getDb(), sesion.jornada) });
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responder({ error: TEXTOS_CUENTAS.errorCarga }, 500);
  }
}

const integranteId = z.string().min(1).max(100);
const esquemaCambio = z.union([
  z.object({ integranteId, restablecer: z.literal(true) }).strict(),
  z
    .object({
      integranteId,
      // Empty clears the email ("Sin correo").
      correo: z.union([z.literal("").transform(() => null), esquemaCorreo]),
    })
    .strict(),
]);

const VIOLACION_UNICA = "23505";

export async function PUT(request: Request) {
  const sesion = await sesionAdmin();
  if (sesion instanceof Response) return sesion;

  const cuerpo = esquemaCambio.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    const correoMalo = cuerpo.error.issues.some((i) => i.path[0] === "correo");
    return responder({ error: correoMalo ? TEXTOS_CUENTAS.correoInvalido : TEXTOS_CUENTAS.datosInvalidos }, 400);
  }
  const cambio = cuerpo.data;
  const encontrado = buscarIntegrante(cambio.integranteId);
  if (!encontrado || encontrado.equipo.jornada !== sesion.jornada) {
    return responder({ error: TEXTOS_CUENTAS.integranteInvalido }, 400);
  }

  const db = getDb();
  const inicio = Date.now();
  try {
    if ("restablecer" in cambio) {
      await restablecerAcceso(db, cambio.integranteId);
    } else {
      const otra = cambio.correo ? await cuentaPorCorreo(db, cambio.correo) : undefined;
      if (otra && otra.integranteId !== cambio.integranteId) {
        return responder({ error: TEXTOS_CUENTAS.correoEnUso }, 409);
      }
      await cambiarCorreo(db, cambio.integranteId, cambio.correo);
    }
    return responder({ cuenta: cuentaAdmin(encontrado.integrante, await cuentaPorId(db, cambio.integranteId)) });
  } catch (error) {
    if (codigoDe(error) === VIOLACION_UNICA) return responder({ error: TEXTOS_CUENTAS.correoEnUso }, 409);
    registrarError(RUTA, "PUT", inicio, error);
    return responder({ error: TEXTOS_CUENTAS.errorGuardar }, 500);
  }
}

function codigoDe(error: unknown): string | undefined {
  const leer = (valor: unknown) =>
    typeof valor === "object" && valor !== null && "code" in valor ? String(valor.code) : undefined;
  return leer(error) ?? (error instanceof Error ? leer(error.cause) : undefined);
}
