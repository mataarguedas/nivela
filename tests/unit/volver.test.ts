import { describe, expect, it } from "vitest";
import { destinoVolver } from "@/lib/volver";

// "Volver" goes to the logical parent screen (PRD §12 Nav table).

describe("destinoVolver", () => {
  it.each([
    ["/adaptabilidad/P07", "/adaptabilidad", "Participantes"],
    ["/adaptabilidad", "/", "Inicio"],
    ["/adaptabilidad/evaluador", "/", "Inicio"],
    ["/reportes/adaptabilidad/P07", "/reportes/adaptabilidad", "Reporte general"],
    ["/reportes/adaptabilidad/grupo", "/reportes/adaptabilidad", "Reporte general"],
    ["/reportes/adaptabilidad/enviar", "/reportes/adaptabilidad", "Reporte general"],
    ["/reportes/adaptabilidad", "/reportes", "Reportes"],
    ["/reportes", "/", "Inicio"],
  ])("%s → %s (%s)", (ruta, href, etiqueta) => {
    expect(destinoVolver(ruta)).toEqual({ href, etiqueta });
  });

  it.each(["/", "", "/acceso", "/admin", "/dev/ui"])("%s no tiene Volver", (ruta) => {
    expect(destinoVolver(ruta)).toBeNull();
  });

  it("ignora la barra final, la consulta y el fragmento", () => {
    expect(destinoVolver("/adaptabilidad/P07/")).toEqual({ href: "/adaptabilidad", etiqueta: "Participantes" });
    expect(destinoVolver("/reportes/adaptabilidad?orden=puntaje#tabla")).toEqual({ href: "/reportes", etiqueta: "Reportes" });
  });

  it("rutas más profundas que las conocidas no tienen Volver", () => {
    expect(destinoVolver("/adaptabilidad/P07/extra")).toBeNull();
    expect(destinoVolver("/reportes/adaptabilidad/P07/extra")).toBeNull();
  });

  it("nunca depende del historial: misma ruta, mismo destino", () => {
    expect(destinoVolver("/adaptabilidad/P01")).toEqual(destinoVolver("/adaptabilidad/P01"));
  });
});
