import { obtenerNivel } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal } from "@/lib/formato";
import type { Brecha } from "@/lib/puntajes";

// The gap to the next level in words (PRD §7, Appendix C "Brecha"), shared
// by the reports and, later, the results email (§5.14). Pure: the number
// comes from brechaSiguienteNivel(), never recomputed here.

/** "Le faltan 0,66 puntos para Experto" or "Nivel máximo alcanzado". */
export function textoBrecha(brecha: Brecha): string {
  if (brecha.siguiente === null || brecha.faltante === null) return TEXTOS_REPORTES.nivelMaximo;
  return TEXTOS_REPORTES.brecha(formatearDecimal(brecha.faltante), obtenerNivel(brecha.siguiente).etiqueta);
}

/** Table cell: "0,66 para Experto" or "Nivel máximo alcanzado". */
export function textoBrechaCorto(brecha: Brecha): string {
  if (brecha.siguiente === null || brecha.faltante === null) return TEXTOS_REPORTES.nivelMaximo;
  return TEXTOS_REPORTES.brechaCorta(formatearDecimal(brecha.faltante), obtenerNivel(brecha.siguiente).etiqueta);
}
