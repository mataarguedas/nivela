import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvisoAcceso } from "@/app/acceso/AvisoAcceso";
import { FormularioAcceso } from "@/app/acceso/FormularioAcceso";
import { ENFRIAMIENTO_S, FormularioCodigo, MAX_FALLOS } from "@/app/acceso/FormularioCodigo";
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
  fireEvent.change(screen.getByLabelText("Ingrese su código de docente o administración"), { target: { value: codigo } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  });
}

describe("FormularioCodigo", () => {
  it("con un código válido navega al destino del parámetro next", async () => {
    window.history.replaceState(null, "", "/acceso?next=%2Freportes");
    render(<FormularioCodigo />);
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
    render(<FormularioCodigo />);
    responder(200, { rol: "admin" });
    await enviar("admin2026");
    expect(irA).toHaveBeenCalledWith("/admin");
  });

  it("muestra el error del código inválido", async () => {
    render(<FormularioCodigo />);
    responder(401, { error: "x" });
    await enviar("malo");
    expect(screen.getByText("El código no es válido. Verifique con su docente.")).toBeInTheDocument();
    expect(screen.getByLabelText("Ingrese su código de docente o administración")).toHaveAttribute("aria-invalid", "true");
    expect(irA).not.toHaveBeenCalled();
  });

  it("no envía un código vacío", async () => {
    render(<FormularioCodigo />);
    await enviar("   ");
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(screen.getByText("Ingrese el código de acceso.")).toBeInTheDocument();
  });

  it("muestra un aviso si no hay conexión", async () => {
    render(<FormularioCodigo />);
    fetchSimulado.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await enviar("docente-2026");
    expect(screen.getByText(/No fue posible conectarse/)).toBeInTheDocument();
  });

  it(`bloquea ${ENFRIAMIENTO_S} s después de ${MAX_FALLOS} fallos seguidos`, async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    render(<FormularioCodigo />);
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
    render(<FormularioCodigo />);
    responder(200, { rol: "docente" });
    await enviar("docente-2026");
    expect(irA).toHaveBeenCalledWith("/");
  });
});

describe("AvisoAcceso", () => {
  it("no muestra nada sin motivo", () => {
    const { container } = render(<AvisoAcceso motivo={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["expirada", "Su sesión expiró. Ingrese nuevamente."],
    ["docente", "Esta sección requiere el código docente."],
  ] as const)("muestra el aviso del motivo %s", (motivo, texto) => {
    render(<AvisoAcceso motivo={motivo} />);
    expect(screen.getByRole("status")).toHaveTextContent(texto);
  });
});

describe("FormularioAcceso (correo y contraseña)", () => {
  const correo = "ana-perez@ejemplo.test";

  async function enviarCorreo(valor = correo) {
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: valor } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    });
  }

  it("con una cuenta activa pide la contraseña y entra", async () => {
    window.history.replaceState(null, "", "/acceso?next=%2Fadaptabilidad");
    render(<FormularioAcceso />);
    responder(200, { paso: "contrasena" });
    await enviarCorreo(` ${correo.toUpperCase()} `);
    expect(fetchSimulado).toHaveBeenLastCalledWith(
      "/api/acceso/correo",
      expect.objectContaining({ body: JSON.stringify({ correo }) }),
    );

    const contrasena = screen.getByLabelText("Contraseña");
    expect(contrasena).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getAllByRole("button").filter((b) => b.textContent === "Entrar")).toHaveLength(1);
    fireEvent.change(contrasena, { target: { value: "una-clave-larga" } });
    responder(200, { rol: "evaluador" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });
    expect(irA).toHaveBeenCalledWith("/adaptabilidad");
  });

  it("muestra los errores de contraseña y de bloqueo", async () => {
    render(<FormularioAcceso />);
    responder(200, { paso: "contrasena" });
    await enviarCorreo();
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "mala" } });
    responder(401, { error: "x" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });
    expect(screen.getByText("Correo o contraseña incorrectos.")).toBeInTheDocument();

    responder(429, { error: "x" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });
    expect(screen.getByText("Demasiados intentos. Intente de nuevo en 15 minutos.")).toBeInTheDocument();
  });

  it("sin cuenta activa pide el código y valida las contraseñas antes de enviar", async () => {
    render(<FormularioAcceso />);
    responder(200, { paso: "codigo" });
    await enviarCorreo();
    expect(screen.getByText(`Le enviamos un código de 6 dígitos a ${correo}. Revise también la carpeta de correo no deseado.`)).toBeInTheDocument();
    const codigo = screen.getByLabelText("Código de verificación");
    expect(codigo).toHaveAttribute("autocomplete", "one-time-code");
    expect(codigo).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Cree su contraseña")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("button", { name: "Reenviar código" })).toBeDisabled();

    const crear = () => screen.getByRole("button", { name: "Crear contraseña y entrar" });
    fireEvent.change(codigo, { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("Cree su contraseña"), { target: { value: "corta" } });
    await act(async () => fireEvent.click(crear()));
    expect(screen.getAllByText("Debe tener al menos 8 caracteres.").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Cree su contraseña")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText("Cree su contraseña"), { target: { value: "suficiente" } });
    fireEvent.change(screen.getByLabelText("Confirme su contraseña"), { target: { value: "distinta1" } });
    await act(async () => fireEvent.click(crear()));
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    // Only the first lookup reached the server.
    expect(fetchSimulado).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Confirme su contraseña"), { target: { value: "suficiente" } });
    responder(400, { error: "El código no es válido o expiró." });
    await act(async () => fireEvent.click(crear()));
    expect(screen.getByText("El código no es válido o expiró.")).toBeInTheDocument();

    responder(200, { rol: "evaluador" });
    await act(async () => fireEvent.click(crear()));
    expect(fetchSimulado).toHaveBeenLastCalledWith(
      "/api/acceso/activar",
      expect.objectContaining({ body: JSON.stringify({ correo, codigo: "123456", contrasena: "suficiente" }) }),
    );
    expect(irA).toHaveBeenCalledWith("/");
  });

  it("«Reenviar código» se habilita a los 60 s", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    render(<FormularioAcceso />);
    responder(200, { paso: "codigo" });
    await enviarCorreo();
    const reenviar = () => screen.getByRole("button", { name: "Reenviar código" });
    expect(reenviar()).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(60_500);
    });
    expect(reenviar()).toBeEnabled();
    responder(200, { paso: "codigo" });
    await act(async () => fireEvent.click(reenviar()));
    expect(fetchSimulado).toHaveBeenLastCalledWith("/api/acceso/correo", expect.anything());
    expect(screen.getByText("Le enviamos un código nuevo.")).toBeInTheDocument();
    expect(reenviar()).toBeDisabled();
  });

  it("«¿Olvidó su contraseña?» pide un código de recuperación", async () => {
    render(<FormularioAcceso />);
    responder(200, { paso: "contrasena" });
    await enviarCorreo();
    responder(200, { paso: "codigo" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "¿Olvidó su contraseña?" }));
    });
    expect(fetchSimulado).toHaveBeenLastCalledWith("/api/acceso/recuperar", expect.anything());
    expect(screen.getByLabelText("Código de verificación")).toBeInTheDocument();
  });

  it("el enlace secundario muestra el formulario de código de docente o administración", () => {
    render(<FormularioAcceso />);
    fireEvent.click(screen.getByRole("button", { name: "Ingresar con código de docente o administración" }));
    expect(screen.getByLabelText("Ingrese su código de docente o administración")).toBeInTheDocument();
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
  });
});
