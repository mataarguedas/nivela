import "server-only";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { TEXTOS } from "@/config/textos";
import {
  LARGO_MAXIMO_CONTRASENA,
  LARGO_MINIMO_CONTRASENA,
  MINUTOS_CODIGO,
  solicitarCodigo,
  type CodigoPorEnviar,
} from "./cuentas";
import { getDb } from "./db";
import { registrarError } from "./registro";
import { enviarCorreo } from "./correo";
import { codigoVerificacion, PLANTILLA_CODIGO } from "./correos/codigoVerificacion";
import { esquemaCorreo } from "./validacion";

// Shared by the /api/acceso* routes (PRD §5.1, §5.12): the failure delay, the
// request schemas and sending a verification code after the response.

export const RETRASO_FALLO_MS = 400;

export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

export const esquemaSolicitud = z.object({ correo: esquemaCorreo });

export const esquemaContrasenaNueva = z.string().min(LARGO_MINIMO_CONTRASENA).max(LARGO_MAXIMO_CONTRASENA);

export const esquemaActivar = z.object({
  correo: esquemaCorreo,
  codigo: z.string().trim().regex(/^\d{6}$/),
  contrasena: esquemaContrasenaNueva,
});

export const esquemaIngreso = z.object({
  correo: esquemaCorreo,
  contrasena: z.string().min(1).max(LARGO_MAXIMO_CONTRASENA),
});

const SIN_CACHE = { "Cache-Control": "no-store" };

export function responder(cuerpo: unknown, status = 200): NextResponse {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

/**
 * /api/acceso/correo and /api/acceso/recuperar: validate { correo }, ask
 * lib/cuentas for a code, send it after the response. Same answer for
 * unknown emails, limits reached and real sends.
 */
export async function manejarSolicitudCodigo(
  request: Request,
  motivo: "correo" | "recuperar",
  ruta: string,
): Promise<NextResponse> {
  const cuerpo = esquemaSolicitud.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    await esperar(RETRASO_FALLO_MS);
    return responder({ error: TEXTOS.acceso.correoInvalido }, 400);
  }
  const inicio = Date.now();
  try {
    const { paso, envio } = await solicitarCodigo(getDb(), cuerpo.data.correo, motivo);
    enviarCodigoDespues(envio);
    return responder({ paso });
  } catch (error) {
    registrarError(ruta, "POST", inicio, error);
    return responder({ error: TEXTOS.acceso.sinConexion }, 500);
  }
}

/**
 * Emails the code once the response has gone out, so the response time is
 * the same whether or not anything is sent (no way to probe the roster).
 * enviarCorreo logs only the template name, status and latency; a failure
 * is swallowed here: the evaluator can ask for another code.
 */
export function enviarCodigoDespues(envio: CodigoPorEnviar | undefined): void {
  if (!envio) return;
  after(async () => {
    const plantilla = codigoVerificacion({ codigo: envio.codigo, minutos: MINUTOS_CODIGO });
    await enviarCorreo({ plantilla: PLANTILLA_CODIGO, para: envio.para, ...plantilla }).catch(() => undefined);
  });
}
