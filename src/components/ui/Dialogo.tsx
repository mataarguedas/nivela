"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// Accessible modal for confirmations. A custom implementation rather than
// <dialog>.showModal() so behavior is identical in WebKit, Firefox and jsdom:
// - focus moves inside on open and Tab / Shift+Tab wrap within the panel;
// - the rest of the page is made `inert` and stops scrolling;
// - Escape or tapping the backdrop calls `alCerrar`;
// - focus returns to the element that opened it.

type DialogoProps = {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: ReactNode;
  children?: ReactNode;
  /** Buttons row. Put the safe choice ("Cancelar") first in the markup. */
  acciones?: ReactNode;
  /** Element to focus on open; defaults to the first focusable one. */
  focoInicial?: RefObject<HTMLElement | null>;
};

const ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function enfocables(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(ENFOCABLES));
}

const suscribirNada = () => () => {};

// Safari doesn't focus a button when it's tapped or clicked, so
// document.activeElement is <body> when the dialog opens. Remember the last
// activated control (capture phase runs before React's handlers) to return
// focus to it instead.
let ultimoActivado: HTMLElement | null = null;
let registrando = false;

function registrarActivaciones() {
  if (registrando) return;
  registrando = true;
  document.addEventListener(
    "click",
    (e) => {
      ultimoActivado = e.target instanceof Element ? e.target.closest<HTMLElement>(ENFOCABLES) : null;
    },
    true,
  );
}

function elementoDeRetorno(): HTMLElement | null {
  const activo = document.activeElement;
  if (activo instanceof HTMLElement && activo !== document.body) return activo;
  return ultimoActivado;
}

export function Dialogo({ abierto, alCerrar, titulo, descripcion, children, acciones, focoInicial }: DialogoProps) {
  // False on the server and during hydration, so the portal never mismatches.
  const montado = useSyncExternalStore(
    suscribirNada,
    () => true,
    () => false,
  );
  const capaRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const alCerrarRef = useRef(alCerrar);
  const idTitulo = useId();
  const idDescripcion = useId();

  useEffect(() => {
    alCerrarRef.current = alCerrar;
  });

  useEffect(registrarActivaciones, []);

  useEffect(() => {
    const capa = capaRef.current;
    const panel = panelRef.current;
    if (!abierto || !capa || !panel) return;

    const previo = elementoDeRetorno();

    const inertes: Element[] = [];
    for (const hermano of Array.from(document.body.children)) {
      if (hermano !== capa && !hermano.hasAttribute("inert")) {
        hermano.setAttribute("inert", "");
        inertes.push(hermano);
      }
    }
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    (focoInicial?.current ?? enfocables(panel)[0] ?? panel).focus();

    function alTeclear(e: KeyboardEvent) {
      if (!panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        alCerrarRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables(panel);
      if (lista.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      const fuera = !panel.contains(activo);
      if (e.shiftKey && (activo === primero || fuera)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || fuera)) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      for (const hermano of inertes) hermano.removeAttribute("inert");
      document.body.style.overflow = overflowPrevio;
      if (previo?.isConnected) previo.focus();
    };
  }, [abierto, montado, focoInicial]);

  if (!abierto || !montado) return null;

  return createPortal(
    <div
      ref={capaRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]"
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrarRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined}
        tabIndex={-1}
        className="max-h-full w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-tile bg-surface p-6"
      >
        <h2 id={idTitulo} className="text-sub font-semibold text-ink">
          {titulo}
        </h2>
        {descripcion && (
          <div id={idDescripcion} className="mt-3 text-body text-ink-3">
            {descripcion}
          </div>
        )}
        {children && <div className="mt-4">{children}</div>}
        {acciones && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{acciones}</div>}
      </div>
    </div>,
    document.body,
  );
}
