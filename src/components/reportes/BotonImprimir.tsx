"use client";

import { Boton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";

// "Imprimir o guardar PDF": the browser's print dialog, which also offers
// saving as PDF. The print stylesheet in globals.css lays the report out.

export function BotonImprimir() {
  return (
    <Boton variante="secundario" onClick={() => window.print()}>
      {TEXTOS.reportes.imprimir}
    </Boton>
  );
}
