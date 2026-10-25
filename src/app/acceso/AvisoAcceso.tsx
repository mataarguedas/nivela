import { TEXTOS } from "@/config/textos";
import type { MotivoAcceso } from "@/lib/destino";

// Why the user landed on /acceso (expired session, docente-only page).

const AVISOS: Record<MotivoAcceso, string> = {
  expirada: TEXTOS.sesion.expirada,
  docente: TEXTOS.sesion.soloDocente,
};

export function AvisoAcceso({ motivo }: { motivo: MotivoAcceso | null }) {
  if (!motivo) return null;
  return (
    <p role="status" className="mb-5 rounded-tile bg-surface px-4 py-3 text-body text-ink">
      {AVISOS[motivo]}
    </p>
  );
}
