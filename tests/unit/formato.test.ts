import { describe, expect, it } from "vitest";
import { formatearDecimal, formatearFecha, formatearPorcentaje } from "@/lib/formato";

describe("formato es-CR", () => {
  it("decimales con coma y 2 posiciones", () => {
    expect(formatearDecimal(2.75)).toBe("2,75");
    expect(formatearDecimal(3)).toBe("3,00");
    expect(formatearDecimal(1.5)).toBe("1,50");
  });

  it("porcentaje con espacio no separable", () => {
    expect(formatearPorcentaje(0.78)).toBe("78 %");
    expect(formatearPorcentaje(0.784)).toBe("78 %");
    expect(formatearPorcentaje(1)).toBe("100 %");
    expect(formatearPorcentaje(0)).toBe("0 %");
  });

  it("fecha dd/mm/aaaa en hora de Costa Rica", () => {
    expect(formatearFecha("2026-10-25T18:00:00Z")).toBe("25/10/2026");
    // 03:00 UTC is still the previous evening in Costa Rica (UTC-6).
    expect(formatearFecha(new Date("2026-10-25T03:00:00Z"))).toBe("24/10/2026");
    expect(formatearFecha("2026-03-05T12:00:00Z")).toBe("05/03/2026");
  });
});
