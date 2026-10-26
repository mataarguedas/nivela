"use client";

import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoTexto } from "@/components/ui/Campo";
import { FONDO_NIVEL } from "@/components/ui/coloresNivel";
import { IconoAlerta } from "@/components/ui/iconos";
import type { Indicador } from "@/config/competencias";
import { LARGO_MAXIMO_DESCRIPCION_IA, LARGO_MAXIMO_OBSERVACION, LARGO_MINIMO_DESCRIPCION_IA } from "@/config/limites";
import { NIVELES, obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { observacionConTexto, type MetadatosIa } from "@/lib/borrador";
import { formatearEntero, formatearPorcentaje } from "@/lib/formato";
import { analizarTexto, UMBRAL_PERTINENCIA, type SugerenciaJev } from "@/lib/sugerencia";

// "¿No está seguro del nivel?" (PRD §5.6): the evaluator describes what they
// saw, "Analizar" asks /api/jev, and the card shows Jev's suggestion. Nothing
// is applied until the evaluator taps an "Aplicar" button. Only the
// competencia id, the indicator id and the text are sent: never the
// participant or the evaluator.
//
// Result states: normal ("Nivel sugerido: … · 78 %" + "Aplicar sugerencia"),
// low confidence (the top two levels, each with "Aplicar"), off-topic (a
// warning, suggestion muted but still usable) and error. Any failure leaves
// manual rating untouched. "Analizar" is the only filled button in the
// panel; the screen keeps one panel open at a time.

type PanelSugerenciaProps = {
  competenciaId: string;
  indicador: Indicador;
  /** The indicator's current observation, for "Usar este texto como observación". */
  observacionActual: string | undefined;
  /** `observacion` is the new observation text when the copy is on. */
  alAplicar: (nivel: NivelValor, ia: MetadatosIa, observacion?: string) => void;
};

type Estado =
  | { tipo: "inactivo" }
  | { tipo: "analizando" }
  | { tipo: "resultado"; sugerencia: SugerenciaJev; textoAnalizado: string }
  | { tipo: "error"; sesionExpirada: boolean };

export function PanelSugerencia({ competenciaId, indicador, observacionActual, alAplicar }: PanelSugerenciaProps) {
  const [texto, setTexto] = useState("");
  const [errorCampo, setErrorCampo] = useState<string | undefined>();
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });
  const [usarTexto, setUsarTexto] = useState(true);
  const [aplicado, setAplicado] = useState<NivelValor | null>(null);
  const solicitud = useRef<AbortController | null>(null);

  // Abort on unmount, and when Next hides the page (its effects are cleaned
  // up then, but the state is kept): the request is then reset to inactivo.
  useEffect(() => () => solicitud.current?.abort(), []);

  async function analizar() {
    const limpio = texto.trim();
    if (limpio.length < LARGO_MINIMO_DESCRIPCION_IA) {
      setErrorCampo(TEXTOS.ia.minimo(formatearEntero(LARGO_MINIMO_DESCRIPCION_IA)));
      return;
    }
    solicitud.current?.abort();
    const control = new AbortController();
    solicitud.current = control;
    setErrorCampo(undefined);
    setAplicado(null);
    setEstado({ tipo: "analizando" });

    const respuesta = await analizarTexto({ competenciaId, indicadorId: indicador.id, texto: limpio }, control.signal);
    if (control.signal.aborted) {
      if (solicitud.current === control) setEstado({ tipo: "inactivo" });
      return;
    }
    if (respuesta.ok) {
      setUsarTexto(true);
      setEstado({ tipo: "resultado", sugerencia: respuesta.sugerencia, textoAnalizado: limpio });
    } else {
      setEstado({ tipo: "error", sesionExpirada: respuesta.status === 401 });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-tile bg-surface p-4">
      <CampoTexto
        etiqueta={TEXTOS.ia.describa}
        ayuda={TEXTOS.ia.sinNombres}
        error={errorCampo}
        maxLength={LARGO_MAXIMO_DESCRIPCION_IA}
        rows={4}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (errorCampo) setErrorCampo(undefined);
        }}
      />
      <div>
        <Boton onClick={analizar} cargando={estado.tipo === "analizando"} textoCargando={TEXTOS.ia.analizando}>
          {TEXTOS.ia.analizar}
        </Boton>
      </div>

      {/* Always mounted so screen readers announce the message when it appears. */}
      <div role="alert" className="text-[14px] text-ink empty:hidden">
        {estado.tipo === "error" && (
          <p className="flex items-start gap-1.5 font-semibold">
            <IconoAlerta className="mt-px shrink-0" />
            {estado.sesionExpirada ? TEXTOS.sesion.expirada : TEXTOS.ia.error}
          </p>
        )}
      </div>

      {estado.tipo === "resultado" && (
        <Resultado
          sugerencia={estado.sugerencia}
          observacionCopiada={observacionConTexto(observacionActual, estado.textoAnalizado, LARGO_MAXIMO_OBSERVACION)}
          usarTexto={usarTexto}
          alCambiarUsarTexto={setUsarTexto}
          alAplicar={(nivel, observacion) => {
            const { nivelSugerido, probabilidades, confianza, modelo } = estado.sugerencia;
            alAplicar(nivel, { nivelSugerido, probabilidades, confianza, modelo }, observacion);
            setAplicado(nivel);
          }}
        />
      )}

      <p role="status" className="text-[14px] text-ink-3 empty:hidden">
        {aplicado !== null ? TEXTOS.ia.aplicado(obtenerNivel(aplicado).etiqueta) : ""}
      </p>
    </div>
  );
}

