import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { TEXTOS } from "@/config/textos";
import { modeloResultados, type IndicadorTexto } from "@/lib/correos/resultados";
import { formatearFecha } from "@/lib/formato";
import type { DatosResultados } from "@/lib/resultados";

// The general report as a PDF (PRD §5.14, v1.16): attached to the results
// email and downloadable by the docente from the send page. It draws
// modeloResultados(), the same strings as the email, so it never shows more
// than the email does: no evaluator names, individual ratings, observations,
// AI data or other participants.
//
// pdf-lib with the standard Helvetica fonts: nothing to embed or read from
// disk, so it bundles cleanly for Vercel. Server only. DESIGN.md colors, the
// blocks separated by #f5f5f7 tiles (no borders, no shadows), no images.
//
// Deterministic: the same data gives the same bytes (fixed metadata dates,
// no random id), so a retried send with the same Idempotency-Key carries the
// same payload. `fecha` is the participant's latest evaluation.

export const NOMBRE_ADJUNTO = "nivela-reporte-general.pdf";

export const TEXTOS_PDF = {
  fecha: (fecha: string) => `Resultados al ${fecha}`,
  pagina: (n: number, total: number) => `Página ${n} de ${total}`,
} as const;

// Letter, the usual paper size in Costa Rica.
const ANCHO_PAGINA = 612;
const ALTO_PAGINA = 792;
const MARGEN = 56;
const ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN;
const PIE = 36;
const RELLENO = 14;
const RADIO = 10;
const INTERLINEA = 1.4;

const hex = (valor: string): RGB =>
  rgb(parseInt(valor.slice(1, 3), 16) / 255, parseInt(valor.slice(3, 5), 16) / 255, parseInt(valor.slice(5, 7), 16) / 255);
const TINTA = hex("#1d1d1f");
const TINTA_2 = hex("#707070");
const LIENZO = hex("#f5f5f7");

type Estilo = { fuente: PDFFont; tamano: number; color: RGB };

/**
 * Text the standard fonts can draw. They only encode WinAnsi (which covers
 * Spanish: á é í ó ú ñ ü ¿ ¡ « » · – “ ”); anything else falls back to its
 * base letter (NFKD) or "?", so an unusual character in a name never throws.
 * Whitespace (a rubric's line breaks) becomes single spaces.
 */
export function aWinAnsi(texto: string, admitidos: ReadonlySet<number>): string {
  let salida = "";
  for (const caracter of texto.replace(/\s+/g, " ")) {
    const punto = caracter.codePointAt(0)!;
    if (admitidos.has(punto)) {
      salida += caracter;
      continue;
    }
    const base = [...caracter.normalize("NFKD")].filter((c) => admitidos.has(c.codePointAt(0)!)).join("");
    salida += base || "?";
  }
  return salida;
}

/** Greedy word wrap to `ancho` points; a single word wider than the line is cut. */
export function envolver(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ").filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(candidata, tamano) <= ancho) {
      actual = candidata;
      continue;
    }
    if (actual) lineas.push(actual);
    let resto = palabra;
    while (fuente.widthOfTextAtSize(resto, tamano) > ancho && resto.length > 1) {
      let corte = resto.length - 1;
      while (corte > 1 && fuente.widthOfTextAtSize(resto.slice(0, corte), tamano) > ancho) corte -= 1;
      lineas.push(resto.slice(0, corte));
      resto = resto.slice(corte);
    }
    actual = resto;
  }
  if (actual) lineas.push(actual);
  return lineas.length > 0 ? lineas : [""];
}

/** A paragraph laid out for a width: its lines and height. */
type Parrafo = { lineas: string[]; estilo: Estilo; centrado: boolean; antes: number; derecha?: { texto: string; estilo: Estilo } };

class Lienzo {
  private pagina!: PDFPage;
  private y = 0;
  readonly paginas: PDFPage[] = [];

