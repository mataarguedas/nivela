import Link from "next/link";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearDecimal } from "@/lib/formato";
import { redondear2 } from "@/lib/puntajes";
import type { ReporteConsolidado } from "@/lib/reportes";
import { LeyendaNiveles } from "./Figura";

// "Mapa de niveles" (PRD §11.4, Tablero): a heatmap of participants ×
// competencias, server-rendered as a real table. Each cell is filled with the
// level color of the participant's puntaje general in that competencia and
// always shows the score (the level name is in the cell for screen readers
// and in its tooltip), so color never carries the meaning alone: Básico and
// Intermedio are close in lightness. Rows run from the highest promedio entre
// competencias to the lowest; the carnet opens the Reporte del participante.
// Cells are separated by a 2 px surface gap, never borders.

// Text on each fill: dark on the three lighter levels, white on #0066cc (≥ 4.5:1).
const TEXTO_NIVEL: Record<NivelValor, string> = { 1: "text-ink", 2: "text-ink", 3: "text-ink", 4: "text-white" };

function Celda({ competencia, puntaje, nivel, ausente }: { competencia: string; puntaje: number | null; nivel: NivelValor | null; ausente: boolean }) {
  if (puntaje === null || nivel === null) {
    return (
      <td className="h-11 rounded-[4px] bg-canvas px-2 text-center text-caption text-ink-2">
        {ausente ? (
          <span title={TEXTOS_REPORTES.ausente}>
            <span aria-hidden="true">{TEXTOS_REPORTES.consolidado.ausenteCorto}</span>
            <span className="sr-only">{TEXTOS_REPORTES.ausente}</span>
          </span>
        ) : (
          "—"
        )}
      </td>
    );
  }
  const valor = formatearDecimal(puntaje);
  const etiqueta = obtenerNivel(nivel).etiqueta;
  return (
    <td
      title={TEXTOS_REPORTES.consolidado.celdaMapa(competencia, valor, etiqueta)}
      className={`h-11 rounded-[4px] px-2 text-center font-semibold tabular-nums ${FONDO_NIVEL[nivel]} ${TEXTO_NIVEL[nivel]}`}
    >
      {valor}
      <span className="sr-only"> · {etiqueta}</span>
    </td>
  );
}

export function MapaNiveles({ reporte, etiquetadaPor }: { reporte: ReporteConsolidado; etiquetadaPor: string }) {
  const t = TEXTOS_REPORTES.consolidado;
  const columnas = reporte.competencias.flatMap((c, i) => (c.disponible ? [{ competencia: c, indice: i }] : []));
  const filas = [...reporte.participantes].sort((a, b) => {
    if (a.promedio === null || b.promedio === null) return a.promedio === b.promedio ? a.id.localeCompare(b.id) : a.promedio === null ? 1 : -1;
    return redondear2(b.promedio) - redondear2(a.promedio) || a.id.localeCompare(b.id);
  });

  return (
    <>
      <div
        role="region"
        aria-labelledby={etiquetadaPor}
        tabIndex={0}
        className="desplazable relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        <table
          aria-labelledby={etiquetadaPor}
          className="w-full border-separate border-spacing-[2px] text-[14px]"
          style={{ minWidth: `${12 + (columnas.length + 1) * 6}rem` }}
        >
          <thead>
            <tr>
              <th scope="col" className="px-2 pb-1 text-left align-bottom text-caption font-semibold text-ink-3">
                {TEXTOS_REPORTES.participante}
              </th>
              {columnas.map(({ competencia }) => (
                <th key={competencia.id} scope="col" className="w-24 px-1 pb-1 text-center align-bottom text-caption font-semibold text-ink-3">
                  {competencia.nombre}
                </th>
              ))}
              <th scope="col" className="w-24 px-1 pb-1 text-center align-bottom text-caption font-semibold text-ink">
                {t.promedio}
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="p-0 text-left font-normal">
                  <Link
                    href={`/reportes/consolidado/${p.id}`}
                    className="inline-flex min-h-11 items-center rounded-pill px-2 whitespace-nowrap text-link hover:underline"
                  >
                    {p.etiqueta}
                  </Link>
                </th>
                {columnas.map(({ competencia, indice }) => {
                  const celda = p.celdas[indice];
                  return (
                    <Celda
                      key={competencia.id}
                      competencia={competencia.nombre}
                      puntaje={celda?.puntaje ?? null}
                      nivel={celda?.nivel ?? null}
                      ausente={celda?.asistencia === "ausente"}
                    />
                  );
                })}
                <Celda competencia={t.promedio} puntaje={p.promedio} nivel={p.nivel} ausente={false} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LeyendaNiveles />
      <p className="mt-2 text-caption text-ink-2">{t.mapaNivelesNota}</p>
    </>
  );
}
