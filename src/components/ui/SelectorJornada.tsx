"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type KeyboardEvent } from "react";
import { JORNADAS, type JornadaId } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import { IconoCheckCirculo } from "./iconos";

// Jornada switch for docente and admin (PRD §5.11): two pill radios, the
// same ARIA pattern as SelectorNivel (custom radios with roving tabindex, so
// Safari tabs to them). Selected: 2 px #0066cc border, check icon, semibold;
// never a blue fill (reserved for the primary button). Choosing one POSTs
// /api/jornada, which re-signs the session, then refreshes the server render.

export function SelectorJornada({ actual }: { actual: JornadaId }) {
  const router = useRouter();
  const idTitulo = useId();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState(false);

  async function elegir(jornada: JornadaId) {
    if (jornada === actual || pendiente) return;
    setError(false);
    try {
      const respuesta = await fetch("/api/jornada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jornada }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      iniciar(() => router.refresh());
    } catch {
      setError(true);
    }
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>, indice: number) {
    const total = JORNADAS.length;
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
        void elegir(JORNADAS[indice].id);
        return;
      default:
        return;
    }
    e.preventDefault();
    const radios = e.currentTarget.closest("[role='radiogroup']")?.querySelectorAll<HTMLElement>("[role='radio']");
    radios?.[destino]?.focus();
    void elegir(JORNADAS[destino].id);
  }

  return (
    <div className="flex flex-col items-center gap-2 print:hidden">
      <span id={idTitulo} className="text-[14px] text-ink-2">
        {TEXTOS.jornada.etiqueta}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={idTitulo}
        aria-busy={pendiente || undefined}
        className={`flex gap-2 ${pendiente ? "opacity-60" : ""}`}
      >
        {JORNADAS.map((jornada, indice) => {
          const seleccionada = jornada.id === actual;
          return (
            <div
              key={jornada.id}
              role="radio"
              aria-checked={seleccionada}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => void elegir(jornada.id)}
              onKeyDown={(e) => alTeclear(e, indice)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill bg-surface text-[14px] text-ink ${
                seleccionada ? "border-2 border-link px-[19px] font-semibold" : "border border-hairline px-5"
              }`}
            >
              {seleccionada && <IconoCheckCirculo className="size-4 shrink-0 text-link" />}
              {jornada.nombre}
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-caption text-ink">
          {TEXTOS.jornada.error}
        </p>
      )}
    </div>
  );
}
