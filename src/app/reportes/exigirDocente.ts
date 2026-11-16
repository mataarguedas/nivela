import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { JornadaId } from "@/config/jornadas";
import { getSesion } from "@/lib/sesion";

// Every report page re-checks the docente role itself instead of trusting
// proxy.ts alone. Call it inside the page's <Suspense> boundary: it reads the
// cookie. connection() keeps the JWT expiry check at request time (see
// components/ui/NavSesion.tsx). Returns the session's jornada, which every
// report is scoped to (PRD §5.11).

export async function exigirDocente(siguiente: string): Promise<JornadaId> {
  await connection();
  const sesion = await getSesion();
  if (sesion?.rol !== "docente") {
    redirect(`/acceso?motivo=docente&next=${encodeURIComponent(siguiente)}`);
  }
  return sesion.jornada;
}
