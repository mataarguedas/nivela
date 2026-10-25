import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { TEXTOS } from "@/config/textos";

// Pill button (DESIGN.md → Filled Primary / Outlined Secondary / Text Link).
// No "use client": it works from Server Components; pass onClick only from a
// client component. Rule: exactly one `primario` per view.

export type VarianteBoton = "primario" | "secundario" | "texto";
export type TamanoBoton = "normal" | "grande";

type Comunes = {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  anchoCompleto?: boolean;
  /** Disables the button and swaps the label for `textoCargando`. */
  cargando?: boolean;
  /** Defaults to "Cargando…"; pass e.g. "Analizando…". */
  textoCargando?: string;
  className?: string;
  children: ReactNode;
};

type PropsBoton = Comunes & Omit<ComponentPropsWithoutRef<"button">, keyof Comunes> & { href?: undefined };

type PropsEnlace = Comunes &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof Comunes> & {
    /** A disabled link renders as a non-focusable <a> without href. */
    deshabilitado?: boolean;
  };

export type BotonProps = PropsBoton | PropsEnlace;

const BASE =
  "inline-flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-center gap-2 rounded-pill text-center font-normal transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const VARIANTES: Record<VarianteBoton, string> = {
  primario: "bg-primary text-white not-disabled:hover:bg-primary/90",
  secundario: "border border-link bg-transparent text-link not-disabled:hover:bg-link/5",
  texto: "bg-transparent text-link not-disabled:hover:underline",
};

const TAMANOS: Record<VarianteBoton, Record<TamanoBoton, string>> = {
  primario: { normal: "px-[21px] py-[11px] text-[14px]", grande: "min-h-12 px-[28px] py-[13px] text-body" },
  // 1 px border is inside the box, so trim the padding to keep the same size.
  secundario: { normal: "px-[20px] py-[10px] text-[14px]", grande: "min-h-12 px-[27px] py-[12px] text-body" },
  texto: { normal: "px-2 py-[11px] text-[14px]", grande: "px-2 py-[13px] text-body" },
};

export function clasesBoton({
  variante = "primario",
  tamano = "normal",
  anchoCompleto = false,
  className,
}: Pick<Comunes, "variante" | "tamano" | "anchoCompleto" | "className">): string {
  return [BASE, VARIANTES[variante], TAMANOS[variante][tamano], anchoCompleto ? "w-full" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Boton(props: BotonProps) {
  const { variante, tamano, anchoCompleto, cargando = false, textoCargando = TEXTOS.ui.cargando, className, children } = props;
  const clases = clasesBoton({ variante, tamano, anchoCompleto, className });
  const contenido = cargando ? textoCargando : children;

  if (props.href !== undefined) {
    const { deshabilitado = false, ...enlace } = sinComunes(props);
    if (deshabilitado || cargando) {
      return (
        <a role="link" aria-disabled="true" aria-busy={cargando || undefined} className={clases}>
          {contenido}
        </a>
      );
    }
    return (
      <Link {...enlace} className={clases}>
        {contenido}
      </Link>
    );
  }

  const { type = "button", disabled, ...boton } = sinComunes(props);
  return (
    <button {...boton} type={type} disabled={disabled || cargando} aria-busy={cargando || undefined} className={clases}>
      {contenido}
    </button>
  );
}

const CLAVES_COMUNES = new Set<string>([
  "variante",
  "tamano",
  "anchoCompleto",
  "cargando",
  "textoCargando",
  "className",
  "children",
]);

/** Strips the styling props so only native/Link props reach the DOM. */
function sinComunes<T extends Comunes>(props: T): Omit<T, keyof Comunes> {
  return Object.fromEntries(Object.entries(props).filter(([clave]) => !CLAVES_COMUNES.has(clave))) as Omit<
    T,
    keyof Comunes
  >;
}
