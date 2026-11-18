"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { TEXTOS } from "@/config/textos";
import { destinoTrasAcceso } from "@/lib/destino";
import { irA } from "@/lib/navegacion";
import { FormularioCodigo, useHidratado } from "./FormularioCodigo";

// /acceso (PRD §5.12): evaluadores sign in with email + password. Steps,
// each with exactly one primary button:
//   1. correo     "Correo electrónico" → Continuar
//   2a. contrasena (activated account) → Entrar, plus "¿Olvidó su contraseña?"
//   2b. codigo     (not activated, or recovery) → 6-digit code + new password
//                  twice → "Crear contraseña y entrar"; "Reenviar código"
//                  after SEGUNDOS_REENVIO.
// An email outside the roster also lands on 2b (the server answers the
// same), so this page never reveals who is in it. The link "Ingresar con
// código de docente o administración" swaps in the code form.
//
// autocomplete: username on the email (also a hidden copy on the password
// steps), current-password / new-password, one-time-code, so phone password
// managers offer to save and fill. The `next` param is read at submit time.

export const SEGUNDOS_REENVIO = 60;
const LARGO_MINIMO = 8;
const LARGO_MAXIMO = 200;

type Paso =
  | { tipo: "correo" }
  | { tipo: "contrasena"; correo: string }
  | { tipo: "codigo"; correo: string; motivo: "correo" | "recuperar"; reenviarDesde: number };

type Respuesta = { status: number; cuerpo: Record<string, unknown> };

async function publicar(ruta: string, datos: unknown): Promise<Respuesta | null> {
  try {
    const respuesta = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: respuesta.status, cuerpo };
  } catch {
    return null;
  }
}

function entrar() {
  // Stays in the loading state while the page navigates away.
  irA(destinoTrasAcceso("evaluador", new URLSearchParams(window.location.search).get("next")));
}

function leer(evento: FormEvent<HTMLFormElement>, campo: string): string {
  // Read the DOM, not React state: text typed before hydration counts too.
  return String(new FormData(evento.currentTarget).get(campo) ?? "");
}

