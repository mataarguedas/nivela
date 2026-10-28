"use client";

import { useSyncExternalStore } from "react";
import { TEXTOS } from "@/config/textos";
import { IconoAlerta } from "./iconos";

// Offline banner (PRD §13 → PWA): "Sin conexión. Sus respuestas se guardan en
// este dispositivo." Follows navigator.onLine and the online/offline events.
// Mounted once in the root layout, under the nav. Same white band as the
// storage notice: no border, no shadow. Not dismissible: it goes away by
// itself when the connection returns.

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

const enLinea = () => navigator.onLine;
// The server never knows; assume online so the banner never flashes on load.
const enLineaServidor = () => true;

export function AvisoSinConexion() {
  const conectado = useSyncExternalStore(suscribir, enLinea, enLineaServidor);
  return (
    <div role="status" className="print:hidden">
      {!conectado && (
        <div className="bg-surface">
          <div className="mx-auto flex max-w-[980px] items-start gap-3 py-2 pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]">
            <IconoAlerta className="mt-[13px] shrink-0 text-ink" />
            <p className="flex-1 py-[11px] text-[14px] text-ink">{TEXTOS.avisos.sinConexion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
