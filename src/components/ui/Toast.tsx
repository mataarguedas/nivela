"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Short confirmation messages ("Evaluación enviada"). The polite live region
// is always in the DOM so screen readers reliably announce new messages; only
// its content changes. Messages dismiss themselves after `duracion` ms.

type Aviso = { id: number; mensaje: string };
type ContextoToast = { mostrar: (mensaje: string) => void };

const Contexto = createContext<ContextoToast | null>(null);

export const DURACION_TOAST_MS = 4000;

export function ProveedorToast({ children, duracion = DURACION_TOAST_MS }: { children: ReactNode; duracion?: number }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const siguienteId = useRef(0);

  const mostrar = useCallback((mensaje: string) => {
    siguienteId.current += 1;
    setAviso({ id: siguienteId.current, mensaje });
  }, []);
  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), duracion);
    return () => window.clearTimeout(temporizador);
  }, [aviso, duracion]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+52px)] z-50 flex justify-center px-4 print:hidden"
      >
        {aviso && (
          <p key={aviso.id} className="max-w-[480px] rounded-pill bg-ink px-5 py-3 text-center text-[14px] text-white">
            {aviso.mensaje}
          </p>
        )}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useToast must be used inside <ProveedorToast>");
  return contexto;
}
