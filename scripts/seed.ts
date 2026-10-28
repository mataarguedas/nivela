// Dev seed (CLAUDE.md → Commands, PRD §15.7): realistic fake evaluations for
// every Adaptabilidad evaluator × every participant, written through the same
// validation and upsert as POST /api/evaluaciones. Never run it against
// production.
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

// Hand-written observations per indicator number and level. No names, only
// observable behavior, as the rating screen asks.
const OBSERVACIONES: Record<number, Record<number, string[]>> = {
  1: {
    1: [
      "Notó el cambio de procedimiento cuando se le explicó, pero necesitó que le recordaran cada paso.",
      "Siguió trabajando con el método anterior hasta que alguien lo corrigió.",
    ],
    2: [
      "Aplicó el nuevo procedimiento con una sola consulta al equipo.",
      "Adoptó el cambio, aunque pidió orientación en la segunda parte de la tarea.",
    ],
    3: [
      "Ajustó su forma de trabajar en cuanto recibió las nuevas instrucciones, sin ayuda.",
      "Reorganizó su método de trabajo por iniciativa propia al conocer el nuevo procedimiento.",
    ],
    4: [
      "Asumió el cambio de inmediato y explicó al resto del grupo cómo aplicar el nuevo procedimiento.",
      "Preparó un resumen del nuevo método para que sus compañeros lo adoptaran más rápido.",
    ],
  },
  2: {
    1: [
      "Se quedó detenido ante la situación nueva hasta que el grupo le indicó qué hacer.",
      "Reconoció que algo había cambiado, pero esperó ayuda para responder.",
    ],
    2: [
      "Puso en práctica las nuevas instrucciones con poca ayuda.",
      "Aceptó la instrucción nueva y la aplicó tras una breve aclaración.",
    ],
    3: [
      "Respondió con rapidez a la situación nueva siguiendo las indicaciones recibidas.",
      "Actuó en pocos minutos ante el imprevisto, conforme a lo indicado.",
    ],
    4: [
      "Resolvió con rapidez y buen criterio una situación compleja que el grupo no había previsto.",
      "Tomó decisiones acertadas en segundos cuando la dinámica cambió por completo.",
    ],
  },
  3: {
    1: [
      "Identificó que las actividades cambiaron, pero necesitó ayuda para reorganizarlas.",
      "Mantuvo el orden original de las tareas aunque las prioridades habían cambiado.",
    ],
    2: [
      "Reordenó sus tareas ante un cambio sencillo y cumplió parte de los objetivos.",
      "Ajustó algunas prioridades, aunque dejó pendiente un objetivo.",
    ],
    3: [
      "Reorganizó sus actividades por su cuenta y cumplió los objetivos establecidos.",
      "Planificó de nuevo el tiempo disponible y entregó todo lo acordado.",
    ],
    4: [
      "Reorganizó sus prioridades de forma proactiva y ayudó a otros a entender el nuevo orden.",
      "Propuso un nuevo plan de trabajo al equipo apenas cambiaron las prioridades.",
    ],
  },
  4: {
    1: [
      "Detectó el imprevisto, pero esperó a que otra persona propusiera la solución.",
      "Señaló el problema y dependió de las instrucciones del grupo para resolverlo.",
    ],
    2: [
      "Sugirió una alternativa sencilla después de recibir orientación.",
      "Propuso una solución básica al imprevisto con apoyo del grupo.",
    ],
    3: [
      "Anticipó un problema en la entrega y propuso una medida preventiva.",
      "Detectó un posible error antes de que ocurriera y planteó cómo evitarlo.",
    ],
    4: [
      "Se anticipó a varios imprevistos, propuso una solución innovadora y guió al equipo para aplicarla.",
      "Ayudó al grupo a resolver una situación inesperada con una propuesta original.",
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
  const equipo = equipoDeCompetencia(COMPETENCIA_ID);
  if (!competencia || !equipo) throw new Error(`${COMPETENCIA_ID} is not enabled or has no team`);
  // The admin's list if one was saved; otherwise the unnamed fallback.
  const PARTICIPANTES = await obtenerParticipantes();

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
      );
      if (!resultado.ok) throw new Error(`Invalid seed data for ${evaluador.id}/${participante.id}: ${resultado.error}`);
      return resultado.datos;
    }),
  );

  let guardadas = 0;
  async function trabajador() {
    for (let evaluacion = pendientes.shift(); evaluacion; evaluacion = pendientes.shift()) {
      await guardarEvaluacion(evaluacion);
      guardadas += 1;
    }
  }
  const total = pendientes.length;
  await Promise.all(Array.from({ length: CONCURRENCIA }, trabajador));
  console.log(
    `Listo: ${guardadas} de ${total} evaluaciones (${equipo.integrantes.length} evaluadores × ${PARTICIPANTES.length} participantes).`,
  );
}

main().catch((error: unknown) => {
  // The data is fake, so the full message (it embeds query parameters) is fine here.
  console.error("Seed failed:", error);
  process.exit(1);
});
