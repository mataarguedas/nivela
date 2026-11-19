"use client";

import { useRef, useState, type FormEvent } from "react";
import { BarraInferior } from "@/components/ui/BarraInferior";
import { Boton } from "@/components/ui/Boton";
import { Campo, CampoTexto } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { useToast } from "@/components/ui/Toast";
import type { JornadaId } from "@/config/jornadas";
import { CANTIDAD_MAXIMA_PARTICIPANTES, esCarnetValido, esGrupoValido, esNombreValido } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";
import type { EstadoParticipantes } from "@/lib/db/participantes";
import { esCorreoParticipanteValido, indiceCarnetRepetido, type CuerpoParticipantes } from "@/lib/validacion";

// The admin's participant editor (PRD §5.10): a count, then a name, a carnet,
// a group (v1.8, the COFI group evaluators see the list split by) and an
// optional email field per participant (evaluators see the name; the
// reports show only the carnet; the email is only for sending results, §5.14). Lowering the count only hides rows: their data stays in
// state (and in the DB once saved), so raising it again brings them back.
// "Pegar lista" fills the rows from one-per-line text, e.g. spreadsheet
// columns (carnet, name and email, tab- or ";"-separated) or names alone. Saving PUTs the list; a 409 means hidden participants already have
// evaluations, and the dialog asks before resending with `confirmar`. The
// list is the jornada's the page loaded (PRD §5.11): the body names it, and
// the server refuses (409 `jornadaDistinta`) if the session switched since.

type Errores = {
  cantidad?: string;
  nombres: Record<number, string>;
  carnets: Record<number, string>;
  grupos: Record<number, string>;
  correos: Record<number, string>;
  general?: string;
};
type Confirmacion = { ocultos: number; evaluaciones: number };

const SIN_ERRORES: Errores = { nombres: {}, carnets: {}, grupos: {}, correos: {} };

// A pasted field that is a carnet: carnet characters and at least one digit
// (so a one-word name is never taken for one).
const PARECE_CARNET = /^(?=.*\d)[0-9A-Za-z-]+$/;

// A pasted group: "Grupo 3" (the word is required, so a short carnet is never taken for one).
const PARECE_GRUPO = /^grupo\s*(\d{1,2})$/i;

/**
 * One pasted line → name, carnet, group and email. "100000001<TAB>Ana Mora",
 * "Ana Mora;100000001;Grupo 2;ana@ejemplo.test" or "Ana Mora". A field with
 * "@" is the email (a name never has one, PRD §5.10) and "Grupo N" is the
 * group; of the rest, a field that looks like a carnet is the carnet, and
 * what is left is the name.
 */
export function leerLineaPegada(linea: string): { nombre: string; carnet: string; grupo: string; correo: string } {
  const todos = linea
    .split(/\t|;/)
    .map((c) => c.trim())
    .filter(Boolean);
  const indiceCorreo = todos.findIndex((c) => c.includes("@"));
  const correo = indiceCorreo < 0 ? "" : todos[indiceCorreo];
  const indiceGrupo = todos.findIndex((c) => PARECE_GRUPO.test(c));
  const coincidencia = indiceGrupo < 0 ? null : PARECE_GRUPO.exec(todos[indiceGrupo]);
  const grupo = coincidencia ? String(Number(coincidencia[1])) : "";
  const campos = todos.filter((_, i) => i !== indiceCorreo && i !== indiceGrupo);
  const indice = campos.length > 1 ? campos.findIndex((c) => PARECE_CARNET.test(c)) : -1;
  if (indice < 0) return { nombre: campos.join(" "), carnet: "", grupo, correo };
  return { nombre: campos.filter((_, i) => i !== indice).join(" "), carnet: campos[indice], grupo, correo };
}

/** The group field's text → its number, null when blank, NaN when it isn't a valid group. */
function leerGrupo(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  const n = /^\d{1,2}$/.test(limpio) ? Number(limpio) : Number.NaN;
  return esGrupoValido(n) ? n : Number.NaN;
}

function leerCantidad(texto: string): number | null {
  if (!/^\d{1,2}$/.test(texto.trim())) return null;
  const n = Number(texto);
  return n >= 1 && n <= CANTIDAD_MAXIMA_PARTICIPANTES ? n : null;
}

/** At least `largo` entries, so every visible row has a value. */
function completar(nombres: readonly string[], largo: number): string[] {
  return nombres.length >= largo ? [...nombres] : [...nombres, ...Array.from({ length: largo - nombres.length }, () => "")];
}

