import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvisoSinConexion } from "@/components/ui/AvisoSinConexion";

const AVISO = "Sin conexión. Sus respuestas se guardan en este dispositivo.";

function simularConexion(conectado: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(conectado);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AvisoSinConexion", () => {
  it("no muestra nada con conexión", () => {
    simularConexion(true);
    render(<AvisoSinConexion />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("aparece al perder la conexión y desaparece al recuperarla", () => {
    simularConexion(true);
    render(<AvisoSinConexion />);

    simularConexion(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(AVISO);

    simularConexion(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it("aparece de entrada si la página carga sin conexión", () => {
    simularConexion(false);
    render(<AvisoSinConexion />);
    expect(screen.getByRole("status")).toHaveTextContent(AVISO);
  });
});
