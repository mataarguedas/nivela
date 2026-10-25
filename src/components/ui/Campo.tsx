"use client";

import { useId, useState, type ChangeEvent, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { TEXTOS } from "@/config/textos";
import { formatearEntero } from "@/lib/formato";
import { IconoAlerta } from "./iconos";

// Labelled form fields. `Campo` is a single-line input, `CampoTexto` a
// textarea; both share the label, helper, error and counter frame. The text
// is 17 px (≥ 16 px), so iOS Safari doesn't zoom on focus. A counter appears
// whenever `maxLength` is set. Works controlled (`value`) or uncontrolled.

type Comunes = {
  etiqueta: string;
  ayuda?: ReactNode;
  /** Shown below the field; also sets aria-invalid. */
  error?: string;
};

type CampoProps = Comunes & Omit<ComponentPropsWithoutRef<"input">, keyof Comunes | "id"> & { id?: string };
type CampoTextoProps = Comunes & Omit<ComponentPropsWithoutRef<"textarea">, keyof Comunes | "id"> & { id?: string };

const CONTROL =
  "block w-full min-h-11 rounded-tile bg-surface text-body text-ink placeholder:text-ink-2 disabled:opacity-40";
// Error state: thicker border plus an icon and text. The palette has no
// error color, so the message never relies on color alone.
const BORDE_NORMAL = "border border-hairline px-4 py-[11px] focus:border-link";
const BORDE_ERROR = "border-2 border-ink px-[15px] py-[10px]";

export function Campo({ etiqueta, ayuda, error, id, className, ...input }: CampoProps) {
  const marco = useMarcoCampo({ id, value: input.value, defaultValue: input.defaultValue, error, ayuda, maxLength: input.maxLength });
  return (
    <MarcoCampo {...marco.marco} etiqueta={etiqueta} ayuda={ayuda} error={error} maxLength={input.maxLength} className={className}>
      <input
        {...input}
        id={marco.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={unirIds(marco.describedBy, input["aria-describedby"])}
        onChange={(e) => {
          marco.alCambiar(e);
          input.onChange?.(e);
        }}
        className={`${CONTROL} ${error ? BORDE_ERROR : BORDE_NORMAL}`}
      />
    </MarcoCampo>
  );
}

export function CampoTexto({ etiqueta, ayuda, error, id, className, rows = 4, ...textarea }: CampoTextoProps) {
  const marco = useMarcoCampo({
    id,
    value: textarea.value,
    defaultValue: textarea.defaultValue,
    error,
    ayuda,
    maxLength: textarea.maxLength,
  });
  return (
    <MarcoCampo {...marco.marco} etiqueta={etiqueta} ayuda={ayuda} error={error} maxLength={textarea.maxLength} className={className}>
      <textarea
        {...textarea}
        id={marco.id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={unirIds(marco.describedBy, textarea["aria-describedby"])}
        onChange={(e) => {
          marco.alCambiar(e);
          textarea.onChange?.(e);
        }}
        className={`${CONTROL} resize-y ${error ? BORDE_ERROR : BORDE_NORMAL}`}
      />
    </MarcoCampo>
  );
}

type ValorNativo = string | number | readonly string[] | undefined;

function longitudDe(valor: ValorNativo): number {
  return valor === undefined ? 0 : String(valor).length;
}

function useMarcoCampo(opciones: {
  id?: string;
  value: ValorNativo;
  defaultValue: ValorNativo;
  error?: string;
  ayuda?: ReactNode;
  maxLength?: number;
}) {
  const generado = useId();
  const id = opciones.id ?? generado;
  const ids = { ayuda: `${id}-ayuda`, error: `${id}-error`, contador: `${id}-contador` };
  // Only used when uncontrolled; a controlled field derives its length from `value`.
  const [longitudLocal, setLongitudLocal] = useState(() => longitudDe(opciones.defaultValue));
  const longitud = opciones.value !== undefined ? longitudDe(opciones.value) : longitudLocal;

  return {
    id,
    describedBy: unirIds(
      opciones.ayuda ? ids.ayuda : undefined,
      opciones.error ? ids.error : undefined,
      opciones.maxLength !== undefined ? ids.contador : undefined,
    ),
    alCambiar: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLongitudLocal(e.target.value.length),
    marco: { id, ids, longitud },
  };
}

type MarcoCampoProps = Comunes & {
  id: string;
  ids: { ayuda: string; error: string; contador: string };
  longitud: number;
  maxLength?: number;
  className?: string;
  children: ReactNode;
};

function MarcoCampo({ id, ids, etiqueta, ayuda, error, longitud, maxLength, className, children }: MarcoCampoProps) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {etiqueta}
      </label>
      {children}
      {(ayuda || maxLength !== undefined) && (
        <div className="flex items-start justify-between gap-3 text-[14px] text-ink-2">
          {ayuda ? <p id={ids.ayuda}>{ayuda}</p> : <span />}
          {maxLength !== undefined && (
            <span id={ids.contador} className="shrink-0 tabular-nums">
              <span aria-hidden="true">
                {formatearEntero(longitud)} / {formatearEntero(maxLength)}
              </span>
              <span className="sr-only">{TEXTOS.ui.contador(formatearEntero(longitud), formatearEntero(maxLength))}</span>
            </span>
          )}
        </div>
      )}
      {error && (
        <p id={ids.error} className="flex items-start gap-1.5 text-[14px] font-semibold text-ink">
          <IconoAlerta className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function unirIds(...ids: (string | undefined)[]): string | undefined {
  const unidos = ids.filter(Boolean).join(" ");
  return unidos || undefined;
}
