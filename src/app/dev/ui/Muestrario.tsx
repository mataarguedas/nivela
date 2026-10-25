"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { BarraInferior } from "@/components/ui/BarraInferior";
import { Boton } from "@/components/ui/Boton";
import { CampoTexto, Campo } from "@/components/ui/Campo";
import { Chip, TONO_POR_ESTADO } from "@/components/ui/Chip";
import { Dialogo } from "@/components/ui/Dialogo";
import { Nav, NavTexto } from "@/components/ui/Nav";
import { SelectorNivel } from "@/components/ui/SelectorNivel";
import { useToast } from "@/components/ui/Toast";
import type { Indicador } from "@/config/competencias";
import { obtenerNivel, type NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";

type MuestrarioProps = {
  indicador: Indicador;
  nombreEvaluador: string;
};

// Sections alternate white / canvas backgrounds: no borders, no shadows.
function Seccion({ titulo, tono, children }: { titulo: string; tono: "blanco" | "lienzo"; children: ReactNode }) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className={tono === "blanco" ? "bg-surface" : "bg-canvas"}>
      <div className="mx-auto max-w-[980px] px-4 py-12">
        <h2 id={idTitulo} className="mb-6 text-h3 font-semibold">
          {titulo}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-caption text-ink-2">{etiqueta}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Muestrario({ indicador, nombreEvaluador }: MuestrarioProps) {
  const { mostrar } = useToast();
  const [analizando, setAnalizando] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [nivel, setNivel] = useState<NivelValor | null>(null);
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (!analizando) return;
    const temporizador = window.setTimeout(() => setAnalizando(false), 2000);
    return () => window.clearTimeout(temporizador);
  }, [analizando]);

  const idIndicador = "muestra-indicador";

  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-wash px-4 py-14 text-center">
        <h1 className="text-h2 font-semibold md:text-display">Componentes</h1>
        <p className="mt-3 text-sub">Muestrario del kit de interfaz. Solo disponible en desarrollo.</p>
      </header>

      <Seccion titulo="Boton" tono="blanco">
        <Fila etiqueta="Primario: normal, grande, cargando y deshabilitado">
          <Boton>{TEXTOS.inicio.comenzar}</Boton>
          <Boton tamano="grande">{TEXTOS.inicio.comenzar}</Boton>
          <Boton cargando={analizando} textoCargando={TEXTOS.ia.analizando} onClick={() => setAnalizando(true)}>
            {TEXTOS.ia.analizar}
          </Boton>
          <Boton disabled>{TEXTOS.calificacion.enviar}</Boton>
        </Fila>
        <Fila etiqueta="Secundario: normal, grande, cargando y deshabilitado">
          <Boton variante="secundario">{TEXTOS.lista.borrarTodo}</Boton>
          <Boton variante="secundario" tamano="grande">
            {TEXTOS.envio.reintentar}
          </Boton>
          <Boton variante="secundario" cargando>
            {TEXTOS.envio.reintentar}
          </Boton>
          <Boton variante="secundario" disabled>
            {TEXTOS.lista.borrarTodo}
          </Boton>
        </Fila>
        <Fila etiqueta="Texto: normal y deshabilitado">
          <Boton variante="texto">{TEXTOS.sesion.salir}</Boton>
          <Boton variante="texto" disabled>
            {TEXTOS.sesion.salir}
          </Boton>
        </Fila>
        <Fila etiqueta="Como enlace (Next Link): activo y deshabilitado">
          <Boton variante="secundario" href="/">
            Ir a Inicio
          </Boton>
          <Boton variante="texto" href="/">
            Ir a Inicio
          </Boton>
          <Boton variante="secundario" href="/" deshabilitado>
            Ir a Inicio
          </Boton>
        </Fila>
        <Fila etiqueta="Ancho completo">
          <Boton variante="secundario" anchoCompleto>
            {TEXTOS.ia.aplicarSugerencia}
          </Boton>
        </Fila>
      </Seccion>

      <Seccion titulo="Chip" tono="lienzo">
        <Fila etiqueta="Estados del participante">
          <Chip tono={TONO_POR_ESTADO.pendiente}>{TEXTOS.estados.pendiente}</Chip>
          <Chip tono={TONO_POR_ESTADO.enProgreso}>{TEXTOS.estados.enProgreso}</Chip>
          <Chip tono={TONO_POR_ESTADO.completado}>{TEXTOS.estados.completado}</Chip>
          <Chip tono={TONO_POR_ESTADO.enviado}>{TEXTOS.estados.enviado}</Chip>
        </Fila>
        <Fila etiqueta="Sobre fondo blanco">
          <div className="flex flex-wrap gap-2 rounded-tile bg-surface p-4">
            <Chip tono="suave">{TEXTOS.competencias.proximamente}</Chip>
            <Chip tono="medio">{TEXTOS.competencias.disponible}</Chip>
            <Chip tono="fuerte">{TEXTOS.estados.completado}</Chip>
            <Chip tono="enviado">{TEXTOS.estados.enviado}</Chip>
          </div>
        </Fila>
      </Seccion>

      <Seccion titulo="Campo" tono="blanco">
        <div className="flex max-w-[560px] flex-col gap-8">
          <Campo etiqueta={TEXTOS.acceso.instruccion} autoComplete="off" autoCapitalize="characters" />
          <Campo etiqueta={TEXTOS.acceso.instruccion} defaultValue="ABC123" error={TEXTOS.acceso.error} />
          <CampoTexto
            etiqueta={TEXTOS.calificacion.observaciones}
            ayuda={TEXTOS.calificacion.ayudaObservaciones}
            maxLength={1000}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
          <CampoTexto etiqueta={TEXTOS.ia.describa} ayuda={TEXTOS.ia.sinNombres} maxLength={1500} rows={5} />
          <Campo etiqueta="Campo deshabilitado" defaultValue="No editable" disabled />
        </div>
      </Seccion>

      <Seccion titulo="SelectorNivel" tono="lienzo">
        <h3 id={idIndicador} className="mb-4 text-sub font-semibold">
          {TEXTOS.calificacion.indicador(indicador.numero)}. {indicador.titulo}
        </h3>
        <SelectorNivel descripciones={indicador.niveles} valor={nivel} alCambiar={setNivel} etiquetadoPor={idIndicador} />
        <p className="mt-3 text-caption text-ink-2">
          Seleccionado: {nivel ? obtenerNivel(nivel).etiqueta : "ninguno"}. Pruebe las flechas del teclado.
        </p>
        <p className="mt-8 mb-4 text-caption text-ink-2">Deshabilitado, con Intermedio seleccionado</p>
        <SelectorNivel
          descripciones={indicador.niveles}
          valor={2}
          alCambiar={() => {}}
          etiqueta="Selector deshabilitado"
          deshabilitado
        />
      </Seccion>

      <Seccion titulo="Dialogo y Toast" tono="blanco">
        <Fila etiqueta="Confirmación (Escape o el fondo la cierran; el foco queda atrapado)">
          <Boton variante="secundario" onClick={() => setDialogoAbierto(true)}>
            {TEXTOS.lista.borrarTodo}
          </Boton>
        </Fila>
        <Fila etiqueta="Aviso breve (región polite, desaparece solo)">
          <Boton variante="secundario" onClick={() => mostrar(TEXTOS.envio.exito)}>
            Mostrar aviso
          </Boton>
        </Fila>
        <Dialogo
          abierto={dialogoAbierto}
          alCerrar={() => setDialogoAbierto(false)}
          titulo={TEXTOS.lista.borrarTodo}
          descripcion={TEXTOS.lista.confirmarBorrado}
          acciones={
            <>
              <Boton variante="secundario" onClick={() => setDialogoAbierto(false)}>
                {TEXTOS.ui.cancelar}
              </Boton>
              <Boton
                onClick={() => {
                  setDialogoAbierto(false);
                  mostrar("Borrado simulado (solo desarrollo)");
                }}
              >
                {TEXTOS.lista.borrarTodo}
              </Boton>
            </>
          }
        />
      </Seccion>

      <Seccion titulo="Nav" tono="lienzo">
        <Fila etiqueta="Evaluador">
          <div className="w-full overflow-hidden rounded-tile">
            <Nav>
              <NavTexto>{nombreEvaluador}</NavTexto>
              <Boton variante="texto">{TEXTOS.sesion.salir}</Boton>
            </Nav>
          </div>
        </Fila>
        <Fila etiqueta="Docente">
          <div className="w-full overflow-hidden rounded-tile">
            <Nav>
              <Boton variante="texto" href="/reportes">
                {TEXTOS.reportes.enlace}
              </Boton>
              <Boton variante="texto">{TEXTOS.sesion.salir}</Boton>
            </Nav>
          </div>
        </Fila>
        <p className="text-caption text-ink-2">
          La barra inferior de esta página es la BarraInferior real: elija un nivel arriba para ver el botón de envío.
        </p>
      </Seccion>

      <BarraInferior etiqueta="Envío">
        {nivel ? (
          <Boton anchoCompleto onClick={() => mostrar(TEXTOS.envio.exito)}>
            {TEXTOS.calificacion.enviar}
          </Boton>
        ) : (
          <p className="text-[14px] text-ink-3">{TEXTOS.calificacion.faltan(1)}</p>
        )}
      </BarraInferior>
    </main>
  );
}
