import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SelectorNivel } from "@/components/ui/SelectorNivel";
import { adaptabilidad } from "@/config/competencias/adaptabilidad";
import type { NivelValor } from "@/config/niveles";

const descripciones = adaptabilidad.indicadores[0].niveles;

function SelectorControlado({ inicial = null }: { inicial?: NivelValor | null }) {
  const [valor, setValor] = useState<NivelValor | null>(inicial);
  return <SelectorNivel descripciones={descripciones} valor={valor} alCambiar={setValor} etiqueta="Indicador 1" />;
}

function radio(nombre: string) {
  return screen.getByRole("radio", { name: nombre });
}

describe("SelectorNivel", () => {
  it("es un radiogroup etiquetado con 4 radios nombrados y descritos", () => {
    render(<SelectorControlado />);
    expect(screen.getByRole("radiogroup", { name: "Indicador 1" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "false", "false", "false"]);
    expect(radio("Avanzado")).toHaveAccessibleDescription(descripciones[3]);
  });

  it("sin selección, solo el primer radio está en el orden de tabulación", () => {
    render(<SelectorControlado />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it("seleccionar con clic marca el radio y lo vuelve la parada de tabulación", () => {
    render(<SelectorControlado />);
    fireEvent.click(radio("Avanzado"));
    expect(radio("Avanzado")).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it("las flechas mueven el foco y la selección, con vuelta al inicio", () => {
    render(<SelectorControlado inicial={3} />);
    const avanzado = radio("Avanzado");
    avanzado.focus();

    fireEvent.keyDown(avanzado, { key: "ArrowDown" });
    expect(radio("Experto")).toHaveAttribute("aria-checked", "true");
    expect(radio("Experto")).toHaveFocus();

    fireEvent.keyDown(radio("Experto"), { key: "ArrowRight" });
    expect(radio("Básico")).toHaveAttribute("aria-checked", "true");
    expect(radio("Básico")).toHaveFocus();

    fireEvent.keyDown(radio("Básico"), { key: "ArrowUp" });
    expect(radio("Experto")).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(radio("Experto"), { key: "ArrowLeft" });
    expect(radio("Avanzado")).toHaveAttribute("aria-checked", "true");
    expect(radio("Avanzado")).toHaveFocus();
  });

  it("Inicio y Fin van al primer y último nivel", () => {
    render(<SelectorControlado inicial={2} />);
    fireEvent.keyDown(radio("Intermedio"), { key: "End" });
    expect(radio("Experto")).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(radio("Experto"), { key: "Home" });
    expect(radio("Básico")).toHaveAttribute("aria-checked", "true");
  });

  it("la barra espaciadora selecciona el radio enfocado", () => {
    render(<SelectorControlado />);
    fireEvent.keyDown(radio("Intermedio"), { key: " " });
    expect(radio("Intermedio")).toHaveAttribute("aria-checked", "true");
  });

  it("solo uno queda seleccionado a la vez", () => {
    render(<SelectorControlado />);
    fireEvent.click(radio("Básico"));
    fireEvent.click(radio("Experto"));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(radio("Experto")).toHaveAttribute("aria-checked", "true");
  });

  it("deshabilitado no llama alCambiar ni con clic ni con teclado", () => {
    const alCambiar = vi.fn();
    render(
      <SelectorNivel descripciones={descripciones} valor={1} alCambiar={alCambiar} etiqueta="Indicador 1" deshabilitado />,
    );
    fireEvent.click(radio("Experto"));
    fireEvent.keyDown(radio("Básico"), { key: "ArrowDown" });
    expect(alCambiar).not.toHaveBeenCalled();
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-disabled", "true");
  });

  it("volver a elegir el nivel ya seleccionado no llama alCambiar", () => {
    const alCambiar = vi.fn();
    render(<SelectorNivel descripciones={descripciones} valor={2} alCambiar={alCambiar} etiqueta="Indicador 1" />);
    fireEvent.click(radio("Intermedio"));
    expect(alCambiar).not.toHaveBeenCalled();
  });
});
