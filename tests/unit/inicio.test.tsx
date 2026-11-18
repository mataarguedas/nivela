import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContenidoInicio } from "@/app/ContenidoInicio";
import { competenciasDeJornada, DEFINICIONES_COMPETENCIA } from "@/config/competencias";
import { competenciaDisponible } from "@/config/equipos";

// Inicio's content per jornada (the page reads the jornada from the session
// behind Suspense and renders this). Which competencias open depends on the
// jornada's rubrics (PRD Appendix A): all 5 in the morning, only
// Adaptabilidad at night until the night teams send their templates.

describe("Inicio", () => {
  it("muestra el hero con Nivela, el lema, la jornada y un único botón primario Comenzar", () => {
    render(<ContenidoInicio jornada="manana" />);
    expect(screen.getByRole("heading", { level: 1, name: "Nivela" })).toBeInTheDocument();
    expect(screen.getByText("Evalúe con criterio, indicador por indicador.")).toBeInTheDocument();
    expect(screen.getByText("Jornada: Mañana")).toBeInTheDocument();
    // Several competencias open in the morning, so Comenzar goes down to the list.
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "#competencias");
    expect(document.querySelectorAll(".bg-primary")).toHaveLength(1);
  });

  it("lista las 5 competencias desde la configuración", () => {
    render(<ContenidoInicio jornada="manana" />);
    const lista = screen.getByRole("list");
    expect(within(lista).getAllByRole("listitem")).toHaveLength(DEFINICIONES_COMPETENCIA.length);
  });

  it("de mañana todas enlazan al paso del evaluador con el chip Disponible", () => {
    render(<ContenidoInicio jornada="manana" />);
    for (const { id, nombre } of DEFINICIONES_COMPETENCIA) {
      const enlace = screen.getByRole("link", { name: new RegExp(nombre) });
      expect(enlace).toHaveAttribute("href", `/${id}/evaluador`);
      expect(within(enlace).getByText("Disponible")).toBeInTheDocument();
    }
  });

  it.each(["manana", "noche"] as const)(
    "%s: las no disponibles muestran Próximamente, tienen aria-disabled y no son enfocables",
    (jornada) => {
      render(<ContenidoInicio jornada={jornada} />);
      const noDisponibles = competenciasDeJornada(jornada).filter((c) => !competenciaDisponible(jornada, c.id));
      expect(noDisponibles).toHaveLength(jornada === "noche" ? 4 : 0);
      for (const competencia of noDisponibles) {
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

  it("de noche solo hay una disponible, así que Comenzar va directo a ella", () => {
    render(<ContenidoInicio jornada="noche" />);
    expect(screen.getByText("Jornada: Noche")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "/adaptabilidad/evaluador");
  });

  it("en el shell (sin jornada) muestra el hero sin filas", () => {
    render(<ContenidoInicio jornada={null} />);
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "#competencias");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("un evaluador solo abre la competencia de su equipo, directo a la lista, sin elegir evaluador", () => {
    render(<ContenidoInicio jornada="noche" asignada="adaptabilidad" />);
    const enlace = screen.getByRole("link", { name: /Adaptabilidad/ });
    expect(enlace).toHaveAttribute("href", "/adaptabilidad");
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "/adaptabilidad");
    expect(screen.queryByText("La competencia de su equipo aún no está disponible.")).not.toBeInTheDocument();
  });

  it("de mañana, un evaluador de Orientación al detalle abre la suya; las demás dicen «No asignada»", () => {
    render(<ContenidoInicio jornada="manana" asignada="orientacion-detalle" />);
    for (const { id, nombre } of DEFINICIONES_COMPETENCIA) {
      const fila = screen.getByRole("link", { name: new RegExp(nombre) });
      if (id === "orientacion-detalle") {
        expect(fila).toHaveAttribute("href", "/orientacion-detalle");
        continue;
      }
      expect(fila).toHaveAttribute("aria-disabled", "true");
      expect(within(fila).getByText("No asignada")).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "/orientacion-detalle");
  });

  it("de noche, si la competencia propia aún no tiene rúbrica, lo avisa", () => {
    render(<ContenidoInicio jornada="noche" asignada="pensamiento-critico" />);
    for (const competencia of competenciasDeJornada("noche")) {
      const fila = screen.getByRole("link", { name: new RegExp(competencia.nombre) });
      expect(fila).toHaveAttribute("aria-disabled", "true");
      expect(fila).not.toHaveAttribute("href");
      // Adaptabilidad is enabled at night but isn't theirs; the rest have no night rubric yet.
      const esperado = competencia.id === "adaptabilidad" ? "No asignada" : "Próximamente";
      expect(within(fila).getByText(esperado)).toBeInTheDocument();
    }
    expect(screen.getByText("La competencia de su equipo aún no está disponible.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "#competencias");
  });
});
