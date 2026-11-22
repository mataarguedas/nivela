import { describe, expect, it } from "vitest";
import {
  barrasParticipantesPorNivel,
  barrasPuntajePorIndicador,
  barrasPuntajePorParticipante,
  lineaNivelMasElegido,
  parrafoResumenGrupo,
  posicionEnEje,
  REFERENCIAS_NIVEL,
  tituloParticipantesPorNivel,
  tituloPuntajePorIndicador,
  tituloPuntajePorParticipante,
} from "@/components/reportes/datosGraficos";
import type { NivelValor } from "@/config/niveles";
import { formatearLista } from "@/lib/formato";
import { brechaSiguienteNivel, nivelGeneral } from "@/lib/puntajes";
import type { IndicadorGrupo, PosicionRanking } from "@/lib/reportes";

// Simple charts (PRD §11 v1.2): the title sentence states each chart's
// message, with neutral sentences for ties and empty data.

const conteo = (b: number, i: number, a: number, e: number): Record<NivelValor, number> => ({ 1: b, 2: i, 3: a, 4: e });
const niveles = (c: Record<NivelValor, number>): NivelValor[] =>
  ([1, 2, 3, 4] as const).flatMap((n) => Array<NivelValor>(c[n]).fill(n));

const ranking = (...puntajes: number[]): PosicionRanking[] =>
  puntajes.map((puntaje, i) => ({ id: `P0${i + 1}`, etiqueta: `Participante 0${i + 1}`, puntaje, nivel: 3 }));

const ind = (numero: number, titulo: string, media: number | null) => ({ numero, titulo, media });

describe("formatearLista", () => {
  it("une con comas e «y» en es-CR", () => {
    expect(formatearLista(["Intermedio"])).toBe("Intermedio");
    expect(formatearLista(["Intermedio", "Avanzado"])).toBe("Intermedio y Avanzado");
    expect(formatearLista(["Básico", "Intermedio", "Avanzado"])).toBe("Básico, Intermedio y Avanzado");
  });
});

describe("posicionEnEje", () => {
  it("ubica el valor en el eje 1–4 y lo limita a 0–100", () => {
    expect(posicionEnEje(1, 1, 4)).toBe(0);
    expect(posicionEnEje(4, 1, 4)).toBe(100);
    expect(posicionEnEje(2.5, 1, 4)).toBe(50);
    expect(posicionEnEje(3.25, 1, 4)).toBe(75);
    expect(posicionEnEje(0, 1, 4)).toBe(0);
    expect(posicionEnEje(5, 1, 4)).toBe(100);
    expect(posicionEnEje(3, 0, 0)).toBe(0);
  });

  it("las líneas de referencia marcan 26 / 51 / 76 puntos con el nivel que abren", () => {
    expect(REFERENCIAS_NIVEL).toEqual([
      { posicion: 26, etiqueta: "Intermedio" },
      { posicion: 51, etiqueta: "Avanzado" },
      { posicion: 76, etiqueta: "Experto" },
    ]);
  });
});

describe("Participantes por nivel", () => {
  it("«La mayoría» solo cuando es más de la mitad", () => {
    expect(tituloParticipantesPorNivel(conteo(1, 3, 12, 4))).toBe(
      "La mayoría de los participantes está en nivel Avanzado (12 de 20)",
    );
    // Exactly half is not a majority.
    expect(tituloParticipantesPorNivel(conteo(2, 3, 10, 5))).toBe(
      "El nivel más frecuente es Avanzado (10 de 20 participantes)",
    );
    expect(tituloParticipantesPorNivel(conteo(0, 0, 0, 3))).toBe("Todos los participantes están en nivel Experto (3 de 3)");
  });

  it("empates y datos vacíos dan frases neutras", () => {
    expect(tituloParticipantesPorNivel(conteo(0, 6, 6, 2))).toBe(
      "Los niveles Intermedio y Avanzado empatan con 6 de 14 participantes cada uno",
    );
    expect(tituloParticipantesPorNivel(conteo(2, 2, 2, 0))).toBe(
      "Los niveles Básico, Intermedio y Avanzado empatan con 2 de 6 participantes cada uno",
    );
    expect(tituloParticipantesPorNivel(conteo(0, 0, 0, 0))).toBe("Aún no hay participantes con puntaje general.");
  });

  it("4 barras de Básico a Experto con cantidad y porcentaje, escaladas al máximo", () => {
    const datos = barrasParticipantesPorNivel(niveles(conteo(0, 5, 10, 5)));
    expect(datos.barras.map((b) => b.etiqueta)).toEqual(["Básico", "Intermedio", "Avanzado", "Experto"]);
    // The "%" follows a non-breaking space, as formatearPorcentaje writes it.
    expect(datos.barras.map((b) => b.texto)).toEqual(["0 · 0 %", "5 · 25 %", "10 · 50 %", "5 · 25 %"]);
    expect(datos.barras.map((b) => b.ancho)).toEqual([0, 50, 100, 50]);
    expect(datos.barras.map((b) => b.nivel)).toEqual([1, 2, 3, 4]);
    expect(datos.referencias).toEqual([]);
    expect(datos.conteo).toEqual(conteo(0, 5, 10, 5));
    expect(datos.total).toBe(20);
    expect(datos.titulo).toBe("El nivel más frecuente es Avanzado (10 de 20 participantes)");
  });

  it("sin participantes: barras en cero, sin dividir entre cero", () => {
    const datos = barrasParticipantesPorNivel([]);
    expect(datos.barras.map((b) => b.texto)).toEqual(["0 · 0 %", "0 · 0 %", "0 · 0 %", "0 · 0 %"]);
    expect(datos.barras.every((b) => b.ancho === 0)).toBe(true);
    expect(datos.titulo).toBe("Aún no hay participantes con puntaje general.");
  });
});

