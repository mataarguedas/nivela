import { manejarSolicitudCodigo } from "@/lib/acceso";

// POST /api/acceso/correo { correo } → { paso: "contrasena" | "codigo" }
// (PRD §5.12 step 1, §10). An activated account goes on to its password; an
// account not activated yet gets a 6-digit code by email. An email outside
// the roster gets "codigo" too and nothing is sent, so the answer never
// tells whether an address is in the roster.

export async function POST(request: Request) {
  return manejarSolicitudCodigo(request, "correo", "/api/acceso/correo");
}
