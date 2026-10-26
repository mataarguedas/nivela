import { IconoCheck } from "@/components/ui/iconos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearEntero } from "@/lib/formato";
import type { Reporte } from "@/lib/reportes";

// "Cobertura de evaluaciones" (PRD §11.2): evaluador × participante, so the
// docente sees who is missing. With 20 participants the grid is wider than a
// phone: only this wrapper scrolls (keyboard-focusable, labelled), the page
// never does, and the names column stays put. Print shows it whole.

export function MatrizCobertura({ cobertura, etiquetadaPor }: { cobertura: Reporte["cobertura"]; etiquetadaPor: string }) {
  const { participantes, filas } = cobertura;
  return (
    <div
      role="region"
      aria-labelledby={etiquetadaPor}
      tabIndex={0}
      className="desplazable relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <table className="matriz-cobertura w-max min-w-full border-separate border-spacing-0 text-caption">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-surface py-2 pr-3 text-left font-semibold">
              {TEXTOS_REPORTES.personaEvaluadora}
            </th>
            {participantes.map((p) => (
              <th key={p.id} scope="col" className="min-w-7 px-0.5 py-2 text-center font-semibold tabular-nums">
                <abbr title={p.etiqueta} className="no-underline">
                  {p.id.replace(/^P/, "")}
                </abbr>
              </th>
            ))}
            <th scope="col" className="py-2 pl-3 text-right font-semibold">
              {TEXTOS_REPORTES.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            // Opaque row tints so the sticky names column covers what scrolls under it.
            <tr key={fila.evaluadorId} className="bg-surface even:bg-canvas">
              <th scope="row" className="sticky left-0 z-10 max-w-36 bg-inherit py-2 pr-3 pl-1 text-left font-normal">
                {fila.nombre}
              </th>
              {fila.enviadas.map((enviada, i) => (
                <td key={participantes[i].id} className="px-0.5 py-2 text-center">
                  {enviada ? (
                    <IconoCheck className="inline text-link" />
                  ) : (
                    <span aria-hidden="true" className="text-ink-2">
                      ·
                    </span>
                  )}
                  <span className="sr-only">
                    {participantes[i].etiqueta}: {enviada ? TEXTOS_REPORTES.enviada : TEXTOS_REPORTES.pendiente}
                  </span>
                </td>
              ))}
              <td className="py-2 pl-3 text-right tabular-nums">
                {TEXTOS_REPORTES.deTotal(formatearEntero(fila.total), formatearEntero(participantes.length))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
