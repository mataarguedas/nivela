"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { BarraInferior } from "@/components/ui/BarraInferior";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Chip } from "@/components/ui/Chip";
import { Dialogo } from "@/components/ui/Dialogo";
import { useToast } from "@/components/ui/Toast";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ENVIO } from "@/config/textosReportes";
import { formatearEntero, formatearFecha } from "@/lib/formato";
import { yaEnviado, type FilaEnvio, type MotivoOmision } from "@/lib/resultados";
import type { CuerpoEnvioResultados } from "@/lib/validacion";

// "Enviar resultados por correo" (PRD §5.14, v1.13: one general report per
// participant with every competencia of the jornada): recipients, skipped
// participants with their reason, a rendered preview of the exact email for
// one recipient, "Enviarme una prueba", and "Enviar a {n} participantes" (the
// view's single primary button) behind a confirmation. Participants are
// labelled by carnet, like every report; the preview shows the email as the
// participant will receive it. The client only names participants: the
// server recomputes every result. Already-sent participants are left out
// unless "Reenviar" is ticked for them.

export type VistaPrevia = { participanteId: string; etiqueta: string; para: string; asunto: string; html: string };

const RUTA_PAGINA = "/reportes/consolidado/enviar";
const RUTA_API = "/api/reportes/consolidado/enviar";

type Props = {
  destinatarios: FilaEnvio[];
  omitidos: (FilaEnvio & { motivo: MotivoOmision })[];
  previa: VistaPrevia | null;
  /** Competencias with a rubric in the jornada: "{n} de {m} competencias" per recipient. */
  competencias: number;
};

type Respuesta = { enviados?: number; errores?: { participanteId: string; motivo: string }[]; error?: string };

function estadoEnvio(fila: FilaEnvio): string {
  const ultimo = fila.ultimoEnvio;
  if (!ultimo) return TEXTOS_ENVIO.pendiente;
  const fecha = formatearFecha(ultimo.enviadoEn);
  return ultimo.estado === "enviado" ? TEXTOS_ENVIO.enviadoEl(fecha) : TEXTOS_ENVIO.errorEl(fecha);
}

