// Behavior levels shared by every competencia (PRD §9.1). Order matters:
// Jev's Score criteria and every chart rely on Básico → Experto.
export const NIVELES = [
  { valor: 1, clave: "basico", etiqueta: "Básico" },
  { valor: 2, clave: "intermedio", etiqueta: "Intermedio" },
  { valor: 3, clave: "avanzado", etiqueta: "Avanzado" },
  { valor: 4, clave: "experto", etiqueta: "Experto" },
] as const;

export type Nivel = (typeof NIVELES)[number];
export type NivelValor = Nivel["valor"];
export type NivelClave = Nivel["clave"];

export const VALORES_NIVEL: readonly NivelValor[] = NIVELES.map((n) => n.valor);

export function esNivelValor(valor: unknown): valor is NivelValor {
  return typeof valor === "number" && (VALORES_NIVEL as readonly number[]).includes(valor);
}

export function obtenerNivel(valor: NivelValor): Nivel {
  return NIVELES[valor - 1];
}
