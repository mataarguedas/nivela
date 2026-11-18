"use client";

import { useId, useState, type ReactNode } from "react";
import { IconoChevron } from "@/components/ui/iconos";
import { TEXTOS_REPORTES } from "@/config/textosReportes";

// "Ver gráficos detallados" (PRD §11 v1.2): the v1.1 charts (radar, stacked
// distributions, 100 % bars) at the end of each report, collapsed. Unlike
// ui/Desplegable, the panel's children mount only on the first open: they
// are next/dynamic Recharts components (graficos.tsx), so Recharts is not
// downloaded until the docente asks for it. After that they stay mounted.
// Collapsed, the whole section is left out of print.

export function GraficosDetallados({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const id = useId();
  const idPanel = `${id}-panel`;

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className={`seccion-reporte rounded-tile bg-surface p-4 md:p-6 ${abierto ? "" : "print:hidden"}`}
    >
      <h2 id={`${id}-titulo`} className="text-sub font-semibold">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => {
            setAbierto(!abierto);
            setMontado(true);
          }}
          className="-mx-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill px-1 text-left text-link hover:underline print:no-underline print:text-ink"
        >
          <IconoChevron className={`shrink-0 transition-transform print:hidden ${abierto ? "rotate-90" : ""}`} />
          {TEXTOS_REPORTES.verGraficosDetallados}
        </button>
      </h2>
      <div id={idPanel} hidden={!abierto} className="mt-4 flex flex-col gap-8">
        {montado && children}
      </div>
    </section>
  );
}
