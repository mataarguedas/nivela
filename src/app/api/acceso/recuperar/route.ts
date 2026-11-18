import { manejarSolicitudCodigo } from "@/lib/acceso";

// POST /api/acceso/recuperar { correo } → { paso: "codigo" } (PRD §5.12
// "¿Olvidó su contraseña?", §10). Sends a code the evaluator uses at
// /api/acceso/activar to set a new password. Unknown emails get the same
// answer and nothing is sent.

export async function POST(request: Request) {
  return manejarSolicitudCodigo(request, "recuperar", "/api/acceso/recuperar");
}
