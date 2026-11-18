import type { CuerpoAsistencia } from "@/lib/validacion";

// Client side of "Marcar ausente" / "Marcar presente" (PRD §5.13). Types
// only from validacion.ts so zod stays out of the rating page's bundle.
// Attendance is never stored offline: a failure leaves the mark unchanged
// and the screen says so.

export type RespuestaAsistencia =
  | { ok: true; ausente: boolean }
  /** 0 = network failure; 409 = already sent; 401 = session expired. */
  | { ok: false; status: number };

/** PUT /api/asistencia. Never throws. */
export async function guardarAsistencia(cuerpo: CuerpoAsistencia): Promise<RespuestaAsistencia> {
  try {
    const respuesta = await fetch("/api/asistencia", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
    if (!respuesta.ok) return { ok: false, status: respuesta.status };
    const datos: unknown = await respuesta.json();
    if (typeof datos === "object" && datos !== null && "ausente" in datos && typeof datos.ausente === "boolean") {
      return { ok: true, ausente: datos.ausente };
    }
    return { ok: false, status: respuesta.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