describe("Puntaje por indicador", () => {
  it("nombra el indicador más alto, sin el punto final del título", () => {
    expect(
      tituloPuntajePorIndicador([
        ind(1, "Actúa de manera rápida y flexible.", 75),
        ind(2, "Modifica su forma de actuar ante cambios.", 50),
        ind(3, "Ajusta las prioridades.", null),
      ]),
    ).toBe("El indicador más alto es «Actúa de manera rápida y flexible» (75)");
  });

  it("los empates se comparan en puntos enteros y se listan", () => {
    expect(tituloPuntajePorIndicador([ind(1, "Uno.", 66.6), ind(2, "Dos.", 33), ind(3, "Tres", 67.4)])).toBe(
      "Los indicadores 1 y 3 empatan como los más altos (67)",
    );
    expect(tituloPuntajePorIndicador([ind(1, "Uno", 50), ind(2, "Dos", 50)])).toBe(
      "Todos los indicadores tienen el mismo promedio (50)",
    );
    expect(tituloPuntajePorIndicador([ind(1, "Uno", null), ind(2, "Dos", null)])).toBe("Aún no hay promedios por indicador.");
    expect(tituloPuntajePorIndicador([])).toBe("Aún no hay promedios por indicador.");
  });

  it("barras en el eje fijo 0–100 con «valor · nivel» y las 3 líneas de referencia", () => {
    const datos = barrasPuntajePorIndicador([ind(1, "Uno", 76), ind(2, "Dos", 0), ind(3, "Tres", 50), ind(4, "Cuatro", null)]);
    expect(datos.barras).toEqual([
      { clave: "ind-1", etiqueta: "Indicador 1. Uno", ancho: 76, texto: "76 · Experto", nivel: 4 },
      { clave: "ind-2", etiqueta: "Indicador 2. Dos", ancho: 0, texto: "0 · Básico", nivel: 1 },
      { clave: "ind-3", etiqueta: "Indicador 3. Tres", ancho: 50, texto: "50 · Intermedio", nivel: 2 },
      { clave: "ind-4", etiqueta: "Indicador 4. Cuatro", ancho: 0, texto: "Sin datos", nivel: null },
    ]);
    expect(datos.referencias).toEqual(REFERENCIAS_NIVEL);
  });

  it("el nivel de la barra usa el mismo redondeo que el puntaje mostrado", () => {
    const [barra] = barrasPuntajePorIndicador([ind(1, "Uno", 50.6)]).barras;
    expect(barra.texto).toBe("51 · Avanzado");
    expect(barra.nivel).toBe(3);
  });
});

describe("Puntaje por participante", () => {
  it("el título da el rango de puntajes", () => {
    expect(tituloPuntajePorParticipante(ranking(87, 60, 28))).toBe("Los puntajes van de 28 a 87");
    expect(tituloPuntajePorParticipante(ranking(50, 50))).toBe("Todos los participantes tienen el mismo puntaje (50)");
    expect(tituloPuntajePorParticipante(ranking(70))).toBe("Un participante tiene puntaje general (70)");
    expect(tituloPuntajePorParticipante([])).toBe("Aún no hay puntajes de participantes.");
  });

  it("mantiene el orden del ranking, con nombre y «valor · nivel»", () => {
    const datos = barrasPuntajePorParticipante(ranking(87, 28));
    expect(datos.barras.map((b) => [b.clave, b.etiqueta, b.texto, b.nivel])).toEqual([
      ["P01", "Participante 01", "87 · Experto", 4],
      ["P02", "Participante 02", "28 · Intermedio", 2],
    ]);
    expect(datos.referencias).toHaveLength(3);
  });
});

