"use client";

import { useId, type KeyboardEvent } from "react";
import { NIVELES, type NivelValor } from "@/config/niveles";
import { IconoCheckCirculo, IconoCirculo } from "./iconos";

// Level picker (PRD §5.5, §12): an ARIA radiogroup of full-width rows, one per
// level, each with the level name and the indicator's full description.
// Custom radios rather than <input type="radio"> because Safari skips native
// radios when tabbing, and roving tabindex gives the same arrow-key behavior
// in every browser. Selected: 2 px #0066cc border, check icon, semibold name;
// never a blue fill (that's reserved for the primary button).

type SelectorNivelProps = {
  /** Description per level, typically an indicador's `niveles`. */
  descripciones: Record<NivelValor, string>;
  valor: NivelValor | null | undefined;
  alCambiar: (valor: NivelValor) => void;
  /** id of the visible heading that names the group (preferred). */
  etiquetadoPor?: string;
  /** Accessible name when there's no visible heading. */
  etiqueta?: string;
  deshabilitado?: boolean;
};

export function SelectorNivel({
  descripciones,
  valor,
  alCambiar,
  etiquetadoPor,
  etiqueta,
  deshabilitado = false,
}: SelectorNivelProps) {
  const base = useId();
  // Roving tabindex: the checked radio is the tab stop, else the first one.
  const indiceTabulable = Math.max(
    0,
    NIVELES.findIndex((n) => n.valor === valor),
  );

  function seleccionar(nuevo: NivelValor) {
    if (!deshabilitado && nuevo !== valor) alCambiar(nuevo);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>, indice: number) {
    if (deshabilitado) return;
    const total = NIVELES.length;
    let destino: number;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        destino = (indice + 1) % total;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        destino = (indice - 1 + total) % total;
        break;
      case "Home":
        destino = 0;
        break;
      case "End":
        destino = total - 1;
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        seleccionar(NIVELES[indice].valor);
        return;
      default:
        return;
    }
    e.preventDefault();
    const radios = e.currentTarget.closest("[role='radiogroup']")?.querySelectorAll<HTMLElement>("[role='radio']");
    radios?.[destino]?.focus();
    seleccionar(NIVELES[destino].valor);
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={etiquetadoPor}
      aria-label={etiquetadoPor ? undefined : etiqueta}
      aria-disabled={deshabilitado || undefined}
      className={`flex flex-col gap-3 ${deshabilitado ? "opacity-40" : ""}`}
    >
      {NIVELES.map((nivel, indice) => {
        const seleccionado = nivel.valor === valor;
        const idNombre = `${base}-${nivel.clave}`;
        const idDescripcion = `${idNombre}-descripcion`;
        return (
          <div
            key={nivel.valor}
            role="radio"
            aria-checked={seleccionado}
            aria-labelledby={idNombre}
            aria-describedby={idDescripcion}
            aria-disabled={deshabilitado || undefined}
            tabIndex={indice === indiceTabulable && !deshabilitado ? 0 : -1}
            onClick={() => seleccionar(nivel.valor)}
            onKeyDown={(e) => alTeclear(e, indice)}
            className={`flex w-full items-start gap-3 rounded-tile bg-surface text-left ${
              deshabilitado ? "cursor-not-allowed" : "cursor-pointer"
            } ${seleccionado ? "border-2 border-link p-[15px]" : "border border-hairline p-4"}`}
          >
            <span className="mt-px shrink-0">
              {seleccionado ? <IconoCheckCirculo className="text-link" /> : <IconoCirculo className="text-ink-2" />}
            </span>
            <span className="min-w-0 flex-1">
              <span id={idNombre} className={`block text-body text-ink ${seleccionado ? "font-semibold" : "font-normal"}`}>
                {nivel.etiqueta}
              </span>
              <span id={idDescripcion} className="mt-1 block text-body text-ink-3">
                {descripciones[nivel.valor]}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
