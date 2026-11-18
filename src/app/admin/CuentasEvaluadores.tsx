"use client";

import { useState, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Chip, type TonoChip } from "@/components/ui/Chip";
import { Dialogo } from "@/components/ui/Dialogo";
import { useToast } from "@/components/ui/Toast";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_CUENTAS } from "@/config/textosAdmin";
import type { CuentaAdmin, EstadoCuenta, GrupoCuentas } from "@/lib/cuentas";
import { formatearFechaHora } from "@/lib/formato";

// "Cuentas de evaluadores" on /admin (PRD §5.12): the session jornada's
// members, grouped by its teams in their own number order ("Equipo 1 ·
// Adaptabilidad" at night, "Equipo 4 · Adaptabilidad" in the morning). Per
// member: name, curso, email, status and last access, with "Editar correo"
// and "Restablecer acceso", each behind a dialog. Every action is a text
// button: the participant editor's "Guardar cambios" stays the page's only
// filled button. The page remounts this on a jornada switch.

const TONO: Record<EstadoCuenta, TonoChip> = { "sin-correo": "suave", pendiente: "medio", activa: "enviado" };

type Accion = { tipo: "correo" | "restablecer"; cuenta: CuentaAdmin } | null;

export function CuentasEvaluadores({ inicial }: { inicial: GrupoCuentas[] }) {
  const [grupos, setGrupos] = useState(inicial);
  const [accion, setAccion] = useState<Accion>(null);
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const { mostrar } = useToast();

  function cerrar() {
    if (guardando) return;
    setAccion(null);
    setError(undefined);
  }

  async function enviar(cuerpo: object, exito: string) {
    setGuardando(true);
    setError(undefined);
    try {
      const respuesta = await fetch("/api/admin/cuentas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { cuenta?: CuentaAdmin; error?: string };
      if (!respuesta.ok || !datos.cuenta) {
        setError(datos.error ?? TEXTOS_CUENTAS.errorGuardar);
        return;
      }
      const nueva = datos.cuenta;
      setGrupos((actuales) =>
        actuales.map((g) => ({
          ...g,
          cuentas: g.cuentas.map((c) => (c.integranteId === nueva.integranteId ? nueva : c)),
        })),
      );
      setAccion(null);
      mostrar(exito);
    } catch {
      setError(TEXTOS.acceso.sinConexion);
    } finally {
      setGuardando(false);
    }
  }

  function alGuardarCorreo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!accion || guardando) return;
    const correo = String(new FormData(evento.currentTarget).get("correo") ?? "").trim().toLowerCase();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError(TEXTOS_CUENTAS.correoInvalido);
      return;
    }
    void enviar({ integranteId: accion.cuenta.integranteId, correo }, TEXTOS_CUENTAS.correoGuardado);
  }

  return (
    <section aria-labelledby="cuentas-titulo" className="mx-auto w-full max-w-[640px] px-4 pt-16 pb-[max(48px,env(safe-area-inset-bottom))]">
      <h2 id="cuentas-titulo" className="text-center text-h3 font-semibold">
        {TEXTOS_CUENTAS.titulo}
      </h2>
      <p className="mt-2 mb-8 text-center text-body text-ink-3">{TEXTOS_CUENTAS.descripcion}</p>

      <div className="flex flex-col gap-10">
        {grupos.map((grupo) => (
          <section key={grupo.numero} aria-labelledby={`equipo-${grupo.numero}`}>
            <h3 id={`equipo-${grupo.numero}`} className="mb-3 text-sub font-semibold">
              {TEXTOS_CUENTAS.grupo(grupo.numero, grupo.competencia)}
            </h3>
            <ul className="flex flex-col gap-2">
              {grupo.cuentas.map((cuenta) => (
                <li key={cuenta.integranteId} className="rounded-tile bg-surface px-4 py-3">
                  <FilaCuenta cuenta={cuenta} alEditar={() => setAccion({ tipo: "correo", cuenta })} alRestablecer={() => setAccion({ tipo: "restablecer", cuenta })} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialogo
        abierto={accion?.tipo === "correo"}
        alCerrar={cerrar}
        titulo={accion ? TEXTOS_CUENTAS.editarTitulo(accion.cuenta.nombre) : ""}
        descripcion={TEXTOS_CUENTAS.editarAyuda}
      >
        {accion?.tipo === "correo" && (
          <form onSubmit={alGuardarCorreo} noValidate className="flex flex-col gap-5">
            <Campo
              etiqueta={TEXTOS_CUENTAS.correo}
              name="correo"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              defaultValue={accion.cuenta.correo ?? ""}
              error={error}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Boton variante="secundario" type="button" onClick={cerrar}>
                {TEXTOS.ui.cancelar}
              </Boton>
              <Boton type="submit" cargando={guardando}>
                {TEXTOS_CUENTAS.guardarCorreo}
              </Boton>
            </div>
          </form>
        )}
      </Dialogo>

      <Dialogo
        abierto={accion?.tipo === "restablecer"}
        alCerrar={cerrar}
        titulo={accion ? TEXTOS_CUENTAS.restablecerTitulo(accion.cuenta.nombre) : ""}
        descripcion={
          <>
            {TEXTOS_CUENTAS.restablecerDescripcion}
            {error && (
              <span role="alert" className="mt-3 block text-ink">
                {error}
              </span>
            )}
          </>
        }
        acciones={
          <>
            <Boton variante="secundario" onClick={cerrar}>
              {TEXTOS.ui.cancelar}
            </Boton>
            <Boton
              cargando={guardando}
              onClick={() =>
                accion && void enviar({ integranteId: accion.cuenta.integranteId, restablecer: true }, TEXTOS_CUENTAS.accesoRestablecido)
              }
            >
              {TEXTOS_CUENTAS.restablecer}
            </Boton>
          </>
        }
      />
    </section>
  );
}

function FilaCuenta({
  cuenta,
  alEditar,
  alRestablecer,
}: {
  cuenta: CuentaAdmin;
  alEditar: () => void;
  alRestablecer: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">{cuenta.nombre}</p>
          <p className="text-[14px] text-ink-2">{cuenta.curso}</p>
        </div>
        <Chip tono={TONO[cuenta.estado]}>{TEXTOS_CUENTAS.estados[cuenta.estado]}</Chip>
      </div>
      <p className="break-all text-[14px] text-ink-3">
        <span className="sr-only">{TEXTOS_CUENTAS.correo}: </span>
        {cuenta.correo ?? TEXTOS_CUENTAS.estados["sin-correo"]}
      </p>
      <p className="text-[14px] text-ink-2">
        {TEXTOS_CUENTAS.ultimoIngreso}: {cuenta.ultimoAcceso ? formatearFechaHora(cuenta.ultimoAcceso) : TEXTOS_CUENTAS.nunca}
      </p>
      <div className="-ml-2 flex flex-wrap gap-x-2">
        <Boton variante="texto" type="button" onClick={alEditar} aria-label={`${cuenta.correo ? TEXTOS_CUENTAS.editarCorreo : TEXTOS_CUENTAS.agregarCorreo}: ${cuenta.nombre}`}>
          {cuenta.correo ? TEXTOS_CUENTAS.editarCorreo : TEXTOS_CUENTAS.agregarCorreo}
        </Boton>
        {cuenta.estado === "activa" && (
          <Boton variante="texto" type="button" onClick={alRestablecer} aria-label={`${TEXTOS_CUENTAS.restablecer}: ${cuenta.nombre}`}>
            {TEXTOS_CUENTAS.restablecer}
          </Boton>
        )}
      </div>
    </div>
  );
}
