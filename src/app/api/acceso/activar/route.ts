import { TEXTOS } from "@/config/textos";
import { esperar, esquemaActivar, responder, RETRASO_FALLO_MS } from "@/lib/acceso";
import { activarConCodigo } from "@/lib/cuentas";
import { getDb } from "@/lib/db";
import { registrarError } from "@/lib/registro";
import { respuestaConSesion, sesionDeIntegrante } from "@/lib/sesion";

// POST /api/acceso/activar { correo, codigo, contrasena } (PRD §5.12, §10):
// first activation and password recovery. A valid code (the account's
// newest, unused, unexpired, with attempts left) sets the password and signs
// the evaluador in. Any other case reads "El código no es válido o expiró."
// after ~400 ms. Never logs the email, the code or the password.

const RUTA = "/api/acceso/activar";

export async function POST(request: Request) {
  const cuerpo = esquemaActivar.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    await esperar(RETRASO_FALLO_MS);
    const campos = new Set(cuerpo.error.issues.map((i) => i.path[0]));
    const error = campos.has("correo")
      ? TEXTOS.acceso.correoInvalido
      : campos.has("codigo")
        ? TEXTOS.acceso.codigoInvalido
        : TEXTOS.acceso.contrasenaCorta;
    return responder({ error }, 400);
  }

  const { correo, codigo, contrasena } = cuerpo.data;
  const inicio = Date.now();
  try {
    const resultado = await activarConCodigo(getDb(), correo, codigo, contrasena);
    const sesion = resultado.ok ? sesionDeIntegrante(resultado.integranteId) : null;
    if (!sesion) {
      await esperar(RETRASO_FALLO_MS);
      return responder({ error: TEXTOS.acceso.codigoInvalido }, 400);
    }
    return respuestaConSesion(sesion, { rol: sesion.rol });
  } catch (error) {
    registrarError(RUTA, "POST", inicio, error);
    return responder({ error: TEXTOS.acceso.sinConexion }, 500);
  }
}
