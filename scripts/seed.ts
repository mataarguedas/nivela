// Dev seed (CLAUDE.md → Commands, PRD §15.7): realistic fake evaluations for
// every Adaptabilidad evaluator × every participant, in every jornada that
// has a team for it, written through the same validation and upsert as POST
// /api/evaluaciones. Never run it against production.
//
//   npm run db:seed                # upsert the fake evaluations (idempotent)
//   npm run db:seed -- --limpiar   # TRUNCATE evaluaciones, calificaciones, uso_jev
//
// Run through `tsx --conditions=react-server` so the `server-only` guard in
// the db modules resolves to its no-op entry. Reproducible: a fixed PRNG seed
// gives the same data on every run.

for (const archivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(archivo);
  } catch {
    // File not present: fine.
  }
}

const COMPETENCIA_ID = "adaptabilidad";
const SEMILLA = 2026;
const CONCURRENCIA = 6;
const PROPORCION_IA = 0.25;
const PROPORCION_OBSERVACION = 0.4;
const MODELO = "jev-1.13.0";

// Hand-written observations per indicator number and level, matching the
// rubric in PRD Appendix A (plantilla.xlsx). No names, only observable
// behavior, as the rating screen asks.
const OBSERVACIONES: Record<number, Record<number, string[]>> = {
  // Indicador 1. Actúa de manera rápida y flexible.
  1: {
    1: [
      "Notó que la dinámica había cambiado, pero tardó en reaccionar y esperó instrucciones para continuar.",
      "Se dio cuenta del cambio de consigna, aunque no actuó hasta que la facilitadora le indicó qué hacer.",
    ],
    2: [
      "Ante un cambio sencillo en la consigna, respondió siguiendo las indicaciones que se le dieron.",
      "Ajustó su parte del ejercicio cuando cambió el formato, apoyándose en las instrucciones recibidas.",
    ],
    3: [
      "Cuando cambió el orden de la actividad, siguió avanzando con sus tareas sin detenerse.",
      "Afrontó el cambio de grupo a mitad del ejercicio y mantuvo el ritmo de su trabajo.",
    ],
    4: [
      "Ante un imprevisto difícil que nadie esperaba, reaccionó de inmediato y entregó un trabajo de calidad.",
      "Asumió con rapidez una situación inesperada de presión y mantuvo un buen desempeño hasta el final.",
    ],
  },
  // Indicador 2. Modifica su forma de actuar ante cambios.
  2: {
    1: [
      "Siguió trabajando con el método anterior hasta que alguien le indicó el nuevo procedimiento.",
      "Mantuvo su forma habitual de organizar el material pese al cambio, hasta recibir instrucciones.",
    ],
    2: [
      "Aceptó la nueva manera de completar el registro siguiendo las indicaciones de la facilitadora.",
      "Hizo la tarea con el nuevo formato tal como se le explicó, sin proponer cambios.",
    ],
    3: [
      "Cambió su forma de trabajar con el nuevo procedimiento y lo aplicó en todas las entregas sin supervisión.",
      "Adoptó el procedimiento nuevo desde el inicio y lo siguió de forma constante sin que nadie lo revisara.",
    ],
    4: [
      "Adaptó su método a los tres escenarios del ejercicio y en todos mantuvo la calidad del resultado.",
      "Ajustó su forma de trabajar cuando cambió el caso, y el resultado conservó el mismo nivel de calidad.",
    ],
  },
  // Indicador 3. Ajusta las prioridades ante las demandas del entorno.
  3: {
    1: [
      "Siguió el orden de tareas original aunque se anunció una entrega más urgente.",
      "Continuó con la tarea que había empezado, sin atender la nueva prioridad indicada al grupo.",
    ],
    2: [
      "Reordenó sus tareas en cuanto la facilitadora le dijo cuál debía atender primero.",
      "Cambió el orden de su trabajo después de que el grupo le señaló lo más urgente.",
    ],
    3: [
      "Atendió primero la entrega más urgente por decisión propia, sin que nadie se lo indicara.",
      "Organizó sus tareas según su urgencia e importancia y las completó sin supervisión.",
    ],
    4: [
      "Con tres actividades al mismo tiempo, definió el orden por urgencia e importancia y cumplió con todas.",
      "Cuando surgieron varias solicitudes a la vez, priorizó con criterio y no descuidó ninguna.",
    ],
  },
  // Indicador 4. Propone soluciones eficaces ante imprevistos o exigencias, actuando con iniciativa.
  4: {
    1: [
      "Avisó al grupo que faltaba un material y pidió ayuda para resolverlo.",
      "Comunicó el imprevisto a la facilitadora y esperó apoyo para solucionarlo.",
    ],
    2: [
      "Con la guía de una compañera, propuso usar otra hoja para reemplazar la que faltaba.",
      "Planteó una alternativa sencilla después de recibir orientación de la facilitadora.",
    ],
    3: [
      "Por iniciativa propia propuso dividir el trabajo de otra forma y lo puso en práctica de inmediato.",
      "Sugirió una solución viable al problema del tiempo y la aplicó sin esperar instrucciones.",
    ],
    4: [
      "Comparó opciones, aplicó la solución más eficaz y verificó con el grupo que el problema quedó resuelto.",
      "Implementó la mejor alternativa ante el imprevisto y comprobó al final que todo funcionaba.",
    ],
  },
};

