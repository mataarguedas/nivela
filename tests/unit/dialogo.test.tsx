import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Dialogo } from "@/components/ui/Dialogo";

function Escenario({ conAcciones = true }: { conAcciones?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        Borrar todo
      </button>
      <a href="#fuera">Enlace de la página</a>
      <Dialogo
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="¿Desea borrar todo?"
        descripcion="Las evaluaciones ya enviadas no se eliminan del servidor."
        acciones={
          conAcciones ? (
            <>
              <button type="button" onClick={() => setAbierto(false)}>
                Cancelar
              </button>
              <button type="button">Confirmar</button>
            </>
          ) : undefined
        }
      />
    </>
  );
}

function abrir() {
  const disparador = screen.getByRole("button", { name: "Borrar todo" });
  disparador.focus();
  fireEvent.click(disparador);
  return disparador;
}

describe("Dialogo", () => {
  it("no se muestra cerrado", () => {
    render(<Escenario />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("es modal, con título y descripción accesibles", () => {
    render(<Escenario />);
    abrir();
    const dialogo = screen.getByRole("dialog", { name: "¿Desea borrar todo?" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleDescription("Las evaluaciones ya enviadas no se eliminan del servidor.");
  });

  it("al abrir, enfoca el primer elemento enfocable", () => {
    render(<Escenario />);
    abrir();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("Tab desde el último vuelve al primero y Shift+Tab desde el primero va al último", () => {
    render(<Escenario />);
    abrir();
    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const confirmar = screen.getByRole("button", { name: "Confirmar" });

    confirmar.focus();
    fireEvent.keyDown(confirmar, { key: "Tab" });
    expect(cancelar).toHaveFocus();

    fireEvent.keyDown(cancelar, { key: "Tab", shiftKey: true });
    expect(confirmar).toHaveFocus();
  });

  it("si el foco escapa del panel, Tab lo regresa adentro", () => {
    render(<Escenario />);
    abrir();
    const fuera = screen.getByText("Enlace de la página");
    act(() => fuera.focus());
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("sin elementos enfocables, el foco queda en el panel", () => {
    render(<Escenario conAcciones={false} />);
    abrir();
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveFocus();
    fireEvent.keyDown(dialogo, { key: "Tab" });
    expect(dialogo).toHaveFocus();
  });

  it("vuelve inerte el resto de la página mientras está abierto", () => {
    const { container } = render(<Escenario />);
    abrir();
    expect(container).toHaveAttribute("inert");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(container).not.toHaveAttribute("inert");
  });

  it("Escape cierra y devuelve el foco al disparador", () => {
    render(<Escenario />);
    const disparador = abrir();
    fireEvent.keyDown(screen.getByRole("button", { name: "Cancelar" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
  });

  it("devuelve el foco al disparador aunque el clic no lo haya enfocado (Safari)", () => {
    render(<Escenario />);
    const disparador = screen.getByRole("button", { name: "Borrar todo" });
    expect(disparador).not.toHaveFocus();
    fireEvent.click(disparador);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(disparador).toHaveFocus();
  });

  it("tocar el fondo cierra; tocar el panel no", () => {
    render(<Escenario />);
    abrir();
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(dialogo);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(dialogo.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("bloquea el desplazamiento del body y lo restaura al cerrar", () => {
    render(<Escenario />);
    abrir();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(document.body.style.overflow).toBe("");
  });
});
