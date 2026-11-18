import { obtenerNivel } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearPuntos } from "@/lib/formato";
import type { Brecha } from "@/lib/puntajes";

// The gap to the next level in words (PRD §7, Appendix C "Brecha"), shared
// by the reports and, later, the results email (§5.14). Pure: the number
// comes from brechaSiguienteNivel(), never recomputed here.

/** "Le faltan 8 puntos para Experto", "Le falta 1 punto para Avanzado" or "Nivel máximo alcanzado". */
export function textoBrecha(brecha: Brecha): string {
  if (brecha.siguiente === null || brecha.faltante === null) return TEXTOS_REPORTES.nivelMaximo;
  return TEXTOS_REPORTES.brecha(formatearPuntos(brecha.faltante), obtenerNivel(brecha.siguiente).etiqueta);
}

/** Table cell: "8 para Experto" or "Nivel máximo alcanzado". */
export function textoBrechaCorto(brecha: Brecha): string {
  if (brecha.siguiente === null || brecha.faltante === null) return TEXTOS_REPORTES.nivelMaximo;
  return TEXTOS_REPORTES.brechaCorta(formatearPuntos(brecha.faltante), obtenerNivel(brecha.siguiente).etiqueta);
}
