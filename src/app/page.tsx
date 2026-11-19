import { connection } from "next/server";
import { Suspense } from "react";
import { buscarIntegrante } from "@/config/equipos";
import { JORNADA_PREDETERMINADA } from "@/config/jornadas";
import { getSesion } from "@/lib/sesion";
import { ContenidoInicio } from "./ContenidoInicio";

// Inicio (PRD §5.2). Which competencias open depends on the session: its
// jornada (PRD §5.11) and, for an evaluador, their own team's competencia
// (PRD §5.12). The docente switches jornada here too (PRD §5.11). The content reads the cookie behind Suspense; the hero
// prerenders into the shell as the fallback.

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<ContenidoInicio jornada={null} />}>
        <InicioSesion />
      </Suspense>
    </main>
  );
}

async function InicioSesion() {
  await connection();
  const sesion = await getSesion();
  const jornada = sesion?.jornada ?? JORNADA_PREDETERMINADA;
  // An evaluador's team decides their competencia; the docente has no restriction.
  const asignada =
    sesion?.rol === "evaluador" && sesion.integranteId
      ? (buscarIntegrante(sesion.integranteId)?.equipo.competenciaId ?? null)
      : undefined;
  return <ContenidoInicio jornada={jornada} asignada={asignada} cambiaJornada={sesion?.rol === "docente"} />;
}
