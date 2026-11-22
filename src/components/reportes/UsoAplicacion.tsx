import { Chip, type TonoChip } from "@/components/ui/Chip";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearEntero, formatearFecha, formatearFechaHora } from "@/lib/formato";
import type { EquipoUso, EstadoUso, EvaluadorUso } from "@/lib/reportes";

// "Uso de la aplicación" (PRD §11.6, v1.14): one team's evaluators with their
// account status, activation date, last sign-in, last evaluation sent and a
// usage chip, least advanced first. A table from md up and in print; a
// stacked card per evaluator on phones, so nothing scrolls sideways at
// 375 px. Server-rendered; it receives account status, never an email.

const t = TEXTOS_REPORTES.uso;

const TONO_USO: Record<EstadoUso, TonoChip> = {
  "sin-activar": "ausente",
  "sin-actividad": "suave",
  evaluando: "medio",
  completo: "enviado",
};

export function ChipUso({ uso }: { uso: EstadoUso }) {
  return <Chip tono={TONO_USO[uso]}>{t.estados[uso]}</Chip>;
}

const fechaHora = (iso: string | null) => (iso ? formatearFechaHora(iso) : TEXTOS_REPORTES.nunca);
const fecha = (iso: string | null) => (iso ? formatearFecha(iso) : "—");
const enviadas = (a: EvaluadorUso) => TEXTOS_REPORTES.deTotal(formatearEntero(a.enviadas), formatearEntero(a.esperadas));

export function TablaUsoEquipo({ equipo, etiquetadaPor }: { equipo: EquipoUso; etiquetadaPor: string }) {
  return (
    <>
      <p className="-mt-2 mb-4 text-body text-ink-3">
        {t.resumenEquipo(formatearEntero(equipo.activadas), formatearEntero(equipo.completos), formatearEntero(equipo.total))}
      </p>

      <div className="hidden md:block print:block">
        <table aria-labelledby={etiquetadaPor} className="w-full border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-caption text-ink-3">
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.nombre}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.curso}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.cuenta}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{t.activadaEl}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{TEXTOS_REPORTES.ultimoIngreso}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{t.ultimaEvaluacion}</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{TEXTOS_REPORTES.enviadas}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{t.uso}</th>
            </tr>
          </thead>
          <tbody>
            {equipo.evaluadores.map((a) => (
              <tr key={a.evaluadorId} className="fila-reporte even:bg-canvas">
                <th scope="row" className="px-2 py-2 text-left font-normal">{a.nombre}</th>
                <td className="px-2 py-2 text-ink-3">{a.curso}</td>
                <td className="px-2 py-2">{TEXTOS_REPORTES.estadosCuenta[a.cuenta]}</td>
                <td className="px-2 py-2 tabular-nums">{fecha(a.activadaEn)}</td>
                <td className="px-2 py-2 tabular-nums">{fechaHora(a.ultimoAcceso)}</td>
                <td className="px-2 py-2 tabular-nums">{fechaHora(a.ultimoEnvio)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{enviadas(a)}</td>
                <td className="px-2 py-2">
                  <ChipUso uso={a.uso} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-labelledby={etiquetadaPor} className="flex flex-col gap-2 md:hidden print:hidden">
        {equipo.evaluadores.map((a) => (
          <li key={a.evaluadorId} className="fila-reporte rounded-tile bg-canvas px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-body font-semibold">{a.nombre}</p>
              <ChipUso uso={a.uso} />
            </div>
            <p className="text-caption text-ink-3">{a.curso}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.cuenta}</dt>
                <dd>{TEXTOS_REPORTES.estadosCuenta[a.cuenta]}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.activadaEl}</dt>
                <dd className="tabular-nums">{fecha(a.activadaEn)}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.ultimoIngreso}</dt>
                <dd className="tabular-nums">{fechaHora(a.ultimoAcceso)}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.ultimaEvaluacion}</dt>
                <dd className="tabular-nums">{fechaHora(a.ultimoEnvio)}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{TEXTOS_REPORTES.enviadas}</dt>
                <dd className="tabular-nums">{enviadas(a)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
