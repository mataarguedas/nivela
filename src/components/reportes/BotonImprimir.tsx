"use client";

import { Boton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";

// "Imprimir o guardar PDF": the browser's print dialog, which also offers
// saving as PDF. The print stylesheet in globals.css lays the report out.
// Secondary next to "Descargar CSV"; the group summary, which has no CSV,
// makes it its single primary action.

export function BotonImprimir({ variante = "secundario" }: { variante?: "primario" | "secundario" }) {
  return (
    <Boton variante={variante} onClick={() => window.print()}>
      {TEXTOS.reportes.imprimir}
    </Boton>
  );
}
