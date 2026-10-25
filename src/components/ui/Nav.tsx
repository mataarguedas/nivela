import Link from "next/link";
import type { ReactNode } from "react";
import { TEXTOS } from "@/config/textos";
import { MarcaNivela } from "./iconos";

// Global nav (DESIGN.md → Global Nav Bar, PRD §12): 44 px, frosted white,
// "Nivela" wordmark on the left. `children` fills the right slot with the
// evaluator's name, "Reportes" and/or "Salir". It pads for the notch and the
// landscape safe areas (the layout uses viewport-fit=cover).

export function Nav({ children }: { children?: ReactNode }) {
  return (
    <header className="esmerilado sticky top-0 z-40 bg-white/80 pt-[env(safe-area-inset-top)]">
      <nav
        aria-label={TEXTOS.ui.navegacion}
        className="mx-auto flex h-11 max-w-[980px] items-center justify-between gap-3 pr-[max(8px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]"
      >
        <Link
          href="/"
          aria-label={TEXTOS.ui.irAInicio}
          className="-ml-1 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill px-1 text-body font-semibold text-ink"
        >
          <MarcaNivela className="text-ink" />
          <span>{TEXTOS.app.nombre}</span>
        </Link>
        {children && <div className="flex min-w-0 items-center justify-end gap-1 text-[14px]">{children}</div>}
      </nav>
    </header>
  );
}

/** Plain text item for the right slot (e.g. the evaluator's name). Truncates. */
export function NavTexto({ children }: { children: ReactNode }) {
  return <span className="min-w-0 truncate px-2 text-[14px] text-ink-3">{children}</span>;
}
