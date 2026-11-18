import { NextResponse } from "next/server";
import { z } from "zod";
import { TEXTOS } from "@/config/textos";
import { esperar, RETRASO_FALLO_MS } from "@/lib/acceso";
import { accesoParaCodigo, respuestaConSesion } from "@/lib/sesion";

// POST /api/acceso (PRD §5.1, §10): verify a docente or admin code, set the
// session cookie, return { rol }. Evaluadores sign in with email + password
// (/api/acceso/*). Every failure waits ~400 ms to slow down guessing.

// Runs on Node.js, the default. CLAUDE.md asks for `export const runtime = "nodejs"`,
// but Next 16 rejects any `runtime` export while cacheComponents is on.

const esquemaCuerpo = z.object({
  codigo: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  const cuerpo = esquemaCuerpo.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    await esperar(RETRASO_FALLO_MS);
    return NextResponse.json({ error: TEXTOS.acceso.codigoRequerido }, { status: 400 });
  }

  const acceso = accesoParaCodigo(cuerpo.data.codigo);
  if (!acceso) {
    await esperar(RETRASO_FALLO_MS);
    return NextResponse.json({ error: TEXTOS.acceso.error }, { status: 401 });
  }

  return respuestaConSesion(acceso, { rol: acceso.rol });
}
