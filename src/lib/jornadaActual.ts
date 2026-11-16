import "server-only";
import { connection } from "next/server";
import { JORNADA_PREDETERMINADA, type JornadaId } from "@/config/jornadas";
import { getSesion } from "@/lib/sesion";

// The session's jornada for Server Components (PRD §5.11). Reads the cookie,
// so call it behind <Suspense>; connection() keeps the JWT expiry check at
// request time (see components/ui/NavSesion.tsx). Without a session proxy.ts
// has already redirected; the default only keeps the type simple.

export async function jornadaActual(): Promise<JornadaId> {
  await connection();
  const sesion = await getSesion();
  return sesion?.jornada ?? JORNADA_PREDETERMINADA;
}