export function EnvioResultados({ destinatarios, omitidos, previa, competencias }: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const idSelector = useId();
  const [reenviar, setReenviar] = useState<ReadonlySet<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resumen, setResumen] = useState<string>();
  const [correoPrueba, setCorreoPrueba] = useState("");
  const [errorPrueba, setErrorPrueba] = useState<string>();
  const [probando, setProbando] = useState(false);
  const [cambiandoPrevia, iniciarCambioPrevia] = useTransition();

  const aEnviar = destinatarios.filter((d) => !yaEnviado(d.ultimoEnvio) || reenviar.has(d.id));

  function alternarReenvio(id: string, marcado: boolean) {
    setReenviar((actual) => {
      const siguiente = new Set(actual);
      if (marcado) siguiente.add(id);
      else siguiente.delete(id);
      return siguiente;
    });
  }

  async function publicar(cuerpo: CuerpoEnvioResultados): Promise<{ ok: boolean; datos: Respuesta }> {
    const respuesta = await fetch(RUTA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    return { ok: respuesta.ok, datos: (await respuesta.json().catch(() => ({}))) as Respuesta };
  }

  async function enviar() {
    setConfirmando(false);
    setEnviando(true);
    setResumen(undefined);
    try {
      const { ok, datos } = await publicar({ participantes: aEnviar.map((d) => d.id), reenviar: reenviar.size > 0 });
      if (!ok) throw new Error(datos.error);
      const errores = datos.errores?.length ?? 0;
      const texto = [TEXTOS_ENVIO.resumenEnviados(datos.enviados ?? 0), errores > 0 ? TEXTOS_ENVIO.resumenErrores(errores) : ""]
        .filter(Boolean)
        .join(" ");
      setResumen(texto);
      mostrar(texto);
      setReenviar(new Set());
      router.refresh();
    } catch {
      setResumen(TEXTOS_ENVIO.errorEnvio);
    }
    setEnviando(false);
  }

  async function enviarPrueba(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!previa || probando) return;
    setErrorPrueba(undefined);
    setProbando(true);
    try {
      const { ok, datos } = await publicar({ prueba: correoPrueba, participanteId: previa.participanteId });
      if (ok) mostrar(TEXTOS_ENVIO.pruebaEnviada);
      else setErrorPrueba(datos.error ?? TEXTOS_ENVIO.pruebaError);
    } catch {
      setErrorPrueba(TEXTOS_ENVIO.pruebaError);
    }
    setProbando(false);
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 pb-10">
        <section aria-labelledby="destinatarios-titulo" className="rounded-tile bg-surface p-4 md:p-6">
          <h2 id="destinatarios-titulo" className="text-sub font-semibold">
            {TEXTOS_ENVIO.destinatarios} ({formatearEntero(destinatarios.length)})
          </h2>
          <p className="mt-1 mb-4 text-caption text-ink-2">{TEXTOS_ENVIO.destinatariosAyuda}</p>
          {destinatarios.length === 0 ? (
            <p className="text-body text-ink-3">{TEXTOS_ENVIO.sinDestinatarios}</p>
          ) : (
            <ul aria-labelledby="destinatarios-titulo" className="flex flex-col">
              {destinatarios.map((d) => {
                const enviado = yaEnviado(d.ultimoEnvio);
                return (
                  <li
                    key={d.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-2 py-2 even:bg-canvas sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                  >
                    <span className="font-semibold break-words">{d.etiqueta}</span>
                    <Chip tono={enviado ? "enviado" : d.ultimoEnvio ? "medio" : "suave"} className="justify-self-end sm:order-3">
                      {estadoEnvio(d)}
                    </Chip>
                    <span className="text-caption text-ink-2 sm:order-2">
                      {TEXTOS_ENVIO.cobertura(formatearEntero(d.competenciasEvaluadas), formatearEntero(competencias))} ·{" "}
                      {TEXTOS_ENVIO.evaluaciones(formatearEntero(d.evaluaciones))}
                    </span>
                    {enviado && (
                      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 justify-self-end text-[14px] text-ink sm:order-4">
                        <input
                          type="checkbox"
                          className="size-5 accent-link"
                          checked={reenviar.has(d.id)}
                          onChange={(e) => alternarReenvio(d.id, e.target.checked)}
                        />
                        {TEXTOS_ENVIO.reenviar}
                        <span className="sr-only"> {d.etiqueta}</span>
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="omitidos-titulo" className="rounded-tile bg-surface p-4 md:p-6">
          <h2 id="omitidos-titulo" className="mb-4 text-sub font-semibold">
            {TEXTOS_ENVIO.omitidos} ({formatearEntero(omitidos.length)})
          </h2>
          {omitidos.length === 0 ? (
            <p className="text-body text-ink-3">{TEXTOS_ENVIO.sinOmitidos}</p>
          ) : (
            <ul aria-labelledby="omitidos-titulo" className="flex flex-col">
              {omitidos.map((o) => (
                <li key={o.id} className="flex min-h-11 items-center gap-3 px-2 py-2 even:bg-canvas">
                  <span className="min-w-0 flex-1">{o.etiqueta}</span>
                  <Chip tono={o.motivo === "ausente" ? "ausente" : "suave"}>{TEXTOS_ENVIO.motivos[o.motivo]}</Chip>
                </li>
              ))}
            </ul>
          )}
        </section>

        {previa && (
          <section aria-labelledby="previa-titulo" className="rounded-tile bg-surface p-4 md:p-6">
            <h2 id="previa-titulo" className="mb-4 text-sub font-semibold">
              {TEXTOS_ENVIO.vistaPrevia}
            </h2>
            <label htmlFor={idSelector} className="block text-[14px] text-ink-2">
              {TEXTOS_ENVIO.participantePrevia}
            </label>
            <select
              id={idSelector}
              value={previa.participanteId}
              aria-busy={cambiandoPrevia || undefined}
              onChange={(e) => {
                const id = e.target.value;
                iniciarCambioPrevia(() => router.replace(`${RUTA_PAGINA}?participante=${id}`, { scroll: false }));
              }}
              className="mt-1 min-h-11 w-full rounded-tile border border-hairline bg-surface px-3 text-body text-ink sm:w-auto"
            >
              {destinatarios.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.etiqueta}
                </option>
              ))}
            </select>
            <div className={`mt-4 text-[14px] text-ink-3 ${cambiandoPrevia ? "opacity-60" : ""}`}>
              <p className="break-all">{TEXTOS_ENVIO.para(previa.para)}</p>
              <p>{TEXTOS_ENVIO.asunto(previa.asunto)}</p>
            </div>
            {/* sandbox="": the email's HTML can't run scripts or navigate this page. */}
            <iframe
              title={TEXTOS_ENVIO.marcoPrevia(previa.etiqueta)}
              srcDoc={previa.html}
              sandbox=""
              className={`mt-3 h-[640px] w-full rounded-tile bg-canvas ${cambiandoPrevia ? "opacity-60" : ""}`}
            />

            <form noValidate onSubmit={enviarPrueba} className="mt-6 flex flex-col gap-3">
              <Campo
                etiqueta={TEXTOS_ENVIO.pruebaCampo}
                ayuda={TEXTOS_ENVIO.pruebaAyuda}
                error={errorPrueba}
                value={correoPrueba}
                onChange={(e) => setCorreoPrueba(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <div>
                <Boton type="submit" variante="secundario" cargando={probando}>
                  {TEXTOS_ENVIO.prueba}
                </Boton>
              </div>
            </form>
          </section>
        )}

        {resumen && (
          <p role="status" className="rounded-tile bg-surface px-4 py-3 text-body text-ink">
            {resumen}
          </p>
        )}
      </div>

      <BarraInferior etiqueta={TEXTOS_ENVIO.titulo}>
        <span />
        <Boton
          disabled={aEnviar.length === 0}
          cargando={enviando}
          textoCargando={TEXTOS_ENVIO.enviando}
          onClick={() => setConfirmando(true)}
        >
          {TEXTOS_ENVIO.enviarA(aEnviar.length)}
        </Boton>
      </BarraInferior>

      <Dialogo
        abierto={confirmando}
        alCerrar={() => setConfirmando(false)}
        titulo={TEXTOS_ENVIO.confirmarTitulo(aEnviar.length)}
        descripcion={TEXTOS_ENVIO.confirmarDescripcion}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              {TEXTOS.ui.cancelar}
            </Boton>
            <Boton onClick={() => void enviar()}>{TEXTOS_ENVIO.confirmar}</Boton>
          </>
        }
      />
    </>
  );
}
