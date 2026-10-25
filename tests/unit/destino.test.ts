import { describe, expect, it } from "vitest";
import { destinoSeguro, motivoAcceso } from "@/lib/destino";

describe("destinoSeguro", () => {
  it("acepta rutas relativas de la misma app", () => {
    expect(destinoSeguro("/")).toBe("/");
    expect(destinoSeguro("/reportes")).toBe("/reportes");
    expect(destinoSeguro("/adaptabilidad/P07?x=1#i2")).toBe("/adaptabilidad/P07?x=1#i2");
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["reportes"],
    ["https://malo.example/"],
    ["//malo.example/ruta"],
    ["/\\malo.example"],
    ["\\\\malo.example"],
    ["javascript:alert(1)"],
    ["/acceso"],
    ["/acceso?next=/reportes"],
    ["/api/reportes/adaptabilidad/csv"],
  ])("rechaza %s y vuelve a Inicio", (valor) => {
    expect(destinoSeguro(valor)).toBe("/");
  });
});

describe("motivoAcceso", () => {
  it("solo reconoce los motivos conocidos", () => {
    expect(motivoAcceso("expirada")).toBe("expirada");
    expect(motivoAcceso("docente")).toBe("docente");
    expect(motivoAcceso("otro")).toBeNull();
    expect(motivoAcceso(undefined)).toBeNull();
  });
});