  constructor(
    private readonly doc: PDFDocument,
    private readonly admitidos: ReadonlySet<number>,
    private readonly regular: PDFFont,
  ) {
    this.nuevaPagina();
  }

  private nuevaPagina() {
    this.pagina = this.doc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
    this.paginas.push(this.pagina);
    this.y = ALTO_PAGINA - MARGEN;
  }

  /** Moves to a new page unless `alto` points still fit above the footer (never on an empty page). */
  reservar(alto: number) {
    if (this.y - alto < MARGEN + PIE && this.y < ALTO_PAGINA - MARGEN) this.nuevaPagina();
  }

  /**
   * `derecha` (v1.20, the scale's ranges): a short text right-aligned on the
   * paragraph's first line, in the regular weight of the same size.
   */
  parrafo(
    texto: string,
    estilo: Estilo,
    { ancho = ANCHO_UTIL, centrado = false, antes = 0, derecha }: { ancho?: number; centrado?: boolean; antes?: number; derecha?: string } = {},
  ): Parrafo {
    const limpio = aWinAnsi(texto, this.admitidos);
    const p: Parrafo = { lineas: envolver(limpio, estilo.fuente, estilo.tamano, ancho), estilo, centrado, antes };
    if (derecha !== undefined) p.derecha = { texto: aWinAnsi(derecha, this.admitidos), estilo: { ...estilo, fuente: this.regular } };
    return p;
  }

  static alto(p: Parrafo): number {
    return p.antes + p.lineas.length * p.estilo.tamano * INTERLINEA;
  }

  private dibujar(p: Parrafo, x: number, ancho: number) {
    this.y -= p.antes;
    p.lineas.forEach((linea, i) => {
      const { fuente, tamano, color } = p.estilo;
      this.y -= tamano * INTERLINEA;
      const desplazamiento = p.centrado ? (ancho - fuente.widthOfTextAtSize(linea, tamano)) / 2 : 0;
      // Baseline a little above the bottom of the line box.
      this.pagina.drawText(linea, { x: x + desplazamiento, y: this.y + tamano * 0.3, size: tamano, font: fuente, color });
      if (i === 0 && p.derecha) {
        const d = p.derecha.estilo;
        const anchoDerecha = d.fuente.widthOfTextAtSize(p.derecha.texto, d.tamano);
        this.pagina.drawText(p.derecha.texto, {
          x: x + ancho - anchoDerecha,
          y: this.y + d.tamano * 0.3,
          size: d.tamano,
          font: d.fuente,
          color: d.color,
        });
      }
    });
  }

  /** Free-flowing text: a long paragraph may continue on the next page, line by line. */
  texto(p: Parrafo) {
    this.reservar(p.antes + p.estilo.tamano * INTERLINEA);
    this.y -= p.antes;
    for (const linea of p.lineas) {
      this.reservar(p.estilo.tamano * INTERLINEA);
      this.dibujar({ ...p, lineas: [linea], antes: 0 }, MARGEN, ANCHO_UTIL);
    }
  }

  /** Paragraphs kept together (a heading with what follows it). */
  juntos(parrafos: Parrafo[]) {
    this.reservar(parrafos.reduce((suma, p) => suma + Lienzo.alto(p), 0));
    for (const p of parrafos) this.dibujar(p, MARGEN, ANCHO_UTIL);
  }

  /** Height of a tile, padding included (spacing after it excluded). */
  static altoBloque(parrafos: Parrafo[]): number {
    return parrafos.reduce((suma, p) => suma + Lienzo.alto(p), 0) + 2 * RELLENO;
  }

  /** A #f5f5f7 rounded tile holding `parrafos`, never split across pages. */
  bloque(parrafos: Parrafo[], { despues = 10 } = {}) {
    const alto = Lienzo.altoBloque(parrafos);
    this.reservar(alto + despues);
    this.pagina.drawSvgPath(rectanguloRedondeado(ANCHO_UTIL, alto, RADIO), { x: MARGEN, y: this.y, color: LIENZO });
    this.y -= RELLENO;
    for (const p of parrafos) this.dibujar(p, MARGEN + RELLENO, ANCHO_UTIL - 2 * RELLENO);
    this.y -= RELLENO + despues;
  }

