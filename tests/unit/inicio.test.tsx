import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Inicio from "@/app/page";
import { COMPETENCIAS } from "@/config/competencias";

describe("Inicio", () => {
  it("muestra el hero con Nivela, el lema y un único botón primario Comenzar", () => {
    render(<Inicio />);
    expect(screen.getByRole("heading", { level: 1, name: "Nivela" })).toBeInTheDocument();
    expect(screen.getByText("Evalúe con criterio, indicador por indicador.")).toBeInTheDocument();
    const comenzar = screen.getByRole("link", { name: "Comenzar" });
    // Only Adaptabilidad is enabled, so Comenzar goes straight to its evaluator step.
    expect(comenzar).toHaveAttribute("href", "/adaptabilidad/evaluador");
    expect(document.querySelectorAll(".bg-primary")).toHaveLength(1);
  });

  it("lista las 5 competencias desde la configuración", () => {
    render(<Inicio />);
    const lista = screen.getByRole("list");
    expect(within(lista).getAllByRole("listitem")).toHaveLength(COMPETENCIAS.length);
  });

  it("las habilitadas enlazan al paso del evaluador con el chip Disponible", () => {
    render(<Inicio />);
    const enlace = screen.getByRole("link", { name: /Adaptabilidad/ });
    expect(enlace).toHaveAttribute("href", "/adaptabilidad/evaluador");
    expect(within(enlace).getByText("Disponible")).toBeInTheDocument();
  });

  it("las deshabilitadas muestran Próximamente, tienen aria-disabled y no son enfocables", () => {
    render(<Inicio />);
    for (const competencia of COMPETENCIAS.filter((c) => !c.habilitada)) {
      const fila = screen.getByRole("link", { name: new RegExp(competencia.nombre) });
      expect(fila).toHaveAttribute("aria-disabled", "true");
      expect(fila).not.toHaveAttribute("href");
      expect(fila).not.toHaveAttribute("tabindex");
      expect(within(fila).getByText("Próximamente")).toBeInTheDocument();
      fila.focus();
      expect(fila).not.toHaveFocus();
    }
  });
});
