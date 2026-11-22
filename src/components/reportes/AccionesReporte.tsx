import Link from "next/link";
import { clasesBoton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ENVIO, TEXTOS_REPORTES } from "@/config/textosReportes";
import { BotonImprimir } from "./BotonImprimir";

// The report actions (PRD §5.9), on both reports. "Descargar CSV" is the
// view's single primary button; it is a plain <a download> rather than a
// Next <Link> because the target is a file from a route handler. The Reporte
// general adds "Resumen del grupo" and "Enviar resultados por correo" (§11.2,
// both secondary). Since v1.13 the email is one general report with every
// competencia, so that link opens the Reporte consolidado's send page.
// Hidden when printing.

export const RUTA_ENVIO = "/reportes/consolidado/enviar";

export function AccionesReporte({ competenciaId, general = false }: { competenciaId: string; general?: boolean }) {
  return (
    <div role="group" aria-label={TEXTOS_REPORTES.acciones} className="flex flex-wrap justify-center gap-2 print:hidden">
      <a href={`/api/reportes/${competenciaId}/csv`} download className={clasesBoton({ variante: "primario" })}>
        {TEXTOS.reportes.descargarCsv}
      </a>
      {general && (
        <>
          <Link href={`/reportes/${competenciaId}/grupo`} className={clasesBoton({ variante: "secundario" })}>
            {TEXTOS_REPORTES.resumenGrupo}
          </Link>
          <Link href={RUTA_ENVIO} className={clasesBoton({ variante: "secundario" })}>
            {TEXTOS_ENVIO.titulo}
          </Link>
        </>
      )}
      <BotonImprimir />
    </div>
  );
}
