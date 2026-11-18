import { TEXTOS } from "@/config/textos";
import { nombreJornada } from "@/config/jornadas";
import { obtenerNivel } from "@/config/niveles";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { formatearPuntos, formatearEntero, formatearPorcentaje } from "@/lib/formato";
import type { IndicadorGrupo, ResumenJornada } from "@/lib/reportes";
import { textoBrechaCorto } from "@/lib/textoBrecha";

// "Ambas jornadas": the Mañana vs Noche table of the group summary (PRD
// §11.3). One column per jornada, each headed by its own team from config
// ("Mañana · Equipo 4", "Noche · Equipo 1"): jornadas are compared by
// competencia, never by team number. KPIs always share rows; indicator means
// share rows only when both jornadas rate with the same rubric, otherwise
// each cell names its own jornada's indicator.

type Fila = { clave: string; encabezado: string; celdas: { valor: string; detalle?: string }[] };

const sinDatos = (valor: number | null, formato: (v: number) => string) => (valor === null ? "—" : formato(valor));
const deTotal = (n: number, total: number) => TEXTOS_REPORTES.deTotal(formatearEntero(n), formatearEntero(total));

function filasKpi(jornadas: readonly ResumenJornada[]): Fila[] {
  const fila = (clave: string, encabezado: string, valor: (j: ResumenJornada) => string): Fila => ({
    clave,
    encabezado,
    celdas: jornadas.map((j) => ({ valor: valor(j) })),
  });
  return [
    fila("puntaje", TEXTOS_REPORTES.puntajeGrupo, (j) => sinDatos(j.puntaje, formatearPuntos)),
    fila("nivel", TEXTOS.reportes.nivelGeneral, (j) => (j.nivel === null ? "—" : obtenerNivel(j.nivel).etiqueta)),
    fila("brecha", TEXTOS_REPORTES.paraSiguienteNivel, (j) => (j.brecha === null ? "—" : textoBrechaCorto(j.brecha))),
    fila("evaluados", TEXTOS_REPORTES.participantesEvaluados, (j) => deTotal(j.participantesEvaluados, j.participantesTotal)),
    fila("ausentes", TEXTOS_REPORTES.ausentes, (j) => formatearEntero(j.ausentes)),
    fila("recibidas", TEXTOS.reportes.evaluacionesRecibidas, (j) => deTotal(j.recibidas, j.esperadas)),
    fila("cobertura", TEXTOS_REPORTES.cobertura, (j) => sinDatos(j.cobertura, formatearPorcentaje)),
    fila("completos", TEXTOS_REPORTES.evaluadoresCompletos, (j) => deTotal(j.evaluadoresCompletos, j.evaluadoresTotal)),
  ];
}

const media = (i: IndicadorGrupo | undefined) => (i ? sinDatos(i.media, formatearPuntos) : "—");

function filasIndicadores(jornadas: readonly ResumenJornada[], mismaRubrica: boolean): Fila[] {
  const cantidad = Math.max(0, ...jornadas.map((j) => j.indicadores.length));
  return Array.from({ length: cantidad }, (_, posicion): Fila => {
    const numero = posicion + 1;
    const primero = jornadas[0]?.indicadores[posicion];
    return mismaRubrica && primero
      ? {
          clave: primero.indicadorId,
          encabezado: `${TEXTOS.calificacion.indicador(primero.numero)}. ${primero.titulo}`,
          celdas: jornadas.map((j) => ({ valor: media(j.indicadores[posicion]) })),
        }
      : {
          clave: `indicador-${numero}`,
          encabezado: TEXTOS.calificacion.indicador(numero),
          celdas: jornadas.map((j) => ({ valor: media(j.indicadores[posicion]), detalle: j.indicadores[posicion]?.titulo })),
        };
  });
}

export function ComparacionJornadas({
  jornadas,
  mismaRubrica,
  etiquetadaPor,
}: {
  jornadas: readonly ResumenJornada[];
  mismaRubrica: boolean;
  etiquetadaPor: string;
}) {
  const filas = [...filasKpi(jornadas), ...filasIndicadores(jornadas, mismaRubrica)];
  return (
    <table aria-labelledby={etiquetadaPor} className="w-full table-fixed border-separate border-spacing-0 text-[14px]">
      <thead>
        <tr className="text-caption text-ink-3">
          <th scope="col" className="w-[40%] px-2 py-2 text-left font-semibold">
            {TEXTOS_REPORTES.medida}
          </th>
          {jornadas.map((j) => (
            <th key={j.jornada} scope="col" className="px-2 py-2 text-right font-semibold">
              {TEXTOS_REPORTES.columnaJornada(nombreJornada(j.jornada), j.numeroEquipo)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.clave} className="fila-reporte even:bg-canvas">
            <th scope="row" className="px-2 py-2 text-left align-top font-normal break-words">
              {fila.encabezado}
            </th>
            {fila.celdas.map((celda, i) => (
              <td key={jornadas[i].jornada} className="px-2 py-2 text-right align-top tabular-nums break-words">
                <span className="block font-semibold">{celda.valor}</span>
                {celda.detalle && <span className="block text-caption text-ink-2">{celda.detalle}</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