/** mulberry32: small, fast, reproducible PRNG. */
function generador(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const azar = generador(SEMILLA);
const entre = (min: number, max: number) => min + azar() * (max - min);
const elegir = <T>(opciones: readonly T[]): T => opciones[Math.floor(azar() * opciones.length)];
const nivelAcotado = (valor: number) => Math.min(4, Math.max(1, Math.round(valor))) as 1 | 2 | 3 | 4;
const redondear = (valor: number) => Math.round(valor * 100) / 100;

/** A peaked distribution over the 4 levels with its maximum at `nivel`, summing to exactly 1. */
function probabilidades(nivel: number): Record<string, number> {
  const pesos = [1, 2, 3, 4].map((n) => (n === nivel ? entre(5, 12) : Math.max(0.05, 1.6 - Math.abs(n - nivel)) * entre(0.3, 1)));
  const total = pesos.reduce((s, p) => s + p, 0);
  const redondeadas = pesos.map((p) => redondear(p / total));
  // Put the rounding remainder on the top level so the sum is exactly 1.
  redondeadas[nivel - 1] = redondear(redondeadas[nivel - 1] + 1 - redondeadas.reduce((s, p) => s + p, 0));
  return Object.fromEntries(redondeadas.map((p, i) => [String(i + 1), p]));
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error("Refusing to seed: NODE_ENV or VERCEL_ENV is production.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (see .env.example).");
    process.exit(1);
  }

  // Imported after the env files load: the db modules read DATABASE_URL.
  const { sql } = await import("drizzle-orm");
  const { obtenerCompetenciaHabilitada } = await import("@/config/competencias");
  const { equipoDeCompetencia } = await import("@/config/equipos");
  const { JORNADAS } = await import("@/config/jornadas");
  const { getDb } = await import("@/lib/db");
  const { guardarEvaluacion } = await import("@/lib/db/evaluaciones");
  const { obtenerParticipantes } = await import("@/lib/db/participantes");
  const { validarEvaluacion } = await import("@/lib/validacion");

  console.log(`Base de datos: ${new URL(process.env.DATABASE_URL).host}`);

  if (process.argv.includes("--limpiar")) {
    await getDb().execute(sql`truncate table evaluaciones, calificaciones, uso_jev`);
    console.log("Tablas vaciadas: evaluaciones, calificaciones, uso_jev.");
    return;
  }

  const competencia = obtenerCompetenciaHabilitada(COMPETENCIA_ID);
  if (!competencia) throw new Error(`${COMPETENCIA_ID} is not enabled`);

  for (const { id: jornada } of JORNADAS) {
    const equipo = equipoDeCompetencia(jornada, COMPETENCIA_ID);
    if (!equipo) {
      console.log(`Jornada ${jornada}: sin equipo para ${COMPETENCIA_ID}; se omite.`);
      continue;
    }
    // The admin's list for the jornada if one was saved; otherwise the unnamed fallback.
    const PARTICIPANTES = await obtenerParticipantes(jornada);

    // Each participant has a "true" level per indicator; each evaluator is a bit
    // stricter or more lenient; every rating adds its own noise.
    const base = new Map(
      PARTICIPANTES.map((p) => {
        const aptitud = entre(1.2, 3.9);
        return [p.id, competencia.indicadores.map(() => aptitud + entre(-0.6, 0.6))];
      }),
    );
    const severidad = new Map(equipo.integrantes.map((i) => [i.id, entre(-0.4, 0.4)]));

    const pendientes = equipo.integrantes.flatMap((evaluador) =>
      PARTICIPANTES.map((participante) => {
        const calificaciones = competencia.indicadores.map((indicador, i) => {
          const nivel = nivelAcotado(base.get(participante.id)![i] + severidad.get(evaluador.id)! + entre(-0.7, 0.7));
          const observacion = azar() < PROPORCION_OBSERVACION ? elegir(OBSERVACIONES[indicador.numero][nivel]) : null;
          if (azar() >= PROPORCION_IA) return { indicadorId: indicador.id, nivel, observacion, origen: "manual" as const };

          // Usually the evaluator applied the suggestion; sometimes they then
          // picked an adjacent level by hand (origen manual, metadata kept).
          const corregida = azar() < 0.2;
          const nivelSugerido = corregida ? nivelAcotado(nivel + (nivel === 4 ? -1 : 1)) : nivel;
          const p = probabilidades(nivelSugerido);
          return {
            indicadorId: indicador.id,
            nivel,
            observacion,
            origen: corregida ? ("manual" as const) : ("ia" as const),
            ia: { nivelSugerido, probabilidades: p, confianza: redondear(p[String(nivelSugerido)] * entre(0.85, 0.98)), modelo: MODELO },
          };
        });
        const resultado = validarEvaluacion(
          {
            competenciaId: competencia.id,
            evaluadorId: evaluador.id,
            participanteId: participante.id,
            calificaciones,
          },
          PARTICIPANTES,
          jornada,
        );
        if (!resultado.ok) throw new Error(`Invalid seed data for ${evaluador.id}/${participante.id}: ${resultado.error}`);
        return resultado.datos;
      }),
    );

    let guardadas = 0;
    async function trabajador() {
      for (let evaluacion = pendientes.shift(); evaluacion; evaluacion = pendientes.shift()) {
        await guardarEvaluacion(jornada, evaluacion);
        guardadas += 1;
      }
    }
    const total = pendientes.length;
    await Promise.all(Array.from({ length: CONCURRENCIA }, trabajador));
    console.log(
      `Jornada ${jornada}: ${guardadas} de ${total} evaluaciones (${equipo.integrantes.length} evaluadores × ${PARTICIPANTES.length} participantes).`,
    );
  }
}

main().catch((error: unknown) => {
  // The data is fake, so the full message (it embeds query parameters) is fine here.
  console.error("Seed failed:", error);
  process.exit(1);
});
