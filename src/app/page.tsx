import { Suspense } from "react";
import { jornadaActual } from "@/lib/jornadaActual";
import { ContenidoInicio } from "./ContenidoInicio";

// Inicio (PRD §5.2). Which competencias open depends on the session's
// jornada (PRD §5.11), so the content reads the cookie behind Suspense; the
// hero prerenders into the shell as the fallback.

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<ContenidoInicio jornada={null} />}>
        <InicioJornada />
      </Suspense>
    </main>
  );
}

async function InicioJornada() {
  return <ContenidoInicio jornada={await jornadaActual()} />;
}
