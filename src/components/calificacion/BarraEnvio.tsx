"use client";

import { BarraInferior } from "@/components/ui/BarraInferior";
import { Boton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";

// Sticky submit bar of the rating screen (PRD §5.5, FR-6, §15.4). The
// primary "Enviar evaluación" is the page's only filled button; it stays
// disabled until every indicator has a level, with "Faltan N indicadores por
// calificar" beside it. The count is a polite live region so screen readers
// hear progress. Render it as the last child of <main> (see BarraInferior).

type BarraEnvioProps = {
  faltan: number;
  /**
   * SLOT (M4, PRD §5.7): POST /api/evaluaciones. Until then the button
   * enables when complete but sending does nothing.
   */
  alEnviar?: () => void;
  enviando?: boolean;
};

export function BarraEnvio({ faltan, alEnviar, enviando = false }: BarraEnvioProps) {
  const completo = faltan === 0;
  return (
    <BarraInferior etiqueta={TEXTOS.calificacion.envio}>
      <p aria-live="polite" className="min-w-0 flex-1 text-[14px] text-ink-3">
        {completo ? "" : TEXTOS.calificacion.faltan(faltan)}
      </p>
      <Boton onClick={alEnviar} disabled={!completo} cargando={enviando} className="shrink-0">
        {TEXTOS.calificacion.enviar}
      </Boton>
    </BarraInferior>
  );
}
