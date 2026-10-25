import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The notice reads borrador.ts's module state, so load fresh copies per test.
async function cargar() {
  vi.resetModules();
  const { AvisoAlmacenamiento } = await import("@/components/ui/AvisoAlmacenamiento");
  return AvisoAlmacenamiento;
}

const AVISO = "Este navegador no permite guardar borradores. No cierre la página hasta enviar.";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AvisoAlmacenamiento", () => {
  it("no aparece cuando localStorage funciona", async () => {
    const AvisoAlmacenamiento = await cargar();
    render(<AvisoAlmacenamiento />);
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it("aparece una vez si localStorage lanza excepciones y se puede descartar", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    const AvisoAlmacenamiento = await cargar();
    render(<AvisoAlmacenamiento />);
    await act(async () => {}); // the switch to memory is announced in a microtask

    expect(screen.getByRole("status")).toHaveTextContent(AVISO);
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });
});
