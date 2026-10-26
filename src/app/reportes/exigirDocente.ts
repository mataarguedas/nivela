import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSesion } from "@/lib/sesion";

// Every report page re-checks the docente role itself instead of trusting
// proxy.ts alone. Call it inside the page's <Suspense> boundary: it reads the
// cookie. connection() keeps the JWT expiry check at request time (see
// components/ui/NavSesion.tsx).

export async function exigirDocente(siguiente: string): Promise<void> {
  await connection();
  const sesion = await getSesion();
  if (sesion?.rol !== "docente") {
    redirect(`/acceso?motivo=docente&next=${encodeURIComponent(siguiente)}`);
  }
}
