import type { Metadata } from "next";
import { Suspense } from "react";
import { MarcaNivela } from "@/components/ui/iconos";
import { TEXTOS } from "@/config/textos";
import { motivoAcceso } from "@/lib/destino";
import { AvisoAcceso } from "./AvisoAcceso";
import { FormularioAcceso } from "./FormularioAcceso";

// /acceso (PRD §5.1): centered hero, then a left-aligned single-field form.
// The hero and the form prerender into the static shell. Only the notice
// depends on the URL, so only it streams in behind Suspense (Cache
// Components). The form must not sit inside that boundary: swapping a
// fallback copy for the real one would wipe a code typed in the meantime.

export const metadata: Metadata = {
  title: "Acceso · Nivela",
  robots: { index: false, follow: false },
};

export default function PaginaAcceso({ searchParams }: PageProps<"/acceso">) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-14 pb-[max(40px,env(safe-area-inset-bottom))] md:pt-24">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <MarcaNivela className="mb-4 size-12 text-ink" />
          <h1 className="text-h2 font-semibold md:text-display">{TEXTOS.app.nombre}</h1>
          <p className="mt-3 text-sub text-ink-3">{TEXTOS.app.lema}</p>
        </div>
        <Suspense fallback={null}>
          <AvisoSegunUrl searchParams={searchParams} />
        </Suspense>
        <FormularioAcceso />
      </div>
    </main>
  );
}

async function AvisoSegunUrl({ searchParams }: Pick<PageProps<"/acceso">, "searchParams">) {
  const { motivo } = await searchParams;
  return <AvisoAcceso motivo={motivoAcceso(Array.isArray(motivo) ? motivo[0] : motivo)} />;
}
