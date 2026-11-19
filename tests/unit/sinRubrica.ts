import { afterEach } from "vitest";
import { obtenerDefinicionCompetencia } from "@/config/competencias";
import type { JornadaId } from "@/config/jornadas";

// Since v1.7 every competencia has a rubric in both jornadas (PRD Appendix A),
// so config alone no longer has a "competencia without a rubric in this
// jornada". The code still handles it (a rubric that hasn't arrived yet), and
// these helpers keep that case covered: sinRubrica() removes one rubric for
// the rest of the current test, and it comes back after the test.

const restaurar: (() => void)[] = [];

afterEach(() => {
  while (restaurar.length > 0) restaurar.pop()!();
});

export function sinRubrica(jornada: JornadaId, competenciaId: string): void {
  const definicion = obtenerDefinicionCompetencia(competenciaId);
  if (!definicion) throw new Error(`Unknown competencia ${competenciaId}`);
  const rubrica = definicion.rubricas[jornada];
  delete definicion.rubricas[jornada];
  restaurar.push(() => {
    definicion.rubricas[jornada] = rubrica;
  });
}
