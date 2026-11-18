// Jev golden set (PRD §8.5, FR-17): runs the hand-written fixtures through
// the same logic as POST /api/jev (sugerirNivel) against the live API and
// prints accuracy. One fixture file per rubric (jornada + competencia,
// scripts/fixtures/jev-*.json). Exits 1 if any rubric is below the targets:
// ≥ 75 % exact, ≥ 95 % within ±1 level. Pertinence is reported (off-topic
// texts should score < 0.5) but doesn't gate the exit code.
//
//   npm run jev:evaluar                                   # every fixture file
//   npm run jev:evaluar -- --competencia orientacion-detalle
//
// Sends only the fixture texts and the rubric from config, with
// TYPESAFE_API_KEY and JEV_MODEL from .env.local / .env. Run through
// `tsx --conditions=react-server` so the `server-only` guard resolves.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

for (const archivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(archivo);
  } catch {
    // File not present: fine.
  }
}

const OBJETIVO_EXACTO = 0.75;
const OBJETIVO_ADYACENTE = 0.95;
const CONCURRENCIA = 4;
const CARPETA_FIXTURES = "scripts/fixtures";

type Caso = { id: string; indicadorId: string; nivelEsperado?: number; texto: string };
/** `jornada` names the rubric the texts were written for; without it, the morning one. */
type Fixtures = { competenciaId: string; jornada?: string; casos: Caso[]; fueraDeTema: Caso[] };

