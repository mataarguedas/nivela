import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorParticipantes, leerLineaPegada } from "@/app/admin/EditorParticipantes";
import { ProveedorToast } from "@/components/ui/Toast";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ADMIN } from "@/config/textosAdmin";

// The admin's editor: count, names, carnets and emails, the paste shortcut,
// client-side checks, and the 409 → confirm → resend flow.

const fetchSimulado = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchSimulado.mockReset();
});

function montar(
  cantidad = 3,
  nombres: (string | null)[] = ["Ana", null, "Carlos", "Dani"],
  carnets: (string | null)[] = nombres.map(() => null),
  correos: (string | null)[] = nombres.map(() => null),
  grupos: (number | null)[] = nombres.map(() => null),
) {
  render(
    <ProveedorToast>
      <EditorParticipantes inicial={{ cantidad, nombres, carnets, grupos, correos }} jornada="noche" />
    </ProveedorToast>,
  );
}

const campoNombre = (n: number) => screen.queryByLabelText(TEXTOS_ADMIN.participante(n));
const campoCarne = (n: number) => screen.queryByLabelText(TEXTOS_ADMIN.carneDe(n));
const campoCorreo = (n: number) => screen.queryByLabelText(TEXTOS_ADMIN.correoDe(n));
const campoCantidad = () => screen.getByLabelText(TEXTOS_ADMIN.cantidad);

function responder(status: number, cuerpo: object) {
  fetchSimulado.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));
}

async function guardar() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.guardar }));
  });
}

function cuerpoEnviado(llamada = 0) {
  return JSON.parse(String(fetchSimulado.mock.calls[llamada][1]?.body));
}

