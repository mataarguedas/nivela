"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEXTOS } from "@/config/textos";
import { vaciarEscrituras } from "@/lib/borrador";
import { destinoVolver, type DestinoVolver } from "@/lib/volver";
import { IconoChevronIzquierda } from "./iconos";

// "Volver" at the far left of the nav (PRD §12 Nav). A link to the logical
// parent screen (src/lib/volver.ts), never history.back().
//
// It is a client component only because the nav lives in the root layout,
// which can't see a child route's params on the server: usePathname() gives
// the same path during SSR, so the link is in the server HTML and works
// before hydration.

export function BotonVolver({ href, etiqueta }: DestinoVolver) {
  return (
    <Link
      href={href}
      aria-label={TEXTOS.ui.volverA(etiqueta)}
      // Drafts are debounced 300 ms (lib/borrador.ts): write them before leaving.
      onClick={vaciarEscrituras}
      className="-ml-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-pill pr-2 pl-1 text-[14px] text-link hover:underline"
    >
      <IconoChevronIzquierda className="shrink-0" />
      {/* Measured: chevron + "Volver" + wordmark + "Reportes" + "Salir" fit from
          ~320 px (the evaluator's name truncates by design). Below 340 px the
          word goes first, kept for screen readers via the aria-label. */}
      <span className="max-[339px]:sr-only">{TEXTOS.ui.volver}</span>
    </Link>
  );
}

/** The nav's "Volver" for the current route, or nothing where there's no parent. */
export function VolverNav() {
  const destino = destinoVolver(usePathname() ?? "/");
  return destino ? <BotonVolver {...destino} /> : null;
}
