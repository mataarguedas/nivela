"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Sticky bottom bar (PRD §5.5, §12). Place it as the LAST child of the page's
// <main>: being `sticky` (not `fixed`) it stays in the flow, so it never covers
// the last field once the user scrolls to the end. It pads for the home
// indicator with env(safe-area-inset-bottom). Frosted white separates it from
// the canvas without a border or shadow.
//
// Focus must never end up hidden behind it (WCAG 2.2 · 2.4.11). Chromium and
// Firefox honour `scroll-margin` when focus scrolls an element into view, but
// WebKit ignores it and leaves the element under the bar, so after each focus
// change the page scrolls just enough to clear the bar.

const HOLGURA_PX = 16;

type BarraInferiorProps = {
  children: ReactNode;
  /** Names the bar as a landmark for screen readers, e.g. "Envío". */
  etiqueta?: string;
};

export function BarraInferior({ children, etiqueta }: BarraInferiorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alEnfocar(evento: FocusEvent) {
      const objetivo = evento.target;
      if (!(objetivo instanceof Element) || ref.current?.contains(objetivo)) return;
      // After the browser's own focus scrolling has run.
      requestAnimationFrame(() => {
        const barra = ref.current;
        if (!barra) return;
        const tapado = objetivo.getBoundingClientRect().bottom - barra.getBoundingClientRect().top;
        if (tapado > 0) window.scrollBy({ top: tapado + HOLGURA_PX });
      });
    }
    document.addEventListener("focusin", alEnfocar);
    return () => document.removeEventListener("focusin", alEnfocar);
  }, []);

  return (
    <div
      ref={ref}
      role={etiqueta ? "region" : undefined}
      aria-label={etiqueta}
      className="esmerilado sticky bottom-0 z-30 mt-auto bg-white/80"
    >
      <div className="mx-auto flex min-h-11 max-w-[980px] items-center justify-between gap-3 pt-3 pr-[max(16px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))]">
        {children}
      </div>
    </div>
  );
}
