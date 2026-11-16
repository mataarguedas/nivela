import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TEXTOS } from "@/config/textos";
import { leerBuzon, MAXIMO_BUZON, modoCorreo } from "@/lib/correo";
import { formatearFechaHora } from "@/lib/formato";

// Dev-only outbox of the "consola" email transport (PRD §13 Email): the last
// messages the app "sent", rendered as the recipient would see them, with the
// plain-text version. 404 in production. Read at request time.

export const metadata: Metadata = {
  title: "Correos · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaCorreos() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-[980px] flex-1 px-4 pt-12 pb-16 md:pt-16">
      <header className="mb-8 text-center">
        <h1 className="text-h2 font-semibold md:text-display">Correos enviados</h1>
        <p className="mt-3 text-body text-ink-3">
          Modo «consola»: estos correos no salieron del servidor. Se muestran los últimos {MAXIMO_BUZON}.
        </p>
      </header>
      <Suspense fallback={<p className="text-center text-body text-ink-2">{TEXTOS.ui.cargando}</p>}>
        <Buzon />
      </Suspense>
    </main>
  );
}

async function Buzon() {
  await connection();
  if (modoCorreo() !== "consola") {
    return <p className="text-center text-body text-ink-2">CORREO_MODO es «resend»: los correos salen por Resend y no se guardan aquí.</p>;
  }
  const mensajes = leerBuzon();
  if (mensajes.length === 0) {
    return <p className="text-center text-body text-ink-2">Todavía no se ha enviado ningún correo.</p>;
  }
  return (
    <ol className="flex flex-col gap-12">
      {mensajes.map((m) => (
        <li key={m.id} className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
            <dt className="text-ink-2">Para</dt>
            <dd className="min-w-0 break-all">{m.para}</dd>
            <dt className="text-ink-2">Asunto</dt>
            <dd>{m.asunto}</dd>
            <dt className="text-ink-2">Plantilla</dt>
            <dd>{m.plantilla}</dd>
            <dt className="text-ink-2">Enviado</dt>
            <dd>{formatearFechaHora(m.enviadoEn)}</dd>
          </dl>
          {/* sandbox="": the email's HTML can't run scripts or navigate this page. */}
          <iframe
            title={`Vista del correo: ${m.asunto}`}
            srcDoc={m.html}
            sandbox=""
            className="h-[520px] w-full rounded-tile bg-surface"
          />
          <details className="text-[14px]">
            <summary className="min-h-11 cursor-pointer py-3 text-link">Versión de texto</summary>
            <pre className="overflow-x-auto rounded-tile bg-surface p-4 text-[14px] whitespace-pre-wrap">{m.texto}</pre>
          </details>
        </li>
      ))}
    </ol>
  );
}