describe("nivel más elegido por indicador", () => {
  it("«{n} de {total} evaluadores eligieron {nivel}»", () => {
    expect(lineaNivelMasElegido(conteo(0, 1, 3, 0))).toBe("3 de 4 evaluadores eligieron Avanzado");
    expect(lineaNivelMasElegido(conteo(0, 0, 0, 1))).toBe("1 de 1 evaluadores eligió Experto");
  });

  it("lista los empates", () => {
    expect(lineaNivelMasElegido(conteo(0, 2, 2, 0))).toBe("Empate entre Intermedio y Avanzado: 2 de 4 evaluadores eligieron cada uno");
    expect(lineaNivelMasElegido(conteo(1, 1, 1, 0))).toBe(
      "Empate entre Básico, Intermedio y Avanzado: 1 de 3 evaluadores eligió cada uno",
    );
  });

  it("sin calificaciones no hay línea", () => {
    expect(lineaNivelMasElegido(conteo(0, 0, 0, 0))).toBeNull();
  });
});

describe("párrafo del Resumen del grupo (PRD §11.3)", () => {
  const indicador = (numero: number, titulo: string, media: number | null): IndicadorGrupo => ({
    indicadorId: `i${numero}`,
    numero,
    titulo,
    media,
    nivel: media === null ? null : nivelGeneral(media),
    brecha: media === null ? null : brechaSiguienteNivel(media),
  });
  const grupo = (puntaje: number | null, indicadores: IndicadorGrupo[] | null, fuertes: number[] = [], debiles: number[] = []) => ({
    puntaje,
    nivel: puntaje === null ? null : nivelGeneral(puntaje),
    brecha: puntaje === null ? null : brechaSiguienteNivel(puntaje),
    indicadores,
    masFuertes: fuertes.map((n) => indicadores![n - 1]),
    masDebiles: debiles.map((n) => indicadores![n - 1]),
  });
  const cuatro = [
    indicador(1, "Actúa de manera rápida y flexible.", 70),
    indicador(2, "Ajusta su método.", 63),
    indicador(3, "Mantiene la calma.", 47),
    indicador(4, "Propone soluciones.", 65),
  ];

  it("nivel, brecha, indicador más fuerte y el que más necesita refuerzo", () => {
    expect(parrafoResumenGrupo(grupo(61, cuatro, [1], [3]))).toBe(
      "El grupo alcanzó un nivel Avanzado (61). Le faltan 15 puntos para Experto. " +
        "El indicador más fuerte es «Actúa de manera rápida y flexible» (70) y el que más necesita refuerzo es «Mantiene la calma» (47).",
    );
  });

  it("Experto: nivel máximo alcanzado", () => {
    expect(parrafoResumenGrupo(grupo(83, cuatro, [1], [3]))).toMatch(/^El grupo alcanzó un nivel Experto \(83\)\. Nivel máximo alcanzado\. /);
  });

  it("los empates se nombran por número", () => {
    const empatados = [indicador(1, "A", 67), indicador(2, "B", 67), indicador(3, "C", 50), indicador(4, "D", 50)];
    expect(parrafoResumenGrupo(grupo(58, empatados, [1, 2], [3, 4]))).toBe(
      "El grupo alcanzó un nivel Avanzado (58). Le faltan 18 puntos para Experto. " +
        "Los indicadores 1 y 2 son los más fuertes (67) y los indicadores 3 y 4 son los que más necesitan refuerzo (50).",
    );
  });

  it("todos los indicadores iguales: frase neutra", () => {
    const iguales = [1, 2, 3, 4].map((n) => indicador(n, `T${n}`, 33));
    expect(parrafoResumenGrupo(grupo(33, iguales, [1, 2, 3, 4], [1, 2, 3, 4]))).toBe(
      "El grupo alcanzó un nivel Intermedio (33). Le faltan 18 puntos para Avanzado. Todos los indicadores tienen el mismo promedio (33).",
    );
  });

  it("sin indicadores comunes (dos plantillas) omite la frase de indicadores; sin puntaje, frase neutra", () => {
    // A gap of 1 point reads in the singular.
    expect(parrafoResumenGrupo(grupo(50, null))).toBe("El grupo alcanzó un nivel Intermedio (50). Le falta 1 punto para Avanzado.");
    expect(parrafoResumenGrupo(grupo(null, null))).toBe("Aún no hay participantes con puntaje general.");
  });
});
