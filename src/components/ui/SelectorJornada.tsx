"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { JORNADAS, type JornadaId } from "@/config/jornadas";
import { TEXTOS } from "@/config/textos";
import { RadiosPill } from "./RadiosPill";

// Jornada switch for docente and admin (PRD §5.11): two pill radios
// (RadiosPill). Choosing one POSTs /api/jornada, which re-signs the session,
// then refreshes the server render.

export function SelectorJornada({ actual }: { actual: JornadaId }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState(false);

  async function elegir(jornada: JornadaId) {
    if (jornada === actual || pendiente) return;
    setError(false);
    try {
      const respuesta = await fetch("/api/jornada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jornada }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      iniciar(() => router.refresh());
    } catch {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 print:hidden">
      <RadiosPill
        etiqueta={TEXTOS.jornada.etiqueta}
        opciones={JORNADAS}
        actual={actual}
        onElegir={(jornada) => void elegir(jornada)}
        ocupado={pendiente}
      />
      {error && (
        <p role="alert" className="text-caption text-ink">
          {TEXTOS.jornada.error}
        </p>
      )}
    </div>
  );
}
