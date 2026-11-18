"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RadiosPill, type OpcionPill } from "@/components/ui/RadiosPill";
import type { SeleccionJornada } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";

// The group summary's "Jornada" selector (PRD §11.3): Mañana / Noche / Ambas
// jornadas, styled like the jornada switch. Unlike that switch it never
// touches the session: it only changes the page's `?jornada=` (the read-only
// §5.11 exception), which the server validates again. Options come labelled
// from the server, which offers only the jornadas this competencia has.

export function SelectorJornadaResumen({
  competenciaId,
  opciones,
  actual,
}: {
  competenciaId: string;
  opciones: readonly OpcionPill<SeleccionJornada>[];
  actual: SeleccionJornada;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  function elegir(seleccion: SeleccionJornada) {
    if (seleccion === actual || pendiente) return;
    iniciar(() => router.replace(`/reportes/${competenciaId}/grupo?jornada=${seleccion}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col items-center gap-2 print:hidden">
      <RadiosPill etiqueta={TEXTOS.jornada.etiqueta} opciones={opciones} actual={actual} onElegir={elegir} ocupado={pendiente} />
    </div>
  );
}
