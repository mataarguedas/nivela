"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { TEXTOS } from "@/config/textos";
import { destinoSeguro } from "@/lib/destino";
import { irA } from "@/lib/navegacion";

// Access code form (PRD §5.1). After MAX_FALLOS wrong codes in a row the
// button locks for ENFRIAMIENTO_S seconds; the server adds its own delay on
// every failure, so this is a courtesy brake, not the security boundary.
// The `next` param is read at submit time, so the page can prerender this
// form outside any Suspense boundary.

export const MAX_FALLOS = 5;
export const ENFRIAMIENTO_S = 30;

export function FormularioAcceso() {
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const enfriamiento = useEnfriamiento();
  const hidratado = useHidratado();

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || enfriamiento.activo) return;
    // Read the DOM, not React state: text typed before hydration counts too.
    const valor = String(new FormData(evento.currentTarget).get("codigo") ?? "").trim();
    if (!valor) {
      setError(TEXTOS.acceso.codigoRequerido);
      return;
    }

    setEnviando(true);
    setError(undefined);
    try {
      const respuesta = await fetch("/api/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: valor }),
      });
      if (respuesta.ok) {
        // Stay in the loading state while the page navigates away.
        irA(destinoSeguro(new URLSearchParams(window.location.search).get("next")));
        return;
      }
      if (respuesta.status === 401) {
        enfriamiento.registrarFallo();
        setError(TEXTOS.acceso.error);
      } else if (respuesta.status === 400) {
        setError(TEXTOS.acceso.codigoRequerido);
      } else {
        setError(TEXTOS.acceso.sinConexion);
      }
    } catch {
      setError(TEXTOS.acceso.sinConexion);
    }
    setEnviando(false);
  }

  return (
    // Before hydration a native submit would put the code in the URL. The
    // disabled button also blocks implicit (Enter key) submission, and
    // method="post" keeps the code out of the URL if anything slips through.
    <form method="post" onSubmit={alEnviar} noValidate className="flex flex-col gap-5 text-left">
      <Campo
        etiqueta={TEXTOS.acceso.instruccion}
        name="codigo"
        error={error}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
      />
      <Boton type="submit" anchoCompleto cargando={enviando} disabled={!hidratado || enfriamiento.activo}>
        {TEXTOS.acceso.entrar}
      </Boton>
      {enfriamiento.activo && (
        <>
          {/* The visible countdown ticks every second; screen readers get one announcement. */}
          <p aria-hidden="true" className="text-center text-[14px] text-ink-2">
            {TEXTOS.acceso.demasiadosIntentos(enfriamiento.segundos)}
          </p>
          <p role="status" className="sr-only">
            {TEXTOS.acceso.demasiadosIntentos(ENFRIAMIENTO_S)}
          </p>
        </>
      )}
    </form>
  );
}

const sinSuscripcion = () => () => {};

/** False on the server and during hydration, true once React owns the DOM. */
function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}

function useEnfriamiento() {
  const [fallos, setFallos] = useState(0);
  const [hasta, setHasta] = useState<number | null>(null);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (hasta === null) return;
    const intervalo = window.setInterval(() => {
      const restantes = Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
      setSegundos(restantes);
      if (restantes === 0) setHasta(null);
    }, 250);
    return () => window.clearInterval(intervalo);
  }, [hasta]);

  function registrarFallo() {
    const total = fallos + 1;
    if (total < MAX_FALLOS) {
      setFallos(total);
      return;
    }
    setFallos(0);
    setSegundos(ENFRIAMIENTO_S);
    setHasta(Date.now() + ENFRIAMIENTO_S * 1000);
  }

  return { activo: hasta !== null, segundos, registrarFallo };
}
