"use client";

import { useId, useState, type ReactNode } from "react";
import { IconoChevron } from "./iconos";

// Disclosure: a link-style toggle (#0066cc) that shows or hides its panel.
// A <button aria-expanded> rather than <details>, so the look and the
// 44 px tap target are the same in Safari, Chrome and Firefox. The panel
// stays mounted while hidden, so its state (e.g. typed text) survives.
// Uncontrolled by default; pass `abierto` + `alCambiar` to control it (e.g.
// so only one of several panels is open at a time).

type DesplegableProps = {
  titulo: ReactNode;
  children: ReactNode;
  abiertoInicial?: boolean;
  /** Controlled open state; requires `alCambiar`. */
  abierto?: boolean;
  alCambiar?: (abierto: boolean) => void;
  className?: string;
};

export function Desplegable({
  titulo,
  children,
  abiertoInicial = false,
  abierto: abiertoControlado,
  alCambiar,
  className,
}: DesplegableProps) {
  const [abiertoLocal, setAbiertoLocal] = useState(abiertoInicial);
  const abierto = abiertoControlado ?? abiertoLocal;
  const idPanel = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => {
          if (abiertoControlado === undefined) setAbiertoLocal(!abierto);
          alCambiar?.(!abierto);
        }}
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
