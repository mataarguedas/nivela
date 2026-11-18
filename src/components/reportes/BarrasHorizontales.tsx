import type { CSSProperties } from "react";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import type { Barra, Referencia } from "./datosGraficos";

// Simple horizontal bars (PRD §11 v1.2), drawn on the server in plain HTML:
// no chart library in the default view, nothing shifts while loading, and
// they print as they look. One bar per row, filled with its level color and
// labelled at the bar end; dashed threshold lines labelled with the level
// they open, drawn over the bars so the crossing shows (labels sit above
// them on a white backing). Every value is labelled, so there is no legend
// and no hover layer; the parent FiguraGrafico is aria-hidden around this
// drawing and carries a visually hidden table with the same values.
//
// Layout: on phones the row label sits above its bar, so the plot gets the
// full width; from md up the labels take a fixed left column. The value
// label lives in a reserved right gutter, so a bar at 100 % still has room.

type Props = {
  barras: readonly Barra[];
  referencias?: readonly Referencia[];
  /** Right gutter for the value labels, wide enough for the longest one. */
  anchoValor: string;
  /** Label column from md up. */
  anchoEtiqueta?: string;
};

// Gap between the label column and the plot (gap-3).
const SEPARACION = "0.75rem";

export function BarrasHorizontales({ barras, referencias = [], anchoValor, anchoEtiqueta = "12rem" }: Props) {
  const variables = { "--ancho-etiqueta": anchoEtiqueta, "--ancho-valor": anchoValor, "--separacion": SEPARACION } as CSSProperties;
  // The plot area: right of the label column (md+), left of the value gutter.
  const plot = "right-(--ancho-valor) left-0 md:left-[calc(var(--ancho-etiqueta)+var(--separacion))]";

  return (
    <div className="barras-horizontales" style={variables}>
      {referencias.length > 0 && (
        <div className="relative mb-1 h-4">
          <div className={`absolute inset-y-0 ${plot}`}>
            {referencias.map((r) => (
              <span
                key={r.posicion}
                className="absolute top-0 -translate-x-1/2 text-caption whitespace-nowrap text-ink-2"
                style={{ left: `${r.posicion}%` }}
              >
                {r.etiqueta}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="relative">
        {referencias.length > 0 && (
          <div className={`pointer-events-none absolute inset-y-0 z-10 ${plot}`}>
            {referencias.map((r) => (
              <span
                key={r.posicion}
                className="absolute inset-y-0 border-l border-dashed border-ink-2"
                style={{ left: `${r.posicion}%` }}
              />
            ))}
          </div>
        )}
        <ul className="flex flex-col gap-2 md:gap-1.5">
          {barras.map((b) => (
            <li
              key={b.clave}
              className="grid grid-cols-1 gap-1 md:grid-cols-[var(--ancho-etiqueta)_minmax(0,1fr)] md:items-center md:gap-(--separacion)"
            >
              {/* The white backing keeps the label readable where a threshold line crosses it. */}
              <span className="min-w-0 text-caption break-words text-ink-3">
                <span className="relative z-20 bg-surface">{b.etiqueta}</span>
              </span>
              <div className="relative h-5 mr-(--ancho-valor)">
                {b.nivel !== null && b.ancho > 0 && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-r-[4px] ${FONDO_NIVEL[b.nivel]}`}
                    style={{ width: `${b.ancho}%` }}
                  />
                )}
                <span
                  className="absolute top-1/2 z-20 -translate-y-1/2 bg-surface px-1.5 text-caption whitespace-nowrap text-ink tabular-nums"
                  style={{ left: `${b.ancho}%` }}
                >
                  {b.texto}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
