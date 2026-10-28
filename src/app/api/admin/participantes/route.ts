import { NextResponse } from "next/server";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import { guardarParticipantes } from "@/lib/db/participantes";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { validarParticipantes } from "@/lib/validacion";

// PUT /api/admin/participantes (PRD §10): saves how many participants there
// are and their names, in order. Admin only; the session is re-verified here,
// not only in proxy.ts. Hiding participants that already have evaluations
// needs `confirmar: true`; without it the answer is 409 with the counts the
// confirmation dialog shows. Names are never logged.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/admin/participantes";
const SIN_CACHE = { "Cache-Control": "no-store" };

function responder(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export async function PUT(request: Request) {
  const sesion = await getSesion();
  if (!sesion) return responder({ error: TEXTOS.sesion.requerida }, 401);
  if (sesion.rol !== "admin") return responder({ error: TEXTOS.sesion.soloAdmin }, 403);

  const validacion = validarParticipantes(await request.json().catch(() => null));
  if (!validacion.ok) return responder({ error: validacion.error }, 400);
  const { nombres, confirmar } = validacion.datos;

  const inicio = Date.now();
  try {
    const resultado = await guardarParticipantes(nombres, confirmar);
    if (!resultado.ok) {
      return responder(
        {
          error: TEXTOS_ADMIN.confirmarDescripcion(resultado.ocultos, resultado.evaluacionesAfectadas),
          ocultos: resultado.ocultos,
          evaluacionesAfectadas: resultado.evaluacionesAfectadas,
        },
        409,
      );
    }
    return responder({ cantidad: resultado.participantes.length });
  } catch (error) {
    registrarError(RUTA, "PUT", inicio, error);
    return responder({ error: TEXTOS_ADMIN.errorGuardar }, 500);
  }
}