export function FormularioAcceso() {
  const [conCodigo, setConCodigo] = useState(false);
  const [paso, setPaso] = useState<Paso>({ tipo: "correo" });

  if (conCodigo) {
    return (
      <div className="flex flex-col gap-6">
        <FormularioCodigo />
        <Boton variante="texto" type="button" onClick={() => setConCodigo(false)}>
          {TEXTOS.acceso.conCorreo}
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {paso.tipo === "correo" && <PasoCorreo alContinuar={setPaso} />}
      {paso.tipo === "contrasena" && (
        <PasoContrasena correo={paso.correo} alCambiar={setPaso} alVolver={() => setPaso({ tipo: "correo" })} />
      )}
      {paso.tipo === "codigo" && (
        <PasoCodigo
          key={`${paso.correo}:${paso.motivo}`}
          paso={paso}
          alReenviar={(reenviarDesde) => setPaso({ ...paso, reenviarDesde })}
          alVolver={() => setPaso({ tipo: "correo" })}
        />
      )}
      <Boton variante="texto" type="button" onClick={() => setConCodigo(true)}>
        {TEXTOS.acceso.conCodigo}
      </Boton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Email

function PasoCorreo({ alContinuar }: { alContinuar: (paso: Paso) => void }) {
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const hidratado = useHidratado();

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const correo = leer(evento, "correo").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError(TEXTOS.acceso.correoInvalido);
      return;
    }
    setEnviando(true);
    setError(undefined);
    const respuesta = await publicar("/api/acceso/correo", { correo });
    setEnviando(false);
    if (respuesta?.status === 200 && respuesta.cuerpo.paso === "contrasena") {
      alContinuar({ tipo: "contrasena", correo });
    } else if (respuesta?.status === 200) {
      alContinuar({ tipo: "codigo", correo, motivo: "correo", reenviarDesde: Date.now() });
    } else if (respuesta?.status === 400) {
      setError(TEXTOS.acceso.correoInvalido);
    } else {
      setError(TEXTOS.acceso.sinConexion);
    }
  }

  return (
    // method="post": nothing typed before hydration ends up in the URL.
    <form method="post" onSubmit={alEnviar} noValidate className="flex flex-col gap-5 text-left">
      <h2 className="text-center text-sub font-semibold">{TEXTOS.acceso.tituloCorreo}</h2>
      <Campo
        etiqueta={TEXTOS.acceso.correo}
        name="correo"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        maxLength={254}
        error={error}
      />
      <Boton type="submit" anchoCompleto cargando={enviando} disabled={!hidratado}>
        {TEXTOS.acceso.continuar}
      </Boton>
    </form>
  );
}

/** The email being used, with the way back to step 1. */
function CorreoElegido({ correo, alVolver }: { correo: string; alVolver: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-tile bg-surface px-4 py-2">
      <span className="min-w-0 break-all text-body text-ink">{correo}</span>
      <Boton variante="texto" type="button" onClick={alVolver}>
        {TEXTOS.acceso.otroCorreo}
      </Boton>
    </div>
  );
}

/** Lets password managers pair the saved password with the email. */
function UsuarioOculto({ correo }: { correo: string }) {
  return (
    <input
      type="email"
      name="username"
      autoComplete="username"
      value={correo}
      readOnly
      hidden
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

// ---------------------------------------------------------------------------
// 2a. Password

function PasoContrasena({
  correo,
  alCambiar,
  alVolver,
}: {
  correo: string;
  alCambiar: (paso: Paso) => void;
  alVolver: () => void;
}) {
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const contrasena = leer(evento, "contrasena");
    if (!contrasena) {
      setError(TEXTOS.acceso.contrasenaRequerida);
      return;
    }
    setEnviando(true);
    setError(undefined);
    const respuesta = await publicar("/api/acceso/contrasena", { correo, contrasena });
    if (respuesta?.status === 200) return entrar();
    setEnviando(false);
    if (respuesta?.status === 429) setError(TEXTOS.acceso.bloqueada);
    else if (respuesta?.status === 401 || respuesta?.status === 400) setError(TEXTOS.acceso.credenciales);
    else setError(TEXTOS.acceso.sinConexion);
  }

  async function recuperar() {
    if (recuperando) return;
    setRecuperando(true);
    const respuesta = await publicar("/api/acceso/recuperar", { correo });
    setRecuperando(false);
    if (respuesta?.status === 200) {
      alCambiar({ tipo: "codigo", correo, motivo: "recuperar", reenviarDesde: Date.now() });
    } else {
      setError(TEXTOS.acceso.sinConexion);
    }
  }

  return (
    <form method="post" onSubmit={alEnviar} noValidate className="flex flex-col gap-5 text-left">
      <CorreoElegido correo={correo} alVolver={alVolver} />
      <UsuarioOculto correo={correo} />
      <Campo
        etiqueta={TEXTOS.acceso.contrasena}
        name="contrasena"
        type="password"
        autoComplete="current-password"
        enterKeyHint="go"
        maxLength={LARGO_MAXIMO}
        error={error}
        autoFocus
      />
      <Boton type="submit" anchoCompleto cargando={enviando}>
        {TEXTOS.acceso.entrar}
      </Boton>
      <Boton variante="texto" type="button" onClick={recuperar} cargando={recuperando}>
        {TEXTOS.acceso.olvido}
      </Boton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 2b. Code + new password

type Errores = { codigo?: string; contrasena?: string; confirmacion?: string; general?: string };

function PasoCodigo({
  paso,
  alReenviar,
  alVolver,
}: {
  paso: Extract<Paso, { tipo: "codigo" }>;
  alReenviar: (desde: number) => void;
  alVolver: () => void;
}) {
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const restantes = useCuentaRegresiva(paso.reenviarDesde + SEGUNDOS_REENVIO * 1000);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const codigo = leer(evento, "codigo").replace(/\s/g, "");
    const contrasena = leer(evento, "contrasena");
    const confirmacion = leer(evento, "confirmacion");
    const nuevos: Errores = {};
    if (!/^\d{6}$/.test(codigo)) nuevos.codigo = TEXTOS.acceso.codigoFormato;
    if (contrasena.length < LARGO_MINIMO) nuevos.contrasena = TEXTOS.acceso.contrasenaCorta;
    else if (contrasena.length > LARGO_MAXIMO) nuevos.contrasena = TEXTOS.acceso.contrasenaLarga;
    else if (confirmacion !== contrasena) nuevos.confirmacion = TEXTOS.acceso.noCoinciden;
    setErrores(nuevos);
    setAviso(undefined);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    const respuesta = await publicar("/api/acceso/activar", { correo: paso.correo, codigo, contrasena });
    if (respuesta?.status === 200) return entrar();
    setEnviando(false);
    if (respuesta?.status === 400 && respuesta.cuerpo.error === TEXTOS.acceso.contrasenaCorta) {
      setErrores({ contrasena: TEXTOS.acceso.contrasenaCorta });
    } else if (respuesta?.status === 400) {
      setErrores({ codigo: TEXTOS.acceso.codigoInvalido });
    } else {
      setErrores({ general: TEXTOS.acceso.sinConexion });
    }
  }

  async function reenviar() {
    if (reenviando || restantes > 0) return;
    setReenviando(true);
    const ruta = paso.motivo === "recuperar" ? "/api/acceso/recuperar" : "/api/acceso/correo";
    const respuesta = await publicar(ruta, { correo: paso.correo });
    setReenviando(false);
    if (respuesta?.status === 200) {
      setAviso(TEXTOS.acceso.codigoReenviado);
      alReenviar(Date.now());
    } else {
      setErrores({ general: TEXTOS.acceso.sinConexion });
    }
  }

  return (
    <form method="post" onSubmit={alEnviar} noValidate className="flex flex-col gap-5 text-left">
      <CorreoElegido correo={paso.correo} alVolver={alVolver} />
      <p role="status" className="text-body text-ink-3">
        {TEXTOS.acceso.codigoEnviado(paso.correo)}
      </p>
      <UsuarioOculto correo={paso.correo} />
      <Campo
        etiqueta={TEXTOS.acceso.codigoVerificacion}
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        enterKeyHint="next"
        error={errores.codigo}
        autoFocus
      />
      <Campo
        etiqueta={TEXTOS.acceso.creeContrasena}
        name="contrasena"
        type="password"
        autoComplete="new-password"
        ayuda={TEXTOS.acceso.contrasenaCorta}
        enterKeyHint="next"
        error={errores.contrasena}
      />
      <Campo
        etiqueta={TEXTOS.acceso.confirmeContrasena}
        name="confirmacion"
        type="password"
        autoComplete="new-password"
        enterKeyHint="go"
        error={errores.confirmacion}
      />
      {errores.general && (
        <p role="alert" className="text-body text-ink">
          {errores.general}
        </p>
      )}
      <Boton type="submit" anchoCompleto cargando={enviando}>
        {TEXTOS.acceso.crearYEntrar}
      </Boton>
      <div className="flex flex-col items-center gap-1">
        <Boton variante="texto" type="button" onClick={reenviar} disabled={restantes > 0} cargando={reenviando}>
          {TEXTOS.acceso.reenviar}
        </Boton>
        {/* The countdown ticks visually; the status line announces only the resend. */}
        {restantes > 0 && (
          <p aria-hidden="true" className="text-[14px] text-ink-2">
            {TEXTOS.acceso.reenviarEn(restantes)}
          </p>
        )}
        <p role="status" className="text-[14px] text-ink-2">
          {aviso}
        </p>
      </div>
    </form>
  );
}

/** Whole seconds left until `hasta` (epoch ms), ticking; 0 once reached. */
function useCuentaRegresiva(hasta: number): number {
  const segundosHasta = (limite: number) => Math.max(0, Math.ceil((limite - Date.now()) / 1000));
  const [estado, setEstado] = useState(() => ({ hasta, restantes: segundosHasta(hasta) }));

  useEffect(() => {
    const intervalo = window.setInterval(() => setEstado({ hasta, restantes: segundosHasta(hasta) }), 250);
    return () => window.clearInterval(intervalo);
  }, [hasta]);

  // Right after `hasta` moves (a resend), count from it before the first tick.
  return estado.hasta === hasta ? estado.restantes : SEGUNDOS_REENVIO;
}
