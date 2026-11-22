import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MejoresConsolidado, MejoresPuntajes } from "@/components/reportes/MejoresPuntajes";
import type { CompetenciaConsolidada, Destacado, DestacadoConsolidado } from "@/lib/reportes";

// The "Los 5 puntajes más altos" cards: shared positions on ties, es-CR
// numbers, level name next to its color, and a link per participant.

const indicadores = [{ numero: 1 }, { numero: 2 }, { numero: 3 }, { numero: 4 }];

const mejores: Destacado[] = [
  { id: "P04", etiqueta: "Participante 04", puntaje: 94.44, nivel: 4, posicion: 1, evaluaciones: 8, medias: [91.67, 100, 87.5, 98.6] },
  { id: "P02", etiqueta: "Participante 02", puntaje: 72.22, nivel: 3, posicion: 2, evaluaciones: 1, medias: [66.67, 66.67, 66.67, 100] },
  { id: "P09", etiqueta: "Participante 09", puntaje: 72.22, nivel: 3, posicion: 2, evaluaciones: 7, medias: [66.67, 66.67, null, 83.33] },
];

describe("MejoresPuntajes", () => {
  it("una tarjeta por posición, con empates compartiendo la posición", () => {
    render(<MejoresPuntajes mejores={mejores} competenciaId="adaptabilidad" indicadores={indicadores} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.getAttribute("value"))).toEqual(["1", "2", "2"]);
    expect(within(items[2]).getByText("Posición 2")).toBeInTheDocument();
  });

  it("puntaje, nivel, evaluaciones y medias en formato es-CR, y enlace al Reporte individual", () => {
    render(<MejoresPuntajes mejores={mejores} competenciaId="adaptabilidad" indicadores={indicadores} />);
    const [primero, segundo, tercero] = screen.getAllByRole("listitem");
    expect(within(primero).getByRole("link", { name: "Participante 04" })).toHaveAttribute("href", "/reportes/adaptabilidad/P04");
    expect(within(primero).getByText("94")).toBeInTheDocument();
    expect(within(primero).getByText("Experto")).toBeInTheDocument();
    expect(within(primero).getByText("8 evaluaciones")).toBeInTheDocument();
    expect(within(primero).getByText("88")).toBeInTheDocument();
    expect(within(segundo).getByText("1 evaluación")).toBeInTheDocument();
    // A missing indicator mean shows a dash.
    expect(within(tercero).getByText("—")).toBeInTheDocument();
  });
});

describe("MejoresConsolidado (v1.12)", () => {
  const competencia = (id: string, nombre: string, disponible: boolean) => ({ id, nombre, disponible }) as CompetenciaConsolidada;
  const competencias = [
    competencia("adaptabilidad", "Adaptabilidad", true),
    competencia("orientacion-detalle", "Orientación al detalle", false),
    competencia("pensamiento-critico", "Pensamiento crítico y analítico", true),
  ];
  const consolidados: DestacadoConsolidado[] = [
    { id: "P03", etiqueta: "1-0000-0003", puntaje: 80.4, nivel: 4, posicion: 1, competenciasEvaluadas: 2, puntajes: [83.3, null, 77.5] },
    { id: "P01", etiqueta: "Participante 01", puntaje: 66.7, nivel: 3, posicion: 2, competenciasEvaluadas: 1, puntajes: [null, null, 66.7] },
  ];

  it("promedio, competencias evaluadas y el puntaje de cada competencia con plantilla; enlace al Reporte del participante", () => {
    render(<MejoresConsolidado mejores={consolidados} competencias={competencias} />);
    const [primero, segundo] = screen.getAllByRole("listitem");
    expect(within(primero).getByRole("link", { name: "1-0000-0003" })).toHaveAttribute("href", "/reportes/consolidado/P03");
    expect(within(primero).getByText("80")).toBeInTheDocument();
    expect(within(primero).getByText("Experto")).toBeInTheDocument();
    expect(within(primero).getByText("2 de 2 competencias")).toBeInTheDocument();
    expect(within(primero).getByText("Adaptabilidad")).toBeInTheDocument();
    expect(within(primero).getByText("83")).toBeInTheDocument();
    expect(within(primero).getByText("78")).toBeInTheDocument();
    // A competencia without a rubric in the jornada has no column.
    expect(within(primero).queryByText("Orientación al detalle")).toBeNull();
    expect(within(segundo).getByText("1 de 2 competencias")).toBeInTheDocument();
    expect(within(segundo).getByText("—")).toBeInTheDocument();
  });
});
