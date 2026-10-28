import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import { cargarEstadoParticipantes } from "@/lib/db/participantes";
import { getSesion } from "@/lib/sesion";
import { EditorParticipantes } from "./EditorParticipantes";

// /admin (PRD §5.10): the admin sets how many participants there are and
// their names. The header prerenders; the editor streams in behind Suspense
// once the role is re-checked here (not only in proxy.ts) and the current
// list is read from the DB at request time.

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

  const estado = await cargarEstadoParticipantes("/admin");
  if (!estado) {
    return (
      <p role="alert" className="px-4 pt-6 text-center text-body text-ink">
        {TEXTOS.lista.errorCarga}
      </p>
    );
  }
  return <EditorParticipantes inicial={estado} />;
}
