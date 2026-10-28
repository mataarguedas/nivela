import { describe, expect, it } from "vitest";
import { destinoSeguro, destinoTrasAcceso, motivoAcceso } from "@/lib/destino";

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
    expect(motivoAcceso("admin")).toBe("admin");
    expect(motivoAcceso("otro")).toBeNull();
    expect(motivoAcceso(undefined)).toBeNull();
  });
});

describe("destinoTrasAcceso", () => {
  it("evaluador y docente siguen el next seguro", () => {
    expect(destinoTrasAcceso("evaluador", "/adaptabilidad")).toBe("/adaptabilidad");
    expect(destinoTrasAcceso("docente", "/reportes")).toBe("/reportes");
    expect(destinoTrasAcceso("docente", "//malo.example")).toBe("/");
  });

  it("el admin siempre termina en /admin", () => {
    expect(destinoTrasAcceso("admin", null)).toBe("/admin");
    expect(destinoTrasAcceso("admin", "/reportes")).toBe("/admin");
    expect(destinoTrasAcceso("admin", "/administracion")).toBe("/admin");
    expect(destinoTrasAcceso("admin", "/admin")).toBe("/admin");
  });
});
