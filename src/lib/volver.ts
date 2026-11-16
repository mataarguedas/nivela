import { TEXTOS } from "@/config/textos";

// Where the nav's "Volver" goes (PRD §12 Nav): the logical parent screen,
// derived only from the path, never from the browser history. An installed
// PWA has no back button and its history can point outside the app.

export type DestinoVolver = { href: string; etiqueta: string };

/** Screens without "Volver": they are a top level for their role. */
const SIN_VOLVER = new Set(["acceso", "admin", "dev"]);

const INICIO: DestinoVolver = { href: "/", etiqueta: TEXTOS.ui.destinoInicio };

/**
 * The parent of `pathname`, or null where there is none (Inicio, /acceso,
 * /admin, dev pages, unknown shapes). Segments are reused as they come, so
 * an already-encoded path stays encoded.
 */
export function destinoVolver(pathname: string): DestinoVolver | null {
  const segmentos = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (segmentos.length === 0 || SIN_VOLVER.has(segmentos[0])) return null;

  if (segmentos[0] === "reportes") {
    const [, competencia, hijo, ...resto] = segmentos;
    if (resto.length > 0) return null;
    // /reportes/[c]/[p], /reportes/[c]/grupo and /reportes/[c]/enviar → Reporte general.
    if (hijo) return { href: `/reportes/${competencia}`, etiqueta: TEXTOS.reportes.general };
    if (competencia) return { href: "/reportes", etiqueta: TEXTOS.reportes.enlace };
    return INICIO;
  }

  const [competencia, hijo, ...resto] = segmentos;
  if (resto.length > 0) return null;
  // /[c]/evaluador and /[c] → Inicio; /[c]/[p] (rating) → the participant list.
  if (!hijo || hijo === "evaluador") return INICIO;
  return { href: `/${competencia}`, etiqueta: TEXTOS.lista.titulo };
}
