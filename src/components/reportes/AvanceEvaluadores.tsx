import { Chip, type TonoChip } from "@/components/ui/Chip";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearEntero, formatearFechaHora } from "@/lib/formato";
import type { EstadoAvance } from "@/lib/puntajes";
import type { Avance, AvanceEvaluador } from "@/lib/reportes";

// "Avance de evaluadores" (PRD §11.2): who on the jornada's team has finished
// and who hasn't, incomplete ones first. A table from md up and in print; a
// stacked card per evaluator on phones, so nothing scrolls sideways at
// 375 px. Server-rendered; it receives account status, never an email.

const TONO_AVANCE: Record<EstadoAvance, TonoChip> = { "sin-iniciar": "suave", "en-progreso": "medio", completo: "enviado" };

const ultimoIngreso = (a: AvanceEvaluador) => (a.ultimoAcceso ? formatearFechaHora(a.ultimoAcceso) : TEXTOS_REPORTES.nunca);
const enviadas = (a: AvanceEvaluador) => TEXTOS_REPORTES.deTotal(formatearEntero(a.enviadas), formatearEntero(a.esperadas));

function EstadoChip({ estado }: { estado: EstadoAvance }) {
  return <Chip tono={TONO_AVANCE[estado]}>{TEXTOS_REPORTES.estadosAvance[estado]}</Chip>;
}

export function AvanceEvaluadores({ avance, etiquetadaPor }: { avance: Avance; etiquetadaPor: string }) {
  const resumen = TEXTOS_REPORTES.avanceResumen(formatearEntero(avance.completos), formatearEntero(avance.total));
  return (
    <>
      <p className="-mt-2 text-body text-ink-3">{resumen}</p>
      <p className="mt-1 mb-4 text-caption text-ink-2">{TEXTOS_REPORTES.avanceNota}</p>

      <div className="hidden md:block print:block">
        <table aria-labelledby={etiquetadaPor} className="w-full border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-caption text-ink-3">
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.nombre}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.curso}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.cuenta}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.ultimoIngreso}</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{TEXTOS_REPORTES.enviadas}</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{TEXTOS_REPORTES.ausentes}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.estado}</th>
            </tr>
          </thead>
          <tbody>
            {avance.evaluadores.map((a) => (
              <tr key={a.evaluadorId} className="fila-reporte even:bg-canvas">
                <th scope="row" className="px-2 py-2 text-left font-normal">{a.nombre}</th>
                <td className="px-2 py-2 text-ink-3">{a.curso}</td>
                <td className="px-2 py-2">{TEXTOS_REPORTES.estadosCuenta[a.cuenta]}</td>
                <td className="px-2 py-2 tabular-nums">{ultimoIngreso(a)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{enviadas(a)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatearEntero(a.ausentes)}</td>
                <td className="px-2 py-2">
                  <EstadoChip estado={a.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-labelledby={etiquetadaPor} className="flex flex-col gap-2 md:hidden print:hidden">
        {avance.evaluadores.map((a) => (
          <li key={a.evaluadorId} className="fila-reporte rounded-tile bg-canvas px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-body font-semibold">{a.nombre}</p>
              <EstadoChip estado={a.estado} />
            </div>
            <p className="text-caption text-ink-3">{a.curso}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.enviadas}</dt>
                <dd className="tabular-nums">{enviadas(a)}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.ausentes}</dt>
                <dd className="tabular-nums">{formatearEntero(a.ausentes)}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.cuenta}</dt>
                <dd>{TEXTOS_REPORTES.estadosCuenta[a.cuenta]}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.ultimoIngreso}</dt>
                <dd className="tabular-nums">{ultimoIngreso(a)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