type ResultadoProps = {
  sugerencia: SugerenciaJev;
  /** The observation after copying the text in, or null when it wouldn't fit. */
  observacionCopiada: string | null;
  usarTexto: boolean;
  alCambiarUsarTexto: (usar: boolean) => void;
  alAplicar: (nivel: NivelValor, observacion?: string) => void;
};

function Resultado({ sugerencia, observacionCopiada, usarTexto, alCambiarUsarTexto, alAplicar }: ResultadoProps) {
  const pertinente = sugerencia.pertinencia >= UMBRAL_PERTINENCIA;
  const copiable = observacionCopiada !== null;
  const copiar = usarTexto && copiable;
  const aplicar = (nivel: NivelValor) => alAplicar(nivel, copiar ? observacionCopiada : undefined);
  const porcentaje = (nivel: NivelValor) => formatearPorcentaje(sugerencia.probabilidades[String(nivel)]);
  const opciones: NivelValor[] =
    sugerencia.baja_confianza && sugerencia.alternativa !== null
      ? [sugerencia.nivelSugerido, sugerencia.alternativa]
      : [sugerencia.nivelSugerido];

  return (
    <div className="flex flex-col gap-4 rounded-tile bg-canvas p-4">
      {!pertinente && (
        <p className="flex items-start gap-1.5 text-[14px] font-semibold text-ink">
          <IconoAlerta className="mt-px shrink-0" />
          {TEXTOS.ia.noPertinente}
        </p>
      )}

      {/* Off-topic: still usable, but visibly muted. */}
      <div className={`flex flex-col gap-4 ${pertinente ? "text-ink" : "text-ink-2"}`}>
        {opciones.length === 1 ? (
          <p className="text-sub font-semibold">
            {TEXTOS.ia.nivelSugerido(obtenerNivel(sugerencia.nivelSugerido).etiqueta, porcentaje(sugerencia.nivelSugerido))}
          </p>
        ) : (
          <p className="text-body font-semibold">{TEXTOS.ia.bajaConfianza}</p>
        )}

        <ul aria-label={TEXTOS.ia.probabilidades} className="flex flex-col gap-2">
          {NIVELES.map((n) => (
            <li key={n.valor} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 text-[14px]">
              <span>{n.etiqueta}</span>
              <span aria-hidden="true" className={`h-2 overflow-hidden rounded-pill bg-surface ${pertinente ? "" : "opacity-50"}`}>
                <span
                  className={`block h-full rounded-pill ${FONDO_NIVEL[n.valor]}`}
                  style={{ width: `${Math.round(sugerencia.probabilidades[String(n.valor)] * 100)}%` }}
                />
              </span>
              <span className="text-right tabular-nums">{porcentaje(n.valor)}</span>
            </li>
          ))}
        </ul>

        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body has-disabled:cursor-not-allowed has-disabled:opacity-40">
            <input
              type="checkbox"
              checked={copiar}
              disabled={!copiable}
              onChange={(e) => alCambiarUsarTexto(e.target.checked)}
              className="size-5 shrink-0 accent-link"
            />
            {TEXTOS.ia.usarComoObservacion}
          </label>
          {!copiable && (
            <p className="text-[14px] text-ink-2">{TEXTOS.ia.textoMuyLargo(formatearEntero(LARGO_MAXIMO_OBSERVACION))}</p>
          )}
        </div>

        {opciones.length === 1 ? (
          <div>
            <Boton variante="secundario" onClick={() => aplicar(sugerencia.nivelSugerido)}>
              {TEXTOS.ia.aplicarSugerencia}
            </Boton>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {opciones.map((nivel) => {
              const etiqueta = obtenerNivel(nivel).etiqueta;
              return (
                <li key={nivel} className="flex items-center justify-between gap-3 rounded-tile bg-surface py-1 pr-1 pl-4">
                  <span className="text-body font-semibold">
                    {etiqueta} · {porcentaje(nivel)}
                  </span>
                  <Boton variante="secundario" aria-label={TEXTOS.ia.aplicarNivel(etiqueta)} onClick={() => aplicar(nivel)}>
                    {TEXTOS.ia.aplicar}
                  </Boton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
