import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { TEXTOS } from "@/config/textos";

// 404 page, in Spanish, replacing Next's English default. Shown for unknown
// URLs and for disabled or unknown competencias (PRD §5.2).

export const metadata: Metadata = {
  title: "Página no encontrada · Nivela",
};

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-14 pb-[max(40px,env(safe-area-inset-bottom))] text-center md:pt-24">
      <h1 className="text-h3 font-semibold md:text-h2">{TEXTOS.noEncontrado.titulo}</h1>
      <p className="mt-3 max-w-[480px] text-body text-ink-3">{TEXTOS.noEncontrado.descripcion}</p>
      <div className="mt-8">
        <Boton href="/">{TEXTOS.noEncontrado.volver}</Boton>
      </div>
    </main>
  );
}
