"use client";

import { useId, useState, type ReactNode } from "react";
import { IconoChevron } from "./iconos";

// Disclosure: a link-style toggle (#0066cc) that shows or hides its panel.
// A <button aria-expanded> rather than <details>, so the look and the
// 44 px tap target are the same in Safari, Chrome and Firefox. The panel
// stays mounted while hidden, so its state (e.g. typed text) survives.

type DesplegableProps = {
  titulo: ReactNode;
  children: ReactNode;
  abiertoInicial?: boolean;
  className?: string;
};

export function Desplegable({ titulo, children, abiertoInicial = false, className }: DesplegableProps) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const idPanel = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((a) => !a)}
        className="-mx-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill px-1 text-left text-[14px] text-link hover:underline"
      >
        <IconoChevron className={`shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`} />
        {titulo}
      </button>
      <div id={idPanel} hidden={!abierto} className="pt-2">
        {children}
      </div>
    </div>
  );
}
