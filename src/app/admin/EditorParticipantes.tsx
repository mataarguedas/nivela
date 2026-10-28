"use client";

import { useRef, useState, type FormEvent } from "react";
import { BarraInferior } from "@/components/ui/BarraInferior";
import { Boton } from "@/components/ui/Boton";
import { Campo, CampoTexto } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { useToast } from "@/components/ui/Toast";
import { CANTIDAD_MAXIMA_PARTICIPANTES, esNombreValido } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import type { EstadoParticipantes } from "@/lib/db/participantes";
import type { CuerpoParticipantes } from "@/lib/validacion";

// The admin's participant editor (PRD §5.10): a count, then one name field
// per participant. Lowering the count only hides rows: their names stay in
// state (and in the DB once saved), so raising it again brings them back.
// "Pegar lista" fills the names from one-per-line text, e.g. a spreadsheet
// column. Saving PUTs the list; a 409 means hidden participants already have
// evaluations, and the dialog asks before resending with `confirmar`.

type Errores = { cantidad?: string; nombres: Record<number, string>; general?: string };
type Confirmacion = { ocultos: number; evaluaciones: number };

const SIN_ERRORES: Errores = { nombres: {} };

function leerCantidad(texto: string): number | null {
  if (!/^\d{1,2}$/.test(texto.trim())) return null;
  const n = Number(texto);
  return n >= 1 && n <= CANTIDAD_MAXIMA_PARTICIPANTES ? n : null;
}

/** At least `largo` entries, so every visible row has a value. */
function completar(nombres: readonly string[], largo: number): string[] {
  return nombres.length >= largo ? [...nombres] : [...nombres, ...Array.from({ length: largo - nombres.length }, () => "")];
}

