import { obtenerCompetencia } from "../../src/config/competencias";
import { EQUIPOS, equipoDeCompetencia } from "../../src/config/equipos";
import type { JornadaId } from "../../src/config/jornadas";

// Fake evaluator accounts for e2e (PRD §5.12). `npm run cuentas:prueba`
// (run by the global setup) gives every config member the email
// `<integranteId>@ejemplo.test`, activated with E2E_CONTRASENA, except
// CUENTAS_PENDIENTES, which stay "Pendiente de activar" for the activation
// tests. Never real addresses.
//
// The specs that activate, lock or recover an account change its state, and
// the Playwright projects run in parallel, so each project gets its own
// members for those (cuentasDelProyecto). They come from teams whose
// competencia isn't enabled, so no other spec signs in as them.

export const DOMINIO_PRUEBA = "ejemplo.test";

export function correoDePrueba(integranteId: string): string {
  return `${integranteId}@${DOMINIO_PRUEBA}`;
}

/**
 * Fake participant emails (PRD §5.14) for the results-email specs:
 * `participante-07.manana@ejemplo.test`. `npm run cuentas:prueba` gives one
 * to every stored participant except number SIN_CORREO_PRUEBA, which stays
 * "Sin correo". Never real addresses.
 */
export function correoParticipantePrueba(jornada: JornadaId, numero: number): string {
  return `participante-${String(numero).padStart(2, "0")}.${jornada}@${DOMINIO_PRUEBA}`;
}

export const SIN_CORREO_PRUEBA = 2;

export function contrasenaDePrueba(): string {
  const valor = process.env.E2E_CONTRASENA;
  if (!valor || valor.length < 8) throw new Error("E2E_CONTRASENA is not set (8+ chars): add it to .env.local");
  return valor;
}

/** Must match the project names in playwright.config.ts. */
export const PROYECTOS = ["iPhone 13", "Pixel 7", "Firefox", "Desktop Chrome", "Admin"] as const;

const LIBRES = EQUIPOS.filter((e) => !obtenerCompetencia(e.jornada, e.competenciaId)?.habilitada).flatMap((e) =>
  e.integrantes.map((i) => i.id),
);

export type CuentasProyecto = { activar: string; recuperar: string; bloquear: string };

/** Three members only this project touches: one to activate, one to recover, one to lock. */
export function cuentasDelProyecto(proyecto: string): CuentasProyecto {
  const indice = PROYECTOS.indexOf(proyecto as (typeof PROYECTOS)[number]);
  if (indice < 0) throw new Error(`Unknown Playwright project: ${proyecto}`);
  const [activar, recuperar, bloquear] = LIBRES.slice(indice * 3, indice * 3 + 3);
  if (!bloquear) throw new Error("Not enough members outside enabled teams for the e2e accounts");
  return { activar, recuperar, bloquear };
}

/** An activated member of a team whose competencia isn't enabled, that no spec changes. */
export const CUENTA_OTRO_EQUIPO = LIBRES[LIBRES.length - 1];

/** Left "Pendiente de activar" by the reset. */
export const CUENTAS_PENDIENTES: readonly string[] = PROYECTOS.map((p) => cuentasDelProyecto(p).activar);

/** A member of the jornada's Adaptabilidad team (looked up by competencia, never by number). */
export function evaluadorAdaptabilidad(jornada: JornadaId, posicion = 0): string {
  const equipo = equipoDeCompetencia(jornada, "adaptabilidad");
  const integrante = equipo?.integrantes[posicion];
  if (!integrante) throw new Error(`No Adaptabilidad member #${posicion} in jornada ${jornada}`);
  return integrante.id;
}
