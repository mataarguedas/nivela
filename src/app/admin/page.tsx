import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SelectorJornada } from "@/components/ui/SelectorJornada";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ADMIN, TEXTOS_CUENTAS } from "@/config/textosAdmin";
import type { JornadaId } from "@/config/jornadas";
import { listarCuentasJornada, type GrupoCuentas } from "@/lib/cuentas";
import { getDb } from "@/lib/db";
import { cargarEstadoParticipantes } from "@/lib/db/participantes";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";
import { CuentasEvaluadores } from "./CuentasEvaluadores";
import { EditorParticipantes } from "./EditorParticipantes";

// /admin (PRD §5.10, §5.11, §5.12): the admin sets how many participants
// there are and their names, per jornada, and manages the jornada's evaluator
// accounts ("Cuentas de evaluadores"). The header prerenders; the jornada switch and
// the editor stream in behind Suspense once the role is re-checked here (not
// only in proxy.ts) and the session jornada's list is read from the DB at
// request time.

export const metadata: Metadata = {
  title: "Participantes · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaAdmin() {
  return (
    // No side padding or bottom inset here: the editor's sticky bar
    // (BarraInferior) is full-bleed and pads for the home indicator itself.
    <main className="flex flex-1 flex-col pt-12 md:pt-16">
      <header className="mx-auto mb-8 w-full max-w-[640px] px-4 text-center">
        <h1 className="text-h2 font-semibold md:text-display">{TEXTOS_ADMIN.titulo}</h1>
        <p className="mt-3 text-body text-ink-3">{TEXTOS_ADMIN.descripcion}</p>
      </header>
      <Suspense fallback={<p className="px-4 pt-6 text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}

async function Editor() {
  await connection();
  const sesion = await getSesion();
  if (sesion?.rol !== "admin") redirect("/acceso?motivo=admin&next=%2Fadmin");

  const { jornada } = sesion;
  const [estado, cuentas] = await Promise.all([cargarEstadoParticipantes("/admin", jornada), cargarCuentas(jornada)]);
  return (
    <>
      <div className="mb-8 px-4">
        <SelectorJornada actual={jornada} />
      </div>
      {estado ? (
        // Keyed by jornada: switching remounts the editor with the other list.
        <EditorParticipantes key={jornada} inicial={estado} jornada={jornada} />
      ) : (
        <p role="alert" className="px-4 pt-6 text-center text-body text-ink">
          {TEXTOS.lista.errorCarga}
        </p>
      )}
      {cuentas ? (
        <CuentasEvaluadores key={`cuentas-${jornada}`} inicial={cuentas} />
      ) : (
        <p role="alert" className="px-4 pt-16 pb-12 text-center text-body text-ink">
          {TEXTOS_CUENTAS.errorCarga}
        </p>
      )}
    </>
  );
}

/** The jornada's accounts, or null on a DB failure (logged without PII). */
async function cargarCuentas(jornada: JornadaId): Promise<GrupoCuentas[] | null> {
  const inicio = Date.now();
  try {
    return await listarCuentasJornada(getDb(), jornada);
  } catch (error) {
    registrarError("/admin", "GET", inicio, error);
    return null;
  }
}
