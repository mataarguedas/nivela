import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvisoAcceso } from "@/app/acceso/AvisoAcceso";
import { ENFRIAMIENTO_S, FormularioAcceso, MAX_FALLOS } from "@/app/acceso/FormularioAcceso";
import { irA } from "@/lib/navegacion";

vi.mock("@/lib/navegacion", () => ({ irA: vi.fn() }));

const fetchSimulado = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fetchSimulado.mockReset();
  vi.mocked(irA).mockReset();
});

function responder(status: number, cuerpo: object) {
  fetchSimulado.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));
}

async function enviar(codigo: string) {
  fireEvent.change(screen.getByLabelText("Ingrese el código de acceso de su clase"), { target: { value: codigo } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  });
}

describe("FormularioAcceso", () => {
  it("con un código válido navega al destino del parámetro next", async () => {
    window.history.replaceState(null, "", "/acceso?next=%2Freportes");
    render(<FormularioAcceso />);
    responder(200, { rol: "docente" });
    await enviar(" docente-2026 ");

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/acceso",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ codigo: "docente-2026" }) }),
    );
    expect(irA).toHaveBeenCalledWith("/reportes");
  });

  it("con el código de administración va a /admin aunque next apunte a otra página", async () => {
    window.history.replaceState(null, "", "/acceso?next=%2Freportes");
    render(<FormularioAcceso />);
    responder(200, { rol: "admin" });
    await enviar("admin2026");
    expect(irA).toHaveBeenCalledWith("/admin");
  });

  it("muestra el error del código inválido", async () => {
    render(<FormularioAcceso />);
    responder(401, { error: "x" });
    await enviar("malo");
    expect(screen.getByText("El código no es válido. Verifique con su docente.")).toBeInTheDocument();
    expect(screen.getByLabelText("Ingrese el código de acceso de su clase")).toHaveAttribute("aria-invalid", "true");
    expect(irA).not.toHaveBeenCalled();
  });

  it("no envía un código vacío", async () => {
    render(<FormularioAcceso />);
    await enviar("   ");
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(screen.getByText("Ingrese el código de acceso.")).toBeInTheDocument();
  });

  it("muestra un aviso si no hay conexión", async () => {
    render(<FormularioAcceso />);
    fetchSimulado.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await enviar("clase-2026");
    expect(screen.getByText(/No fue posible conectarse/)).toBeInTheDocument();
  });

  it(`bloquea ${ENFRIAMIENTO_S} s después de ${MAX_FALLOS} fallos seguidos`, async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    render(<FormularioAcceso />);
    const boton = () => screen.getByRole("button", { name: "Entrar" });

    for (let i = 0; i < MAX_FALLOS - 1; i++) {
      responder(401, { error: "x" });
      await enviar(`malo-${i}`);
      expect(boton()).toBeEnabled();
    }
    responder(401, { error: "x" });
    await enviar("malo-final");
    expect(boton()).toBeDisabled();
    expect(screen.getByText("Demasiados intentos. Espere 30 s para intentar de nuevo.", { selector: "[aria-hidden]" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(/Espere 20 s/, { selector: "[aria-hidden]" })).toBeInTheDocument();

    // A submit during the cooldown never reaches the server.
    await act(async () => {
      fireEvent.submit(boton().closest("form")!);
    });
    expect(fetchSimulado).toHaveBeenCalledTimes(MAX_FALLOS);

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(boton()).toBeEnabled();
    expect(screen.queryByText(/Demasiados intentos/)).not.toBeInTheDocument();
  });

  it("ignora un next externo y vuelve a Inicio", async () => {
    window.history.replaceState(null, "", "/acceso?next=https%3A%2F%2Fejemplo.com");
    render(<FormularioAcceso />);
    responder(200, { rol: "evaluador" });
    await enviar("clase-2026");
    expect(irA).toHaveBeenCalledWith("/");
  });
});

describe("AvisoAcceso", () => {
  it("no muestra nada sin motivo", () => {
    const { container } = render(<AvisoAcceso motivo={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["expirada", "Su sesión expiró. Ingrese el código nuevamente."],
    ["docente", "Esta sección requiere el código docente."],
  ] as const)("muestra el aviso del motivo %s", (motivo, texto) => {
    render(<AvisoAcceso motivo={motivo} />);
    expect(screen.getByRole("status")).toHaveTextContent(texto);
  });
});
