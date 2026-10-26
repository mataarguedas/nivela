import { describe, expect, it } from "vitest";
import {
  fechaParaArchivo,
  formatearDecimal,
  formatearFecha,
  formatearFechaHora,
  formatearPorcentaje,
} from "@/lib/formato";

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

  it("fecha y hora dd/mm/aaaa hh:mm (24 h) en hora de Costa Rica", () => {
    expect(formatearFechaHora("2026-10-25T20:05:00Z")).toBe("25/10/2026 14:05");
    expect(formatearFechaHora("2026-10-25T06:00:00Z")).toBe("25/10/2026 00:00");
    expect(formatearFechaHora(new Date("2026-10-25T03:30:00Z"))).toBe("24/10/2026 21:30");
  });

  it("fecha para nombres de archivo aaaa-mm-dd en hora de Costa Rica", () => {
    expect(fechaParaArchivo("2026-10-25T18:00:00Z")).toBe("2026-10-25");
    expect(fechaParaArchivo(new Date("2026-03-06T03:00:00Z"))).toBe("2026-03-05");
  });
});
