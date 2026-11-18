import { inArray, sql } from "drizzle-orm";
import { EQUIPOS } from "@/config/equipos";
import { hashContrasena } from "@/lib/cuentas";
import type { Bd } from "@/lib/db/cuentas";
import { codigosVerificacion, cuentas, participantes } from "@/lib/db/schema";
import { DOMINIO_PRUEBA, SIN_CORREO_PRUEBA, correoDePrueba } from "../tests/e2e/cuentas";

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

/**
 * Fake participant emails (dev and e2e only, PRD §5.14): every stored
 * participant of both jornadas gets correoParticipantePrueba(jornada, numero),
 * except number SIN_CORREO_PRUEBA ("Sin correo"). A jornada whose list was
 * never saved has no rows, so its participants keep no email. Real emails in
 * the dev DB are overwritten: tests never use them.
 */
export async function prepararCorreosParticipantes(db: Bd): Promise<number> {
  // Same scheme as correoParticipantePrueba(), in SQL so one statement covers every row.
  const filas = await db
    .update(participantes)
    .set({
      correo: sql`case when ${participantes.numero} = ${SIN_CORREO_PRUEBA} then null
        else 'participante-' || lpad(${participantes.numero}::text, 2, '0') || '.' || ${participantes.jornada} || ${"@" + DOMINIO_PRUEBA} end`,
    })
    .returning({ numero: participantes.numero });
  return filas.length;
}
