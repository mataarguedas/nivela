import { TEXTOS } from "@/config/textos";
import { esperar, esquemaIngreso, responder, RETRASO_FALLO_MS } from "@/lib/acceso";
import { iniciarConContrasena } from "@/lib/cuentas";
import { getDb } from "@/lib/db";
import { registrarError } from "@/lib/registro";
import { respuestaConSesion, sesionDeIntegrante } from "@/lib/sesion";

// POST /api/acceso/contrasena { correo, contrasena } (PRD §5.12, §10). A
// wrong email or password always reads "Correo o contraseña incorrectos."
// (401); a locked account, "Demasiados intentos…" (429), and the 5th wrong
// password in a row is what locks it. Every failure waits ~400 ms. A
// success stamps the last access and signs the evaluador in.

const RUTA = "/api/acceso/contrasena";

export async function POST(request: Request) {
  const cuerpo = esquemaIngreso.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    await esperar(RETRASO_FALLO_MS);
    return responder({ error: TEXTOS.acceso.credenciales }, 400);
  }

  const inicio = Date.now();
  try {
    const resultado = await iniciarConContrasena(getDb(), cuerpo.data.correo, cuerpo.data.contrasena);
    const sesion = resultado.ok ? sesionDeIntegrante(resultado.integranteId) : null;
    if (!sesion) {
      await esperar(RETRASO_FALLO_MS);
      const bloqueada = !resultado.ok && resultado.motivo === "bloqueada";
      return bloqueada
        ? responder({ error: TEXTOS.acceso.bloqueada }, 429)
        : responder({ error: TEXTOS.acceso.credenciales }, 401);
    }
    return respuestaConSesion(sesion, { rol: sesion.rol });
  } catch (error) {
    registrarError(RUTA, "POST", inicio, error);
    return responder({ error: TEXTOS.acceso.sinConexion }, 500);
  }
}
