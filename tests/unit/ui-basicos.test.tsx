import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Boton } from "@/components/ui/Boton";
import { Campo, CampoTexto } from "@/components/ui/Campo";
import { ProveedorToast, useToast } from "@/components/ui/Toast";

describe("Boton", () => {
  it("es type=button por defecto", () => {
    render(<Boton>Comenzar</Boton>);
    expect(screen.getByRole("button", { name: "Comenzar" })).toHaveAttribute("type", "button");
  });

  it("cargando: deshabilitado, aria-busy y texto de carga", () => {
    render(
      <Boton cargando textoCargando="Analizando…">
        Analizar
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Analizando…" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
  });

  it("con href es un enlace; deshabilitado pierde el href", () => {
    const { rerender } = render(<Boton href="/reportes">Reportes</Boton>);
    expect(screen.getByRole("link", { name: "Reportes" })).toHaveAttribute("href", "/reportes");
    rerender(
      <Boton href="/reportes" deshabilitado>
        Reportes
      </Boton>,
    );
    const enlace = screen.getByRole("link", { name: "Reportes" });
    expect(enlace).not.toHaveAttribute("href");
    expect(enlace).toHaveAttribute("aria-disabled", "true");
  });

  it("no filtra props de estilo al DOM", () => {
    render(
      <Boton variante="secundario" tamano="grande" anchoCompleto>
        Reintentar
      </Boton>,
    );
    const boton = screen.getByRole("button");
    expect(boton).not.toHaveAttribute("variante");
    expect(boton).not.toHaveAttribute("anchocompleto");
  });
});

describe("Campo", () => {
  it("vincula etiqueta, ayuda, error y contador", () => {
    render(<Campo etiqueta="Código" ayuda="Lo da su docente." error="El código no es válido." maxLength={10} />);
    const campo = screen.getByLabelText("Código");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Lo da su docente. El código no es válido. 0 de 10 caracteres");
  });

  it("el contador sigue lo escrito sin estar controlado", () => {
    render(<CampoTexto etiqueta="Observaciones (opcional)" maxLength={1000} />);
    fireEvent.change(screen.getByLabelText("Observaciones (opcional)"), { target: { value: "Hola" } });
    expect(screen.getByText("4 de 1 000 caracteres")).toBeInTheDocument();
  });
});

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function Disparador() {
    const { mostrar } = useToast();
    return (
      <button type="button" onClick={() => mostrar("Evaluación enviada")}>
        Enviar
      </button>
    );
  }

  it("anuncia en una región polite y se oculta solo", () => {
    vi.useFakeTimers();
    render(
      <ProveedorToast duracion={1000}>
        <Disparador />
      </ProveedorToast>,
    );
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(region).toHaveTextContent("Evaluación enviada");

    act(() => vi.advanceTimersByTime(1000));
    expect(region).toBeEmptyDOMElement();
  });
});