export function EditorParticipantes({ inicial }: { inicial: EstadoParticipantes }) {
  const { mostrar } = useToast();
  const [textoCantidad, setTextoCantidad] = useState(String(inicial.cantidad));
  const [cantidad, setCantidad] = useState(inicial.cantidad);
  const [nombres, setNombres] = useState(() => completar(inicial.nombres.map((n) => n ?? ""), inicial.cantidad));
  const [pegando, setPegando] = useState(false);
  const [textoPegado, setTextoPegado] = useState("");
  const [errorPegado, setErrorPegado] = useState<string>();
  const [errores, setErrores] = useState<Errores>(SIN_ERRORES);
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  function cambiarCantidad(texto: string) {
    setTextoCantidad(texto);
    const n = leerCantidad(texto);
    if (n === null) return;
    setCantidad(n);
    setNombres((actuales) => completar(actuales, n));
    setErrores((e) => ({ ...e, cantidad: undefined }));
  }

  function cambiarNombre(indice: number, valor: string) {
    setNombres((actuales) => actuales.map((n, i) => (i === indice ? valor : n)));
    if (errores.nombres[indice]) {
      setErrores((e) => {
        const resto = { ...e.nombres };
        delete resto[indice];
        return { ...e, nombres: resto };
      });
    }
  }

  function usarLista() {
    const lineas = textoPegado
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lineas.length === 0 || lineas.length > CANTIDAD_MAXIMA_PARTICIPANTES) {
      setErrorPegado(TEXTOS_ADMIN.cantidadInvalida);
      return;
    }
    // Names past the new count stay, hidden, as when the count is lowered.
    setNombres((actuales) => [...lineas, ...actuales.slice(lineas.length)]);
    setCantidad(lineas.length);
    setTextoCantidad(String(lineas.length));
    setErrores(SIN_ERRORES);
    setErrorPegado(undefined);
    setTextoPegado("");
    setPegando(false);
  }

  /** Client-side check with the server's rules; focuses the first problem. */
  function validar(): boolean {
    const nuevos: Errores = { nombres: {} };
    if (leerCantidad(textoCantidad) === null) nuevos.cantidad = TEXTOS_ADMIN.cantidadInvalida;
    nombres.slice(0, cantidad).forEach((nombre, i) => {
      if (!esNombreValido(nombre.trim())) nuevos.nombres[i] = TEXTOS_ADMIN.nombreInvalido(i + 1);
    });
    setErrores(nuevos);
    const valido = !nuevos.cantidad && Object.keys(nuevos.nombres).length === 0;
    if (!valido) {
      requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
    }
    return valido;
  }

  async function guardar(confirmar: boolean) {
    setGuardando(true);
    setErrores(SIN_ERRORES);
    const cuerpo: CuerpoParticipantes = {
      cantidad,
      nombres: nombres.slice(0, cantidad).map((n) => n.trim()),
      confirmar,
    };
    try {
      const respuesta = await fetch("/api/admin/participantes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        ocultos?: number;
        evaluacionesAfectadas?: number;
      };
      if (respuesta.ok) {
        mostrar(TEXTOS_ADMIN.guardado);
      } else if (respuesta.status === 409) {
        setConfirmacion({ ocultos: datos.ocultos ?? 0, evaluaciones: datos.evaluacionesAfectadas ?? 0 });
      } else {
        setErrores({ nombres: {}, general: datos.error ?? TEXTOS_ADMIN.errorGuardar });
      }
    } catch {
      setErrores({ nombres: {}, general: TEXTOS_ADMIN.errorGuardar });
    }
    setGuardando(false);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando || !validar()) return;
    void guardar(false);
  }

  return (
    <form ref={formulario} noValidate onSubmit={alEnviar} className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 pb-10">
        <section className="rounded-tile bg-surface p-4 md:p-6">
          <Campo
            etiqueta={TEXTOS_ADMIN.cantidad}
            ayuda={TEXTOS_ADMIN.ayudaCantidad}
            error={errores.cantidad}
            value={textoCantidad}
            onChange={(e) => cambiarCantidad(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="done"
          />
          <div className="mt-4">
            <Boton variante="secundario" aria-expanded={pegando} onClick={() => setPegando((v) => !v)}>
              {TEXTOS_ADMIN.pegarLista}
            </Boton>
          </div>
          {pegando && (
            <div className="mt-4 flex flex-col gap-3">
              <CampoTexto
                etiqueta={TEXTOS_ADMIN.pegarTitulo}
                ayuda={TEXTOS_ADMIN.pegarAyuda}
                error={errorPegado}
                rows={8}
                value={textoPegado}
                onChange={(e) => setTextoPegado(e.target.value)}
                autoComplete="off"
              />
              <div>
                <Boton variante="secundario" onClick={usarLista}>
                  {TEXTOS_ADMIN.usarLista}
                </Boton>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="nombres-titulo" className="rounded-tile bg-surface p-4 md:p-6">
          <h2 id="nombres-titulo" className="text-sub font-semibold">
            {TEXTOS_ADMIN.nombres}
          </h2>
          <p className="mt-1 mb-4 text-caption text-ink-2">{TEXTOS_ADMIN.ayudaNombres}</p>
          <ol className="flex flex-col gap-4">
            {nombres.slice(0, cantidad).map((nombre, i) => (
              <li key={i}>
                <Campo
                  etiqueta={TEXTOS_ADMIN.participante(i + 1)}
                  error={errores.nombres[i]}
                  value={nombre}
                  onChange={(e) => cambiarNombre(i, e.target.value)}
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                />
              </li>
            ))}
          </ol>
        </section>

        {errores.general && (
          <p role="alert" className="rounded-tile bg-surface px-4 py-3 text-body text-ink">
            {errores.general}
          </p>
        )}
      </div>

      <BarraInferior etiqueta={TEXTOS_ADMIN.guardar}>
        <p className="text-[14px] text-ink-3">{TEXTOS_ADMIN.resumen(cantidad)}</p>
        <Boton type="submit" cargando={guardando} textoCargando={TEXTOS_ADMIN.guardando}>
          {TEXTOS_ADMIN.guardar}
        </Boton>
      </BarraInferior>

      <Dialogo
        abierto={confirmacion !== null}
        alCerrar={() => setConfirmacion(null)}
        titulo={TEXTOS_ADMIN.confirmarTitulo}
        descripcion={confirmacion && TEXTOS_ADMIN.confirmarDescripcion(confirmacion.ocultos, confirmacion.evaluaciones)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmacion(null)}>
              {TEXTOS.ui.cancelar}
            </Boton>
            <Boton
              onClick={() => {
                setConfirmacion(null);
                void guardar(true);
              }}
            >
              {TEXTOS_ADMIN.confirmar}
            </Boton>
          </>
        }
      />
    </form>
  );
}
