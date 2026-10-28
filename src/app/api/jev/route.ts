import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { LIMITE_ANALISIS_POR_HORA, registrarUsoJev } from "@/lib/db/usoJev";
import { sugerirNivel } from "@/lib/jev";
import { getSesion } from "@/lib/sesion";
import { validarSolicitudJev } from "@/lib/validacion";

// POST /api/jev: the Jev proxy (PRD §8.3, §5.6). Both roles may use it; the
// session is re-verified here, not only in proxy.ts. Takes only
// { competenciaId, indicadorId, texto }; the rubric comes from config.
//
// Order: session → validation → per-session cap (uso_jev) → Jev. The cap is
// checked before calling Jev. If the cap can't be checked (database down) the
// request fails closed with 500, so an outage can't turn into unmetered use.
//
// Logging: only status, latency and model (plus Jev's own status on upstream
// errors). Never the observation text, the body or the session id.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200, encabezados: Record<string, string> = {}) {
  return NextResponse.json(cuerpo, { status, headers: { ...SIN_CACHE, ...encabezados } });
}

function registrar(datos: { status: number; ms: number; modelo?: string; statusJev?: number }) {
  const linea = JSON.stringify({ ruta: "/api/jev", ...datos });
  if (datos.status >= 500) console.error(linea);
  else console.info(linea);
}

export async function POST(request: Request) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol === "admin") return responder({ error: TEXTOS.sesion.noParaAdmin }, 403);

  const validacion = validarSolicitudJev(await request.json().catch(() => null));
  if (!validacion.ok) return responder({ error: validacion.error }, 400);
  const { competencia, indicador, texto } = validacion.datos;

  const inicio = Date.now();
  let uso;
  try {
    uso = await registrarUsoJev(sesion.sid);
  } catch {
    registrar({ status: 500, ms: Date.now() - inicio });
    return responder({ error: TEXTOS.ia.error }, 500);
  }
  if (uso.conteo > LIMITE_ANALISIS_POR_HORA) {
    registrar({ status: 429, ms: Date.now() - inicio });
    return responder({ error: TEXTOS.ia.limite }, 429, { "Retry-After": String(uso.segundosRestantes) });
  }

  const resultado = await sugerirNivel(competencia, indicador, texto);
  const ms = Date.now() - inicio;
  if (resultado.ok) {
    registrar({ status: 200, ms, modelo: resultado.sugerencia.modelo });
    return responder(resultado.sugerencia);
  }
  registrar({ status: resultado.status, ms, statusJev: resultado.statusJev });
  const encabezados: Record<string, string> =
    resultado.retryAfterS !== undefined ? { "Retry-After": String(resultado.retryAfterS) } : {};
  return responder({ error: resultado.error }, resultado.status, encabezados);
}
