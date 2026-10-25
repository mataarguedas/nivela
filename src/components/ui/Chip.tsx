import type { ReactNode } from "react";
import { IconoCheck } from "./iconos";

// Status pill (PRD §12): 12 px, grayscale tones, plus "enviado" in #0066cc.
// Tones are generic so the same chip serves participant status and the
// competencia badges; TONO_POR_ESTADO maps the four PRD §5.4 statuses.

export type TonoChip = "suave" | "medio" | "fuerte" | "enviado";

export const TONO_POR_ESTADO = {
  pendiente: "suave",
  enProgreso: "medio",
  completado: "fuerte",
  enviado: "enviado",
} as const satisfies Record<string, TonoChip>;

const TONOS: Record<TonoChip, string> = {
  suave: "border-hairline text-ink-2",
  medio: "border-transparent bg-hairline text-ink",
  fuerte: "border-transparent bg-ink text-white",
  enviado: "border-transparent bg-link/10 font-semibold text-link",
};

type ChipProps = {
  tono?: TonoChip;
  children: ReactNode;
  className?: string;
};

export function Chip({ tono = "suave", children, className }: ChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border px-2.5 py-0.5 text-caption ${TONOS[tono]} ${className ?? ""}`}
    >
      {tono === "enviado" && <IconoCheck />}
      {children}
    </span>
  );
}