function valorArgumento(nombre: string): string | undefined {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function main() {
  // Imported after the env files load, like seed.ts (participantes.ts reads env at import).
  const { obtenerCompetenciaHabilitada, obtenerIndicador } = await import("@/config/competencias");
  const { esJornada, JORNADA_PREDETERMINADA, nombreJornada } = await import("@/config/jornadas");
  const { obtenerNivel } = await import("@/config/niveles");
  const { sugerirNivel, UMBRAL_PERTINENCIA } = await import("@/lib/jev");
  type Resultado = Awaited<ReturnType<typeof sugerirNivel>>;

  if (!process.env.TYPESAFE_API_KEY) {
    console.error("TYPESAFE_API_KEY is not set (see .env.example).");
    process.exit(1);
  }

  const filtro = valorArgumento("--competencia");
  const archivos = readdirSync(CARPETA_FIXTURES)
    .filter((a) => /^jev-.+\.json$/.test(a))
    .sort()
    .map((a) => join(CARPETA_FIXTURES, a));
  const conjuntos = archivos
    .map((archivo) => JSON.parse(readFileSync(archivo, "utf8")) as Fixtures)
    .filter((f) => !filtro || f.competenciaId === filtro);
  if (conjuntos.length === 0) throw new Error(`No fixtures${filtro ? ` for ${filtro}` : ""} in ${CARPETA_FIXTURES}`);

  const veredictos: { nombre: string; aprobado: boolean }[] = [];
  for (const fixtures of conjuntos) {
    const jornada = fixtures.jornada ?? JORNADA_PREDETERMINADA;
    if (!esJornada(jornada)) throw new Error(`Unknown jornada in fixtures: ${jornada}`);
    const competencia = obtenerCompetenciaHabilitada(jornada, fixtures.competenciaId);
    if (!competencia) throw new Error(`No ${jornada} rubric for ${fixtures.competenciaId}`);
    const nombre = `${competencia.nombre} · ${nombreJornada(jornada)}`;
    veredictos.push({ nombre, aprobado: await evaluar(fixtures, competencia, nombre) });
  }

  if (veredictos.length > 1) {
    console.log("Resumen:");
    for (const v of veredictos) console.log(`  ${v.aprobado ? "APROBADO   " : "NO ALCANZA "} ${v.nombre}`);
    console.log("");
  }
  process.exit(veredictos.every((v) => v.aprobado) ? 0 : 1);

  async function evaluar(
    fixtures: Fixtures,
    competencia: NonNullable<ReturnType<typeof obtenerCompetenciaHabilitada>>,
    nombre: string,
  ): Promise<boolean> {
    const todos = [...fixtures.casos.map((c) => ({ ...c, fuera: false })), ...fixtures.fueraDeTema.map((c) => ({ ...c, fuera: true }))];
    const resultados = new Map<string, { resultado: Resultado; ms: number }>();

    // Small worker pool: CONCURRENCIA requests in flight at a time.
    let siguiente = 0;
    async function trabajador() {
      while (siguiente < todos.length) {
        const caso = todos[siguiente++];
        const indicador = obtenerIndicador(competencia!, caso.indicadorId);
        if (!indicador) throw new Error(`Unknown indicador: ${caso.indicadorId}`);
        const inicio = Date.now();
        const resultado = await sugerirNivel(competencia!, indicador, caso.texto);
        resultados.set(caso.id, { resultado, ms: Date.now() - inicio });
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCIA }, trabajador));

    const pct = (x: number) => `${Math.round(x * 100)} %`.padStart(5);
    const etiqueta = (n: number) => obtenerNivel(n as 1 | 2 | 3 | 4).etiqueta;

    let modelo = "";
    let exactos = 0;
    let adyacentes = 0;
    let errores = 0;
    let pertinentesOk = 0;
    let fueraOk = 0;
    const latencias: number[] = [];

    console.log(`\nJev golden set · ${nombre} · ${todos.length} textos\n`);
    console.log(
      ["id".padEnd(14), "esperado".padEnd(10), "sugerido".padEnd(10), "  P1    P2    P3    P4 ", "conf ", "pert ", "baja", "resultado"].join(" "),
    );

    for (const caso of todos) {
      const { resultado, ms } = resultados.get(caso.id)!;
      if (!resultado.ok) {
        errores += 1;
        console.log(`${caso.id.padEnd(14)} ERROR ${resultado.status}${resultado.statusJev ? ` (Jev ${resultado.statusJev})` : ""}`);
        continue;
      }
      latencias.push(ms);
      const s = resultado.sugerencia;
      modelo = s.modelo;
      const probs = ["1", "2", "3", "4"].map((k) => pct(s.probabilidades[k])).join(" ");
      const pertinente = s.pertinencia >= UMBRAL_PERTINENCIA;
      let veredicto: string;
      if (caso.fuera) {
        if (!pertinente) fueraOk += 1;
        veredicto = pertinente ? "✗ no detectado como fuera de tema" : "✓ fuera de tema";
      } else {
        const diferencia = Math.abs(s.nivelSugerido - caso.nivelEsperado!);
        if (diferencia === 0) exactos += 1;
        if (diferencia <= 1) adyacentes += 1;
        if (pertinente) pertinentesOk += 1;
        veredicto = diferencia === 0 ? "✓ exacto" : diferencia === 1 ? "~ ±1" : `✗ a ${diferencia} niveles`;
        if (!pertinente) veredicto += " · pertinencia baja";
      }
      console.log(
        [
          caso.id.padEnd(14),
          (caso.fuera ? "—" : etiqueta(caso.nivelEsperado!)).padEnd(10),
          etiqueta(s.nivelSugerido).padEnd(10),
          probs,
          s.confianza.toFixed(2),
          s.pertinencia.toFixed(2),
          (s.baja_confianza ? `sí→${etiqueta(s.alternativa ?? s.nivelSugerido).slice(0, 3)}` : "no").padEnd(6),
          veredicto,
        ].join(" "),
      );
    }

    const total = fixtures.casos.length;
    const tasaExacta = exactos / total;
    const tasaAdyacente = adyacentes / total;
    latencias.sort((a, b) => a - b);
    const p50 = latencias.length ? latencias[Math.floor(latencias.length / 2)] : 0;

    console.log(`\nModelo: ${modelo || "—"} · latencia p50 ${p50} ms · errores ${errores}`);
    console.log(`Exactos:        ${exactos}/${total} = ${pct(tasaExacta).trim()} (objetivo ≥ ${OBJETIVO_EXACTO * 100} %)`);
    console.log(`Dentro de ±1:   ${adyacentes}/${total} = ${pct(tasaAdyacente).trim()} (objetivo ≥ ${OBJETIVO_ADYACENTE * 100} %)`);
    console.log(`Pertinentes:    ${pertinentesOk}/${total} textos del indicador con pertinencia ≥ ${UMBRAL_PERTINENCIA}`);
    console.log(`Fuera de tema:  ${fueraOk}/${fixtures.fueraDeTema.length} con pertinencia < ${UMBRAL_PERTINENCIA}\n`);

    const aprobado = errores === 0 && tasaExacta >= OBJETIVO_EXACTO && tasaAdyacente >= OBJETIVO_ADYACENTE;
    console.log(aprobado ? "APROBADO\n" : "NO ALCANZA LOS OBJETIVOS (PRD §8.5)\n");
    return aprobado;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
