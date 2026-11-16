import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ruta = vi.hoisted(() => ({ actual: "/adaptabilidad/P01" }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));

const borrador = vi.hoisted(() => ({ vaciarEscrituras: vi.fn() }));
vi.mock("@/lib/borrador", () => borrador);

import { BotonVolver, VolverNav } from "@/components/ui/BotonVolver";

afterEach(() => {
  ruta.actual = "/adaptabilidad/P01";
  borrador.vaciarEscrituras.mockClear();
});

describe("BotonVolver", () => {
  it("es un enlace al destino con la palabra Volver visible y el destino en el aria-label", () => {
    render(<BotonVolver href="/adaptabilidad" etiqueta="Participantes" />);
    const enlace = screen.getByRole("link", { name: "Volver a Participantes" });
    expect(enlace).toHaveAttribute("href", "/adaptabilidad");
    expect(enlace).toHaveTextContent("Volver");
  });

  it("al tocarlo escribe los borradores pendientes antes de salir", () => {
    render(<BotonVolver href="/adaptabilidad" etiqueta="Participantes" />);
    const enlace = screen.getByRole("link", { name: "Volver a Participantes" });
    // jsdom can't navigate; only the click handler matters here.
    enlace.addEventListener("click", (evento) => evento.preventDefault());
    fireEvent.click(enlace);
    expect(borrador.vaciarEscrituras).toHaveBeenCalledTimes(1);
  });
});

describe("VolverNav", () => {
  it("usa la ruta actual para elegir el destino", () => {
    render(<VolverNav />);
    expect(screen.getByRole("link", { name: "Volver a Participantes" })).toHaveAttribute("href", "/adaptabilidad");
  });

  it("no se muestra en Inicio, acceso ni admin", () => {
    for (const actual of ["/", "/acceso", "/admin"]) {
      ruta.actual = actual;
      const { container, unmount } = render(<VolverNav />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});
