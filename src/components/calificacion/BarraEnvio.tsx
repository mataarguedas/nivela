"use client";

import { BarraInferior } from "@/components/ui/BarraInferior";
import { Boton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";

// Sticky submit bar of the rating screen (PRD §5.5, §5.7, FR-6, §15.4). The
// primary "Enviar evaluación" is the page's only filled button; it stays
// disabled until every indicator has a level, with "Faltan N indicadores por
// calificar" beside it. The count is a polite live region so screen readers
// hear progress. After a failed send the same button reads "Reintentar" and
// the failure message is announced as an alert. Render it as the last child
// of <main> (see BarraInferior).

type BarraEnvioProps = {
  faltan: number;
  /** POST /api/evaluaciones (PRD §5.7). */
  alEnviar?: () => void;
  enviando?: boolean;
  /** The last send failed: show the message and offer "Reintentar". */
  error?: boolean;
};

export function BarraEnvio({ faltan, alEnviar, enviando = false, error = false }: BarraEnvioProps) {
  const completo = faltan === 0;
  const fallo = error && completo;
  return (
    <BarraInferior etiqueta={TEXTOS.calificacion.envio}>
      <div className="min-w-0 flex-1 text-[14px]">
        <p aria-live="polite" className="text-ink-3">
          {completo ? "" : TEXTOS.calificacion.faltan(faltan)}
        </p>
        <p role="alert" className="text-ink">
          {fallo && !enviando ? TEXTOS.envio.error : ""}
        </p>
      </div>
      <Boton onClick={alEnviar} disabled={!completo} cargando={enviando} textoCargando={TEXTOS.envio.enviando} className="shrink-0">
        {fallo ? TEXTOS.envio.reintentar : TEXTOS.calificacion.enviar}
      </Boton>
    </BarraInferior>
  );
}
