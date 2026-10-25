"use client";

import { useId, type ReactNode } from "react";
import { CampoTexto } from "@/components/ui/Campo";
import { Desplegable } from "@/components/ui/Desplegable";
import { SelectorNivel } from "@/components/ui/SelectorNivel";
import type { Indicador } from "@/config/competencias";
import { LARGO_MAXIMO_OBSERVACION } from "@/config/limites";
import type { NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import type { CalificacionBorrador } from "@/lib/borrador";

// One indicator on the rating screen (PRD §5.5): title, the 4 level options
// with their full descriptions, the optional observation and the collapsed
// "¿No está seguro del nivel?" panel. Purely presentational: the screen owns
// the draft and passes the current rating and change handlers.

type IndicadorSeccionProps = {
  indicador: Indicador;
  calificacion: CalificacionBorrador | undefined;
  alCambiarNivel: (nivel: NivelValor) => void;
  alCambiarObservacion: (texto: string) => void;
  /**
   * SLOT (M5, PRD §5.6): the Jev suggestion panel (PanelSugerencia) for this
   * indicator. Until it exists the panel says manual rating is the way.
   */
  panelSugerencia?: ReactNode;
};

export function IndicadorSeccion({
  indicador,
  calificacion,
  alCambiarNivel,
  alCambiarObservacion,
  panelSugerencia,
}: IndicadorSeccionProps) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-5">
      <h2 id={idTitulo} className="text-sub font-semibold text-ink">
        {TEXTOS.calificacion.indicador(indicador.numero)}. {indicador.titulo}
      </h2>

      <SelectorNivel
        descripciones={indicador.niveles}
        valor={calificacion?.nivel}
        alCambiar={alCambiarNivel}
        etiquetadoPor={idTitulo}
      />

      <CampoTexto
        etiqueta={TEXTOS.calificacion.observaciones}
        ayuda={TEXTOS.calificacion.ayudaObservaciones}
        maxLength={LARGO_MAXIMO_OBSERVACION}
        rows={3}
        value={calificacion?.observacion ?? ""}
        onChange={(e) => alCambiarObservacion(e.target.value)}
      />

      <Desplegable titulo={TEXTOS.ia.abrir} className="-mt-2">
        {panelSugerencia ?? <p className="text-[14px] text-ink-3">{TEXTOS.ia.proximamente}</p>}
      </Desplegable>
    </section>
  );
}
