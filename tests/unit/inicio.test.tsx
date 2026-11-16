import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContenidoInicio } from "@/app/ContenidoInicio";
import { COMPETENCIAS } from "@/config/competencias";
import { competenciaDisponible } from "@/config/equipos";

// Inicio's content per jornada (the page reads the jornada from the session
// behind Suspense and renders this).

describe("Inicio", () => {
  it("muestra el hero con Nivela, el lema, la jornada y un único botón primario Comenzar", () => {
    render(<ContenidoInicio jornada="manana" />);
    expect(screen.getByRole("heading", { level: 1, name: "Nivela" })).toBeInTheDocument();
    expect(screen.getByText("Evalúe con criterio, indicador por indicador.")).toBeInTheDocument();
    expect(screen.getByText("Jornada: Mañana")).toBeInTheDocument();
    const comenzar = screen.getByRole("link", { name: "Comenzar" });
    // Only Adaptabilidad is available in the morning, so Comenzar goes straight to its evaluator step.
    expect(comenzar).toHaveAttribute("href", "/adaptabilidad/evaluador");
    expect(document.querySelectorAll(".bg-primary")).toHaveLength(1);
  });

  it("lista las 5 competencias desde la configuración", () => {
    render(<ContenidoInicio jornada="manana" />);
    const lista = screen.getByRole("list");
    expect(within(lista).getAllByRole("listitem")).toHaveLength(COMPETENCIAS.length);
  });

  it("las disponibles enlazan al paso del evaluador con el chip Disponible", () => {
    render(<ContenidoInicio jornada="manana" />);
    const enlace = screen.getByRole("link", { name: /Adaptabilidad/ });
    expect(enlace).toHaveAttribute("href", "/adaptabilidad/evaluador");
    expect(within(enlace).getByText("Disponible")).toBeInTheDocument();
  });

  it.each(["manana", "noche"] as const)(
    "%s: las no disponibles muestran Próximamente, tienen aria-disabled y no son enfocables",
    (jornada) => {
      render(<ContenidoInicio jornada={jornada} />);
      for (const competencia of COMPETENCIAS.filter((c) => !competenciaDisponible(jornada, c))) {
        const fila = screen.getByRole("link", { name: new RegExp(competencia.nombre) });
        expect(fila).toHaveAttribute("aria-disabled", "true");
        expect(fila).not.toHaveAttribute("href");
        expect(fila).not.toHaveAttribute("tabindex");
        expect(within(fila).getByText("Próximamente")).toBeInTheDocument();
        fila.focus();
        expect(fila).not.toHaveFocus();
      }
    },
  );

  it("sin equipo de noche todavía, Comenzar baja a la lista", () => {
    render(<ContenidoInicio jornada="noche" />);
    expect(screen.getByText("Jornada: Noche")).toBeInTheDocument();
    const disponibles = COMPETENCIAS.filter((c) => competenciaDisponible("noche", c));
    if (disponibles.length !== 1) {
      expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "#competencias");
    }
  });

  it("en el shell (sin jornada) muestra el hero sin filas", () => {
    render(<ContenidoInicio jornada={null} />);
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "#competencias");
    expect(screen.queryByRole("list")).toBeNull();
  });
});
