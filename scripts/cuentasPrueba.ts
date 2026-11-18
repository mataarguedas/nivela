import { inArray, sql } from "drizzle-orm";
import { EQUIPOS } from "@/config/equipos";
import { hashContrasena } from "@/lib/cuentas";
import type { Bd } from "@/lib/db/cuentas";
import { codigosVerificacion, cuentas } from "@/lib/db/schema";
import { correoDePrueba } from "../tests/e2e/cuentas";

// Resets every config member's account to a fake one (dev and e2e only,
// PRD §5.12): `<integranteId>@ejemplo.test`, activated with `contrasena`,
// no failures, no lock, no codes. `pendientes` stay "Pendiente de activar".
// Real emails in the dev DB are overwritten: tests never use them.

export async function prepararCuentasPrueba(db: Bd, contrasena: string, pendientes: readonly string[]) {
  const hash = await hashContrasena(contrasena);
  const ahora = new Date();
  const ids = EQUIPOS.flatMap((e) => e.integrantes.map((i) => i.id));
  const filas = ids.map((integranteId) => {
    const pendiente = pendientes.includes(integranteId);
    return {
      integranteId,
      correo: correoDePrueba(integranteId),
      contrasenaHash: pendiente ? null : hash,
      activadaEn: pendiente ? null : ahora,
      ultimoAcceso: null,
      intentosFallidos: 0,
      bloqueadaHasta: null,
    };
  });
  await db.delete(codigosVerificacion).where(inArray(codigosVerificacion.integranteId, ids));
  await db
    .insert(cuentas)
    .values(filas)
    .onConflictDoUpdate({
      target: cuentas.integranteId,
      set: {
        correo: sql`excluded.correo`,
        contrasenaHash: sql`excluded.contrasena_hash`,
        activadaEn: sql`excluded.activada_en`,
        ultimoAcceso: null,
        intentosFallidos: 0,
        bloqueadaHasta: null,
        updatedAt: sql`now()`,
      },
    });
  return { total: filas.length, pendientes: filas.filter((f) => f.contrasenaHash === null).length };
}
