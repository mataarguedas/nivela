import { writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { NivelValor } from "@/config/niveles";
import { modeloResultados } from "@/lib/correos/resultados";
import { aWinAnsi, envolver, resultadosPdf } from "@/lib/pdf/resultadosPdf";
import { brechaSiguienteNivel, nivelGeneral } from "@/lib/puntajes";
import type { CompetenciaResultado, DatosResultados } from "@/lib/resultados";

// The general report as a PDF (PRD §5.14, v1.16): a valid PDF, the same bytes
// for the same data (a retried send keeps its Idempotency-Key payload), the
// same strings as the email (modeloResultados), long reports flow onto more
// pages, and characters outside WinAnsi never throw.

const FECHA = new Date("2026-11-20T15:30:00Z");

function competencia(id: string, puntaje: number | null, evaluaciones = 3): CompetenciaResultado {
  const comp = obtenerCompetencia("manana", id)!;
  if (puntaje === null) return { id, nombre: comp.nombre, resultado: null };
  return {
    id,
    nombre: comp.nombre,
    resultado: {
      puntaje,
      nivel: nivelGeneral(puntaje),
      brecha: brechaSiguienteNivel(puntaje),
      evaluaciones,
      indicadores: comp.indicadores.map((ind, i) => {
        const media = Math.min(100, puntaje + i * 9);
        const brecha = brechaSiguienteNivel(media);
        return {
          numero: i + 1,
          titulo: ind.titulo,
          media,
          nivel: brecha.nivelActual,
          brecha,
          descripcionSiguiente: brecha.siguiente ? ind.niveles[brecha.siguiente as NivelValor] : null,
        };
      }),
    },
  };
}

function datos(nombre: string | null, competencias: CompetenciaResultado[]): DatosResultados {
  const evaluadas = competencias.flatMap((c) => (c.resultado ? [c.resultado] : []));
  const promedio = evaluadas.reduce((s, r) => s + r.puntaje, 0) / evaluadas.length;
  return {
    nombre,
    jornada: "Mañana",
    promedio,
    nivel: nivelGeneral(promedio),
    brecha: brechaSiguienteNivel(promedio),
    competenciasEvaluadas: evaluadas.length,
    competenciasDisponibles: competencias.length,
    evaluaciones: evaluadas.reduce((s, r) => s + r.evaluaciones, 0),
    competencias,
  };
}

const UNA = datos("Bruno Chaves", [competencia("adaptabilidad", 42), competencia("pensamiento-critico", null)]);
const TODAS = datos("Ana Lucía Mora Solís", [
  competencia("pensamiento-critico", 30),
  competencia("autorregulacion-emocional", 55),
  competencia("orientacion-detalle", 70),
  competencia("adaptabilidad", 81),
  competencia("orientacion-resultados", 12),
]);

describe("resultadosPdf", () => {
  it("genera un PDF válido de tamaño carta con el título y sin el nombre en los metadatos", async () => {
    const bytes = await resultadosPdf(UNA, { fecha: FECHA });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    expect(doc.getTitle()).toBe("Su reporte general de competencias");
    expect(doc.getAuthor()).toBeUndefined();
    expect(doc.getCreationDate()?.toISOString()).toBe(FECHA.toISOString());
  });

  it("los mismos datos dan los mismos bytes", async () => {
    const a = await resultadosPdf(TODAS, { fecha: FECHA });
    const b = await resultadosPdf(TODAS, { fecha: FECHA });
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("un reporte con todas las competencias ocupa varias páginas", async () => {
    const doc = await PDFDocument.load(await resultadosPdf(TODAS, { fecha: FECHA }));
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("un nombre con caracteres fuera de WinAnsi no lo rompe", async () => {
    const raro = datos("Ana 李 Ŝolís 😀", [competencia("adaptabilidad", 90)]);
    await expect(resultadosPdf(raro, { fecha: FECHA })).resolves.toBeInstanceOf(Uint8Array);
  });

  it("muestra lo mismo que el correo: el modelo no tiene evaluadores, observaciones ni datos de IA", () => {
    const texto = JSON.stringify(modeloResultados(UNA));
    expect(texto).toContain("Hola, Bruno Chaves:");
    expect(texto).toContain("Le faltan 9 puntos para Avanzado");
    expect(texto).not.toMatch(/evaluador|observaci|confianza|\bIA\b/i);
  });

  // Not an assertion: leaves a sample next to the test run for a visual check.
  it("muestra", async () => {
    if (process.env.NIVELA_PDF_MUESTRA) writeFileSync(process.env.NIVELA_PDF_MUESTRA, await resultadosPdf(TODAS, { fecha: FECHA }));
  });
});

describe("aWinAnsi y envolver", () => {
  it("conserva el español, cambia lo demás por su letra base o «?», y une los espacios", async () => {
    const doc = await PDFDocument.create();
    const fuente = await doc.embedFont(StandardFonts.Helvetica);
    const admitidos = new Set(fuente.getCharacterSet());
    expect(aWinAnsi("¿Señor Núñez? «sí» · –", admitidos)).toBe("¿Señor Núñez? «sí» · –");
    expect(aWinAnsi("Ŝ李\n\tx", admitidos)).toBe("S? x");
  });

  it("envuelve por palabras dentro del ancho y corta una palabra más larga que la línea", async () => {
    const doc = await PDFDocument.create();
    const fuente = await doc.embedFont(StandardFonts.Helvetica);
    const lineas = envolver("uno dos tres cuatro cinco seis siete ocho", fuente, 11, 60);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(fuente.widthOfTextAtSize(l, 11)).toBeLessThanOrEqual(60);
    expect(lineas.join(" ")).toBe("uno dos tres cuatro cinco seis siete ocho");
    const largo = envolver("a".repeat(80), fuente, 11, 60);
    expect(largo.length).toBeGreaterThan(1);
    expect(largo.join("")).toBe("a".repeat(80));
  });
});
