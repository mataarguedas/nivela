import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BarraEnvio } from "@/components/calificacion/BarraEnvio";
import { IndicadorSeccion } from "@/components/calificacion/IndicadorSeccion";
import { obtenerCompetencia } from "@/config/competencias";

const indicador = obtenerCompetencia("adaptabilidad")!.indicadores[0];

describe("BarraEnvio", () => {
  it("con indicadores pendientes muestra cuántos faltan y deshabilita el envío", () => {
    render(<BarraEnvio faltan={3} />);
    expect(screen.getByText("Faltan 3 indicadores por calificar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar evaluación" })).toBeDisabled();
  });

  it("usa el singular cuando falta uno", () => {
    render(<BarraEnvio faltan={1} />);
    expect(screen.getByText("Falta 1 indicador por calificar")).toBeInTheDocument();
  });

  it("completa habilita Enviar evaluación, el único botón primario", () => {
    const alEnviar = vi.fn();
    render(<BarraEnvio faltan={0} alEnviar={alEnviar} />);
    expect(screen.queryByText(/indicador/)).not.toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Enviar evaluación" });
    expect(boton).toBeEnabled();
    expect(document.querySelectorAll(".bg-primary")).toHaveLength(1);
    fireEvent.click(boton);
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });

  it("es una región con nombre y anuncia el progreso", () => {
    render(<BarraEnvio faltan={2} />);
    const region = screen.getByRole("region", { name: "Envío" });
    expect(region.querySelector("[aria-live='polite']")).toHaveTextContent("Faltan 2 indicadores por calificar");
  });
});

describe("IndicadorSeccion", () => {
  function renderizar(props: Partial<Parameters<typeof IndicadorSeccion>[0]> = {}) {
    const alCambiarNivel = vi.fn();
    const alCambiarObservacion = vi.fn();
    render(
      <IndicadorSeccion
        indicador={indicador}
        calificacion={undefined}
        alCambiarNivel={alCambiarNivel}
        alCambiarObservacion={alCambiarObservacion}
        {...props}
      />,
    );
    return { alCambiarNivel, alCambiarObservacion };
  }

  it("titula la sección y el grupo de niveles con 'Indicador n. título'", () => {
    renderizar();
    const titulo = "Indicador 1. Modifica su forma de actuar ante cambios.";
    expect(screen.getByRole("heading", { level: 2, name: titulo })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: titulo })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByText(indicador.niveles[3])).toBeInTheDocument();
  });

  it("muestra el nivel y la observación guardados", () => {
    renderizar({ calificacion: { nivel: 3, observacion: "Adaptó su método.", origen: "manual" } });
    expect(screen.getByRole("radio", { name: "Avanzado" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("textbox", { name: "Observaciones (opcional)" })).toHaveValue("Adaptó su método.");
  });

  it("avisa los cambios de nivel y de observación", () => {
    const { alCambiarNivel, alCambiarObservacion } = renderizar();
    fireEvent.click(screen.getByRole("radio", { name: "Intermedio" }));
    expect(alCambiarNivel).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByRole("textbox", { name: "Observaciones (opcional)" }), { target: { value: "Pidió ayuda." } });
    expect(alCambiarObservacion).toHaveBeenCalledWith("Pidió ayuda.");
  });

  it("la observación admite hasta 1000 caracteres y muestra la ayuda", () => {
    renderizar();
    expect(screen.getByRole("textbox", { name: "Observaciones (opcional)" })).toHaveAttribute("maxlength", "1000");
    expect(
      screen.getByText("Anote únicamente comportamientos observables del indicador o del nivel de conducta."),
    ).toBeInTheDocument();
  });

  it("'¿No está seguro del nivel?' empieza plegado y se despliega", () => {
    renderizar({ panelSugerencia: <p>Panel de Jev</p> });
    const boton = screen.getByRole("button", { name: "¿No está seguro del nivel?" });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Panel de Jev")).not.toBeVisible();
    fireEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Panel de Jev")).toBeVisible();
  });
});