  espacio(alto: number) {
    this.y -= alto;
  }

  /** Footer on every page: the app line and "Página n de m". */
  pies(estilo: Estilo, izquierda: string) {
    const texto = aWinAnsi(izquierda, this.admitidos);
    this.paginas.forEach((pagina, i) => {
      const numero = aWinAnsi(TEXTOS_PDF.pagina(i + 1, this.paginas.length), this.admitidos);
      const y = MARGEN - 18;
      pagina.drawText(texto, { x: MARGEN, y, size: estilo.tamano, font: estilo.fuente, color: estilo.color });
      const ancho = estilo.fuente.widthOfTextAtSize(numero, estilo.tamano);
      pagina.drawText(numero, { x: ANCHO_PAGINA - MARGEN - ancho, y, size: estilo.tamano, font: estilo.fuente, color: estilo.color });
    });
  }
}

/** SVG path of a rounded rectangle whose top-left corner is the origin (SVG y grows downward). */
function rectanguloRedondeado(ancho: number, alto: number, r: number): string {
  return [
    `M ${r} 0`,
    `H ${ancho - r}`,
    `Q ${ancho} 0 ${ancho} ${r}`,
    `V ${alto - r}`,
    `Q ${ancho} ${alto} ${ancho - r} ${alto}`,
    `H ${r}`,
    `Q 0 ${alto} 0 ${alto - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    "Z",
  ].join(" ");
}

/** The participant's general report as PDF bytes. */
export async function resultadosPdf(datos: DatosResultados, { fecha }: { fecha: Date }): Promise<Uint8Array> {
  const m = modeloResultados(datos);
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(m.titulo);
  doc.setLanguage("es-CR");
  doc.setCreator(TEXTOS.app.nombre);
  doc.setProducer(TEXTOS.app.nombre);
  doc.setCreationDate(fecha);
  doc.setModificationDate(fecha);

  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const admitidos = new Set(normal.getCharacterSet());
  const lienzo = new Lienzo(doc, admitidos, normal);

  const e = (fuente: PDFFont, tamano: number, color = TINTA): Estilo => ({ fuente, tamano, color });
  const marca = e(negrita, 13);
  const titulo = e(negrita, 20);
  const h2 = e(negrita, 14);
  const h3 = e(negrita, 12.5);
  const cuerpo = e(normal, 11);
  const cuerpoNegrita = e(negrita, 11);
  const secundario = e(normal, 10.5, TINTA_2);
  const pequeno = e(normal, 9, TINTA_2);
  const anchoTile = ANCHO_UTIL - 2 * RELLENO;

  // Header: wordmark, date, title.
  lienzo.juntos([
    lienzo.parrafo(TEXTOS.app.nombre, marca),
    lienzo.parrafo(TEXTOS_PDF.fecha(formatearFecha(fecha)), pequeno, { antes: 2 }),
    lienzo.parrafo(m.titulo, titulo, { antes: 14 }),
  ]);
  lienzo.texto(lienzo.parrafo(m.saludo, cuerpo, { antes: 12 }));
  lienzo.texto(lienzo.parrafo(m.introduccion, cuerpo, { antes: 6 }));
  lienzo.espacio(12);

  // Overall result, centered like the email's highlighted block.
  const g = m.general;
  const centrado = { ancho: anchoTile, centrado: true };
  lienzo.bloque([
    lienzo.parrafo(g.etiqueta, pequeno, centrado),
    lienzo.parrafo(g.nivel, e(negrita, 24), { ...centrado, antes: 2 }),
    lienzo.parrafo(g.promedio, e(normal, 12), { ...centrado, antes: 4 }),
    lienzo.parrafo(g.brecha, secundario, { ...centrado, antes: 2 }),
    lienzo.parrafo(g.cobertura, secundario, centrado),
  ]);
  lienzo.texto(lienzo.parrafo(m.evaluaciones, cuerpo, { antes: 2 }));

  // v1.20: the point scale, a tile with one row per level (level left, range right-aligned).
  const tituloEscala = lienzo.parrafo(m.escala.titulo, h2, { antes: 18 });
  const filasEscala = [
    lienzo.parrafo(m.escala.introduccion, secundario, { ancho: anchoTile }),
    ...m.escala.filas.map((fila) =>
      lienzo.parrafo(fila.nivel, cuerpoNegrita, { ancho: anchoTile, antes: 4, derecha: fila.rango }),
    ),
  ];
  lienzo.reservar(Lienzo.alto(tituloEscala) + 8 + Lienzo.altoBloque(filasEscala));
  lienzo.juntos([tituloEscala]);
  lienzo.espacio(8);
  lienzo.bloque(filasEscala);

  // Summary: one tile with a row per competencia.
  // Headings never end a page: each reserves room for what follows it.
  const tituloResumen = lienzo.parrafo(m.resumenTitulo, h2, { antes: 18 });
  const filasResumen = m.resumen.flatMap((fila, i) => [
    lienzo.parrafo(fila.nombre, cuerpoNegrita, { ancho: anchoTile, antes: i === 0 ? 0 : 8 }),
    lienzo.parrafo(fila.linea, fila.evaluada ? cuerpo : secundario, { ancho: anchoTile }),
  ]);
  lienzo.reservar(Lienzo.alto(tituloResumen) + 8 + Lienzo.altoBloque(filasResumen));
  lienzo.juntos([tituloResumen]);
  lienzo.espacio(8);
  lienzo.bloque(filasResumen);

  // Detail: per evaluated competencia, its result and a tile per indicator.
  const tituloDetalle = lienzo.parrafo(m.detalleTitulo, h2, { antes: 14 });
  lienzo.reservar(Lienzo.alto(tituloDetalle) + 140);
  lienzo.juntos([tituloDetalle]);
  const tileIndicador = (i: IndicadorTexto) => [
    lienzo.parrafo(i.titulo, cuerpoNegrita, { ancho: anchoTile }),
    lienzo.parrafo(i.puntaje, cuerpo, { ancho: anchoTile, antes: 3 }),
    lienzo.parrafo(i.brecha, secundario, { ancho: anchoTile }),
    ...(i.siguiente ? [lienzo.parrafo(i.siguiente, e(normal, 10), { ancho: anchoTile, antes: 5 })] : []),
  ];
  for (const d of m.detalle) {
    // The competencia's heading stays with its first indicator.
    const encabezado = [
      lienzo.parrafo(d.nombre, h3, { antes: 12 }),
      lienzo.parrafo(d.puntaje, cuerpo, { antes: 4 }),
      lienzo.parrafo(d.brecha, secundario),
      lienzo.parrafo(d.evaluaciones, secundario),
    ];
    const primero = d.indicadores[0] ? Lienzo.altoBloque(tileIndicador(d.indicadores[0])) : 0;
    lienzo.reservar(encabezado.reduce((suma, p) => suma + Lienzo.alto(p), 0) + 8 + primero);
    lienzo.juntos(encabezado);
    lienzo.espacio(8);
    d.indicadores.forEach((i) => lienzo.bloque(tileIndicador(i)));
  }

  lienzo.texto(lienzo.parrafo(m.cierre, secundario, { antes: 10 }));
  lienzo.texto(lienzo.parrafo(m.cierreGeneral, secundario, { antes: 4 }));
  lienzo.pies(pequeno, `${TEXTOS.app.nombre} · ${TEXTOS.app.lema}`);

  return doc.save();
}
