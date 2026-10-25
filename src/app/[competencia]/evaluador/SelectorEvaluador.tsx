"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { IconoCheckCirculo, IconoChevron } from "@/components/ui/iconos";
import { TEXTOS } from "@/config/textos";
import { guardarEvaluador, useEvaluadorSeleccionado } from "@/lib/borrador";

// Tapping a name stores it locally and opens the participant list. Drafts are
// kept per evaluator, so switching from an existing selection to another
// name asks first (PRD §5.3). The current selection is marked like a
// selected level option: 2 px #0066cc border, check icon, semibold.

type IntegranteVisible = { id: string; nombre: string };
export type GrupoCurso = { curso: string; integrantes: IntegranteVisible[] };

type SelectorEvaluadorProps = {
  competenciaId: string;
  grupos: GrupoCurso[];
};

export function SelectorEvaluador({ competenciaId, grupos }: SelectorEvaluadorProps) {
  const router = useRouter();
  const actualId = useEvaluadorSeleccionado(competenciaId);
  const [propuesto, setPropuesto] = useState<IntegranteVisible | null>(null);
  const base = useId();

  const todos = grupos.flatMap((g) => g.integrantes);
  // A stale id (e.g. removed from config) counts as no selection.
  const actual = todos.find((i) => i.id === actualId);

  function continuarCon(integrante: IntegranteVisible) {
    guardarEvaluador(competenciaId, integrante.id);
    router.push(`/${competenciaId}`);
  }

  function elegir(integrante: IntegranteVisible) {
    if (actual && actual.id !== integrante.id) setPropuesto(integrante);
    else continuarCon(integrante);
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {grupos.map((grupo, indice) => {
          const idTitulo = `${base}-curso-${indice}`;
          return (
            <section key={grupo.curso} aria-labelledby={idTitulo}>
              <h2 id={idTitulo} className="mb-3 px-1 text-[14px] font-semibold text-ink-2">
                {grupo.curso}
              </h2>
              <ul className="flex flex-col gap-2">
                {grupo.integrantes.map((integrante) => {
                  const seleccionado = integrante.id === actual?.id;
                  return (
                    <li key={integrante.id}>
                      <button
                        type="button"
                        onClick={() => elegir(integrante)}
                        aria-current={seleccionado ? "true" : undefined}
                        className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-tile bg-surface text-left ${
                          seleccionado ? "border-2 border-link px-[15px] py-[11px]" : "border border-transparent px-4 py-3"
                        }`}
                      >
                        <span className={`min-w-0 flex-1 text-body text-ink ${seleccionado ? "font-semibold" : ""}`}>
                          {integrante.nombre}
                        </span>
                        {seleccionado ? (
                          <IconoCheckCirculo className="shrink-0 text-link" />
                        ) : (
                          <IconoChevron className="shrink-0 text-ink-2" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <Dialogo
        abierto={propuesto !== null}
        alCerrar={() => setPropuesto(null)}
        titulo={TEXTOS.evaluador.cambiarTitulo}
        descripcion={actual && propuesto ? TEXTOS.evaluador.cambiarDescripcion(actual.nombre, propuesto.nombre) : undefined}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setPropuesto(null)}>
              {TEXTOS.ui.cancelar}
            </Boton>
            <Boton
              onClick={() => {
                if (propuesto) continuarCon(propuesto);
                setPropuesto(null);
              }}
            >
              {TEXTOS.evaluador.cambiar}
            </Boton>
          </>
        }
      />
    </>
  );
}