describe("EditorParticipantes", () => {
  it("muestra un campo por participante con los nombres guardados", () => {
    montar();
    expect(campoCantidad()).toHaveValue("3");
    expect(campoNombre(1)).toHaveValue("Ana");
    expect(campoNombre(2)).toHaveValue("");
    expect(campoNombre(3)).toHaveValue("Carlos");
    expect(campoNombre(4)).toBeNull(); // hidden
  });

  it("subir la cantidad recupera el nombre oculto; bajarla esconde filas sin perderlas", () => {
    montar();
    fireEvent.change(campoCantidad(), { target: { value: "5" } });
    expect(campoNombre(4)).toHaveValue("Dani");
    expect(campoNombre(5)).toHaveValue("");
    fireEvent.change(campoCantidad(), { target: { value: "1" } });
    expect(campoNombre(2)).toBeNull();
    fireEvent.change(campoCantidad(), { target: { value: "3" } });
    expect(campoNombre(3)).toHaveValue("Carlos");
  });

  it("pegar una lista fija la cantidad y los nombres", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.pegarLista }));
    fireEvent.change(screen.getByLabelText(TEXTOS_ADMIN.pegarTitulo), {
      target: { value: "Elena Rojas\r\n\n  Fabio Mora  \nGina Solís\nHugo Vega\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.usarLista }));
    expect(campoCantidad()).toHaveValue("4");
    expect(campoNombre(2)).toHaveValue("Fabio Mora");
    expect(campoNombre(4)).toHaveValue("Hugo Vega");
  });

  it("pegar «carné<TAB>nombre» (o con «;») llena el nombre y el carné; una línea sin carné lo borra", () => {
    montar(2, ["Ana", "Bea"], ["111", "222"]);
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.pegarLista }));
    fireEvent.change(screen.getByLabelText(TEXTOS_ADMIN.pegarTitulo), {
      target: { value: "100000001\tAna Lucía Mora Solís\nBruno José Chaves Ruiz; 100000002\nCarlos Andrés Vega\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.usarLista }));
    expect(campoCantidad()).toHaveValue("3");
    expect(campoNombre(1)).toHaveValue("Ana Lucía Mora Solís");
    expect(campoCarne(1)).toHaveValue("100000001");
    expect(campoNombre(2)).toHaveValue("Bruno José Chaves Ruiz");
    expect(campoCarne(2)).toHaveValue("100000002");
    expect(campoNombre(3)).toHaveValue("Carlos Andrés Vega");
    expect(campoCarne(3)).toHaveValue("");
  });

  it("leerLineaPegada separa carné y nombre sin confundir un nombre de una palabra", () => {
    expect(leerLineaPegada("100000001\tAna Mora")).toEqual({ nombre: "Ana Mora", carnet: "100000001", grupo: "", correo: "" });
    expect(leerLineaPegada("Ana Mora;100000001")).toEqual({ nombre: "Ana Mora", carnet: "100000001", grupo: "", correo: "" });
    expect(leerLineaPegada("Ana Mora")).toEqual({ nombre: "Ana Mora", carnet: "", grupo: "", correo: "" });
    expect(leerLineaPegada("Ana\tMora")).toEqual({ nombre: "Ana Mora", carnet: "", grupo: "", correo: "" });
    expect(leerLineaPegada("A-12345\tAna")).toEqual({ nombre: "Ana", carnet: "A-12345", grupo: "", correo: "" });
  });

  it("leerLineaPegada toma como correo el campo con «@», en cualquier posición", () => {
    expect(leerLineaPegada("100000001\tAna Mora\tana@ejemplo.test")).toEqual({
      nombre: "Ana Mora",
      carnet: "100000001",
      grupo: "",
      correo: "ana@ejemplo.test",
    });
    expect(leerLineaPegada("ana@ejemplo.test;Ana Mora;100000001")).toEqual({
      nombre: "Ana Mora",
      carnet: "100000001",
      grupo: "",
      correo: "ana@ejemplo.test",
    });
    // Without a carnet, the email still isn't taken for part of the name.
    expect(leerLineaPegada("Ana Mora\tana2@ejemplo.test")).toEqual({ nombre: "Ana Mora", carnet: "", grupo: "", correo: "ana2@ejemplo.test" });
  });

  it("leerLineaPegada toma «Grupo N» como el grupo (v1.8); un número solo sigue siendo carné", () => {
    expect(leerLineaPegada("100000001;Ana Mora;Grupo 02;ana@ejemplo.test")).toEqual({
      nombre: "Ana Mora",
      carnet: "100000001",
      grupo: "2",
      correo: "ana@ejemplo.test",
    });
    expect(leerLineaPegada("grupo 3\tAna Mora")).toEqual({ nombre: "Ana Mora", carnet: "", grupo: "3", correo: "" });
    expect(leerLineaPegada("3\tAna Mora")).toEqual({ nombre: "Ana Mora", carnet: "3", grupo: "", correo: "" });
  });

  it("envía el grupo de cada fila y rechaza uno fuera de 1…20 sin enviar", async () => {
    montar(2, ["Ana", "Bea"], undefined, undefined, [3, null]);
    expect(screen.getByLabelText(TEXTOS_ADMIN.grupoDe(1))).toHaveValue("3");
    fireEvent.change(screen.getByLabelText(TEXTOS_ADMIN.grupoDe(2)), { target: { value: "21" } });
    await guardar();
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(screen.getByText(TEXTOS_ADMIN.grupoInvalido(2))).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(TEXTOS_ADMIN.grupoDe(2)), { target: { value: " 5 " } });
    responder(200, { cantidad: 2 });
    await guardar();
    expect(cuerpoEnviado().grupos).toEqual([3, 5]);
  });

  it("guarda solo los participantes visibles, recortados", async () => {
    montar();
    fireEvent.change(campoNombre(2)!, { target: { value: "  Bea Solís " } });
    responder(200, { cantidad: 3 });
    await guardar();
    expect(fetchSimulado).toHaveBeenCalledWith("/api/admin/participantes", expect.objectContaining({ method: "PUT" }));
    expect(cuerpoEnviado()).toEqual({
      jornada: "noche",
      cantidad: 3,
      nombres: ["Ana", "Bea Solís", "Carlos"],
      carnets: ["", "", ""],
      grupos: [null, null, null],
      correos: ["", "", ""],
      confirmar: false,
    });
    expect(await screen.findByText(TEXTOS_ADMIN.guardado)).toBeInTheDocument();
  });

  it("no envía con un nombre que parece correo, ni con una cantidad inválida", async () => {
    montar();
    fireEvent.change(campoNombre(2)!, { target: { value: "bea@correo.com" } });
    await guardar();
    expect(campoNombre(2)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(TEXTOS_ADMIN.nombreInvalido(2))).toBeInTheDocument();

    fireEvent.change(campoNombre(2)!, { target: { value: "Bea" } });
    fireEvent.change(campoCantidad(), { target: { value: "120" } });
    await guardar();
    expect(screen.getByText(TEXTOS_ADMIN.cantidadInvalida)).toBeInTheDocument();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("guarda el carné recortado y no envía uno inválido ni uno repetido", async () => {
    montar();
    fireEvent.change(campoCarne(1)!, { target: { value: "12 34" } });
    await guardar();
    expect(campoCarne(1)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(TEXTOS_ADMIN.carneInvalido(1))).toBeInTheDocument();

    fireEvent.change(campoCarne(1)!, { target: { value: "100000001" } });
    fireEvent.change(campoCarne(3)!, { target: { value: "100000001" } });
    await guardar();
    expect(screen.getByText(TEXTOS_ADMIN.carneRepetido(3))).toBeInTheDocument();
    expect(fetchSimulado).not.toHaveBeenCalled();

    fireEvent.change(campoCarne(3)!, { target: { value: " 100000002 " } });
    responder(200, { cantidad: 3 });
    await guardar();
    expect(cuerpoEnviado().carnets).toEqual(["100000001", "", "100000002"]);
  });

  it("muestra y guarda el correo recortado; no envía uno inválido (PRD §5.14)", async () => {
    montar(3, ["Ana", null, "Carlos"], [null, null, null], ["ana@ejemplo.test", null, null]);
    expect(campoCorreo(1)).toHaveValue("ana@ejemplo.test");
    expect(campoCorreo(1)).toHaveAttribute("type", "email");
    fireEvent.change(campoCorreo(3)!, { target: { value: "carlos@" } });
    await guardar();
    expect(campoCorreo(3)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(TEXTOS_ADMIN.correoInvalido(3))).toBeInTheDocument();
    expect(fetchSimulado).not.toHaveBeenCalled();

    fireEvent.change(campoCorreo(3)!, { target: { value: " carlos@ejemplo.test " } });
    responder(200, { cantidad: 3 });
    await guardar();
    expect(cuerpoEnviado().correos).toEqual(["ana@ejemplo.test", "", "carlos@ejemplo.test"]);
  });

  it("pegar una línea reemplaza también el correo: uno viejo nunca queda con otro nombre", async () => {
    montar(2, ["Ana", "Bea"], [null, null], ["ana@ejemplo.test", "bea@ejemplo.test"]);
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.pegarLista }));
    fireEvent.change(screen.getByLabelText(TEXTOS_ADMIN.pegarTitulo), {
      target: { value: "100000001\tCarla Mora\tcarla@ejemplo.test\nDiego Solís" },
    });
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.usarLista }));
    expect(campoNombre(1)).toHaveValue("Carla Mora");
    expect(campoCorreo(1)).toHaveValue("carla@ejemplo.test");
    expect(campoNombre(2)).toHaveValue("Diego Solís");
    expect(campoCorreo(2)).toHaveValue("");
  });

  it("si se ocultarían evaluaciones, pide confirmación y reenvía con confirmar", async () => {
    montar(4);
    fireEvent.change(campoCantidad(), { target: { value: "2" } });
    responder(409, { error: "x", ocultos: 2, evaluacionesAfectadas: 5 });
    await guardar();
    expect(screen.getByRole("dialog", { name: TEXTOS_ADMIN.confirmarTitulo })).toBeInTheDocument();
    expect(screen.getByText(TEXTOS_ADMIN.confirmarDescripcion(2, 5))).toBeInTheDocument();

    responder(200, { cantidad: 2 });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_ADMIN.confirmar }));
    });
    expect(cuerpoEnviado(1)).toEqual({
      jornada: "noche",
      cantidad: 2,
      nombres: ["Ana", ""],
      carnets: ["", ""],
      grupos: [null, null],
      correos: ["", ""],
      confirmar: true,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("si la jornada cambió en otra pestaña, muestra el aviso sin pedir confirmación", async () => {
    montar();
    responder(409, { error: TEXTOS.jornada.distinta, jornadaDistinta: true });
    await guardar();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(TEXTOS.jornada.distinta);
  });

  it("muestra el error del servidor si no se pudo guardar", async () => {
    montar();
    fetchSimulado.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await guardar();
    expect(screen.getByRole("alert")).toHaveTextContent(TEXTOS_ADMIN.errorGuardar);
  });
});
