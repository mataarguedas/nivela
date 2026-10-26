import type { NivelValor } from "@/config/niveles";

// Level fills for charts and probability bars (CLAUDE.md → Chart level
// colors): 1 #d6d6d6, 2 #aad0f6, 3 #509be7, 4 #0066cc. Color never carries
// the meaning alone: always show the level name and value next to it.
export const FONDO_NIVEL: Record<NivelValor, string> = {
  1: "bg-hairline",
  2: "bg-wash",
  3: "bg-link-hover",
  4: "bg-link",
};
