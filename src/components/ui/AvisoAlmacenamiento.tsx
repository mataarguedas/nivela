"use client";

import { useState } from "react";
import { TEXTOS } from "@/config/textos";
import { useAlmacenamientoDisponible } from "@/lib/borrador";
import { Boton } from "./Boton";
import { IconoAlerta } from "./iconos";

// One-time notice when localStorage is unavailable (PRD §9.3) and drafts live
// only in memory. Mounted once in the root layout, so it survives client
// navigation; once dismissed it stays hidden until the page reloads. A white
// band on the canvas, no border or shadow.

export function AvisoAlmacenamiento() {
  const disponible = useAlmacenamientoDisponible();
  const [descartado, setDescartado] = useState(false);
  if (disponible || descartado) return null;
  return (
    <div role="status" className="bg-surface">
      <div className="mx-auto flex max-w-[980px] items-start gap-3 py-2 pr-[max(8px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]">
        <IconoAlerta className="mt-[13px] shrink-0 text-ink" />
        <p className="flex-1 py-[11px] text-[14px] text-ink">{TEXTOS.avisos.sinAlmacenamiento}</p>
        <Boton variante="texto" onClick={() => setDescartado(true)}>
          {TEXTOS.avisos.entendido}
        </Boton>
      </div>
    </div>
  );
}