export function EditorParticipantes({ inicial, jornada }: { inicial: EstadoParticipantes; jornada: JornadaId }) {
  const { mostrar } = useToast();
  const [textoCantidad, setTextoCantidad] = useState(String(inicial.cantidad));
  const [cantidad, setCantidad] = useState(inicial.cantidad);
  const [nombres, setNombres] = useState(() => completar(inicial.nombres.map((n) => n ?? ""), inicial.cantidad));
  const [carnets, setCarnets] = useState(() => completar(inicial.carnets.map((c) => c ?? ""), inicial.cantidad));
  const [grupos, setGrupos] = useState(() =>
    completar((inicial.grupos ?? []).map((g) => (g === null ? "" : String(g))), inicial.cantidad),
  );
  const [correos, setCorreos] = useState(() => completar(inicial.correos.map((c) => c ?? ""), inicial.cantidad));
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
    setCarnets((actuales) => completar(actuales, n));
    setGrupos((actuales) => completar(actuales, n));
    setCorreos((actuales) => completar(actuales, n));
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

  function cambiarCarnet(indice: number, valor: string) {
    setCarnets((actuales) => actuales.map((c, i) => (i === indice ? valor : c)));
    if (errores.carnets[indice]) {
      setErrores((e) => {
        const resto = { ...e.carnets };
        delete resto[indice];
        return { ...e, carnets: resto };
      });
    }
  }

  function cambiarGrupo(indice: number, valor: string) {
    setGrupos((actuales) => actuales.map((g, i) => (i === indice ? valor : g)));
    if (errores.grupos[indice]) {
      setErrores((e) => {
        const resto = { ...e.grupos };
        delete resto[indice];
        return { ...e, grupos: resto };
      });
    }
  }

  function cambiarCorreo(indice: number, valor: string) {
    setCorreos((actuales) => actuales.map((c, i) => (i === indice ? valor : c)));
    if (errores.correos[indice]) {
      setErrores((e) => {
        const resto = { ...e.correos };
        delete resto[indice];
        return { ...e, correos: resto };
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
    // Rows past the new count stay, hidden, as when the count is lowered. A
    // pasted line replaces its row's name, carnet, group and email (a line without
    // one clears it, so an old carnet or email never sticks to a new name:
    // results must never go to another person's address).
    const filas = lineas.map(leerLineaPegada);
    setNombres((actuales) => [...filas.map((f) => f.nombre), ...actuales.slice(filas.length)]);
    setCarnets((actuales) => [...filas.map((f) => f.carnet), ...actuales.slice(filas.length)]);
    setGrupos((actuales) => [...filas.map((f) => f.grupo), ...actuales.slice(filas.length)]);
    setCorreos((actuales) => [...filas.map((f) => f.correo), ...actuales.slice(filas.length)]);
    setCantidad(lineas.length);
    setTextoCantidad(String(lineas.length));
    setErrores(SIN_ERRORES);
    setErrorPegado(undefined);
    setTextoPegado("");
    setPegando(false);
  }

  /** Client-side check with the server's rules; focuses the first problem. */
  function validar(): boolean {
    const nuevos: Errores = { nombres: {}, carnets: {}, grupos: {}, correos: {} };
    if (leerCantidad(textoCantidad) === null) nuevos.cantidad = TEXTOS_ADMIN.cantidadInvalida;
    nombres.slice(0, cantidad).forEach((nombre, i) => {
      if (!esNombreValido(nombre.trim())) nuevos.nombres[i] = TEXTOS_ADMIN.nombreInvalido(i + 1);
    });
    const visibles = carnets.slice(0, cantidad).map((c) => c.trim());
    visibles.forEach((carnet, i) => {
      if (!esCarnetValido(carnet)) nuevos.carnets[i] = TEXTOS_ADMIN.carneInvalido(i + 1);
    });
    const repetido = indiceCarnetRepetido(visibles.map((c) => c || null));
    if (repetido >= 0 && !nuevos.carnets[repetido]) nuevos.carnets[repetido] = TEXTOS_ADMIN.carneRepetido(repetido + 1);
    grupos.slice(0, cantidad).forEach((grupo, i) => {
      if (Number.isNaN(leerGrupo(grupo))) nuevos.grupos[i] = TEXTOS_ADMIN.grupoInvalido(i + 1);
    });
    correos.slice(0, cantidad).forEach((correo, i) => {
      if (!esCorreoParticipanteValido(correo)) nuevos.correos[i] = TEXTOS_ADMIN.correoInvalido(i + 1);
    });
    setErrores(nuevos);
    const valido =
      !nuevos.cantidad &&
      Object.keys(nuevos.nombres).length === 0 &&
      Object.keys(nuevos.carnets).length === 0 &&
      Object.keys(nuevos.grupos).length === 0 &&
      Object.keys(nuevos.correos).length === 0;
    if (!valido) {
      requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
    }
    return valido;
  }

  async function guardar(confirmar: boolean) {
    setGuardando(true);
    setErrores(SIN_ERRORES);
    const cuerpo: CuerpoParticipantes = {
      jornada,
      cantidad,
      nombres: nombres.slice(0, cantidad).map((n) => n.trim()),
      carnets: carnets.slice(0, cantidad).map((c) => c.trim()),
      grupos: grupos.slice(0, cantidad).map(leerGrupo),
      correos: correos.slice(0, cantidad).map((c) => c.trim()),
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
        jornadaDistinta?: boolean;
      };
      if (respuesta.ok) {
        mostrar(TEXTOS_ADMIN.guardado);
      } else if (respuesta.status === 409 && !datos.jornadaDistinta) {
        setConfirmacion({ ocultos: datos.ocultos ?? 0, evaluaciones: datos.evaluacionesAfectadas ?? 0 });
      } else {
        setErrores({ ...SIN_ERRORES, general: datos.error ?? TEXTOS_ADMIN.errorGuardar });
      }
    } catch {
      setErrores({ ...SIN_ERRORES, general: TEXTOS_ADMIN.errorGuardar });
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
              <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-x-3">
                <Campo
                  etiqueta={TEXTOS_ADMIN.participante(i + 1)}
                  error={errores.nombres[i]}
                  value={nombre}
                  onChange={(e) => cambiarNombre(i, e.target.value)}
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                />
                <Campo
                  etiqueta={TEXTOS_ADMIN.carneDe(i + 1)}
                  error={errores.carnets[i]}
                  value={carnets[i] ?? ""}
                  onChange={(e) => cambiarCarnet(i, e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <Campo
                  etiqueta={TEXTOS_ADMIN.correoDe(i + 1)}
                  error={errores.correos[i]}
                  value={correos[i] ?? ""}
                  onChange={(e) => cambiarCorreo(i, e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <Campo
                  etiqueta={TEXTOS_ADMIN.grupoDe(i + 1)}
                  error={errores.grupos[i]}
                  value={grupos[i] ?? ""}
                  onChange={(e) => cambiarGrupo(i, e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
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
