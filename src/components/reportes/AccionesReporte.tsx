import { clasesBoton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";
import { BotonImprimir } from "./BotonImprimir";

// The report actions (PRD §5.9), on both reports. "Descargar CSV" is the
// view's single primary button; it is a plain <a download> rather than a
// Next <Link> because the target is a file from a route handler. Hidden when
// printing.

export function AccionesReporte({ competenciaId }: { competenciaId: string }) {
  return (
    <div role="group" aria-label={TEXTOS_REPORTES.acciones} className="flex flex-wrap justify-center gap-2 print:hidden">
      <a href={`/api/reportes/${competenciaId}/csv`} download className={clasesBoton({ variante: "primario" })}>
        {TEXTOS.reportes.descargarCsv}
      </a>
      <BotonImprimir />
    </div>
  );
}
