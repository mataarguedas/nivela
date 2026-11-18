"use client";

import { useId, type KeyboardEvent } from "react";
import { IconoCheckCirculo } from "./iconos";

// A labelled row of pill radios: the jornada switch (SelectorJornada) and the
// group summary's "Jornada" selector (PRD §5.11, §11.3) share it, so both
// look and behave the same. Same ARIA pattern as SelectorNivel: custom radios
// with a roving tabindex (so Safari tabs to them); arrows move and choose.
// Selected: 2 px #0066cc border, check icon, semibold; never a blue fill
// (reserved for the primary button). Hidden when printing.

export type OpcionPill<T extends string> = { id: T; nombre: string };

type Props<T extends string> = {
  etiqueta: string;
  opciones: readonly OpcionPill<T>[];
  actual: T;
  onElegir: (id: T) => void;
  /** A choice is being applied: the group dims and reports aria-busy. */
  ocupado?: boolean;
};

export function RadiosPill<T extends string>({ etiqueta, opciones, actual, onElegir, ocupado = false }: Props<T>) {
  const idTitulo = useId();

  function alTeclear(e: KeyboardEvent<HTMLDivElement>, indice: number) {
    const total = opciones.length;
    let destino: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        destino = (indice + 1) % total;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        destino = (indice - 1 + total) % total;
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        onElegir(opciones[indice].id);
        return;
      default:
        return;
    }
    e.preventDefault();
    const radios = e.currentTarget.closest("[role='radiogroup']")?.querySelectorAll<HTMLElement>("[role='radio']");
    radios?.[destino]?.focus();
    onElegir(opciones[destino].id);
  }

  return (
    <>
      <span id={idTitulo} className="text-[14px] text-ink-2">
        {etiqueta}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={idTitulo}
        aria-busy={ocupado || undefined}
        className={`flex flex-wrap justify-center gap-2 ${ocupado ? "opacity-60" : ""}`}
      >
        {opciones.map((opcion, indice) => {
          const seleccionada = opcion.id === actual;
          return (
            <div
              key={opcion.id}
              role="radio"
              aria-checked={seleccionada}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => onElegir(opcion.id)}
              onKeyDown={(e) => alTeclear(e, indice)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill bg-surface text-[14px] text-ink ${
                seleccionada ? "border-2 border-link px-[19px] font-semibold" : "border border-hairline px-5"
              }`}
            >
              {seleccionada && <IconoCheckCirculo className="size-4 shrink-0 text-link" />}
              {opcion.nombre}
            </div>
          );
        })}
      </div>
    </>
  );
}
