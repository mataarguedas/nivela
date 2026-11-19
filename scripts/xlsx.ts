import { inflateRawSync } from "node:zlib";

// A minimal .xlsx reader for scripts (participantes:importar): the first
// worksheet's cells as text, keyed by reference ("B11"). An .xlsx is a zip of
// XML files; this reads the zip's central directory, inflates the three
// parts it needs (workbook, its relationships, shared strings and the sheet)
// and pulls the cell values out with regular expressions. Enough for the
// distribution sheets the docentes hand out; no formulas are evaluated (the
// cached value is read) and no styles are kept. No dependency.

const FIRMA_FIN = 0x06054b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_LOCAL = 0x04034b50;

/** Every file in the zip by name, inflated. */
export function leerZip(datos: Buffer): Map<string, Buffer> {
  // The end-of-central-directory record is in the last 64 KiB + 22 bytes.
  let fin = -1;
  for (let i = datos.length - 22; i >= Math.max(0, datos.length - 65_557); i -= 1) {
    if (datos.readUInt32LE(i) === FIRMA_FIN) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("El archivo no es un .xlsx válido (no es un zip).");
  const entradas = datos.readUInt16LE(fin + 10);
  let posicion = datos.readUInt32LE(fin + 16);
  const archivos = new Map<string, Buffer>();
  for (let n = 0; n < entradas; n += 1) {
    if (datos.readUInt32LE(posicion) !== FIRMA_CENTRAL) throw new Error("El .xlsx está dañado.");
    const metodo = datos.readUInt16LE(posicion + 10);
    const tamano = datos.readUInt32LE(posicion + 20);
    const largoNombre = datos.readUInt16LE(posicion + 28);
    const largoExtra = datos.readUInt16LE(posicion + 30);
    const largoComentario = datos.readUInt16LE(posicion + 32);
    const local = datos.readUInt32LE(posicion + 42);
    const nombre = datos.toString("utf8", posicion + 46, posicion + 46 + largoNombre);
    posicion += 46 + largoNombre + largoExtra + largoComentario;

    if (datos.readUInt32LE(local) !== FIRMA_LOCAL) throw new Error("El .xlsx está dañado.");
    const inicio = local + 30 + datos.readUInt16LE(local + 26) + datos.readUInt16LE(local + 28);
    const comprimido = datos.subarray(inicio, inicio + tamano);
    if (metodo === 0) archivos.set(nombre, comprimido);
    else if (metodo === 8) archivos.set(nombre, inflateRawSync(comprimido));
    else throw new Error(`El .xlsx usa una compresión no soportada (${metodo}).`);
  }
  return archivos;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodificar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entidad, cuerpo: string) => {
    if (cuerpo[0] === "#") {
      const codigo = cuerpo[1] === "x" || cuerpo[1] === "X" ? parseInt(cuerpo.slice(2), 16) : parseInt(cuerpo.slice(1), 10);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : entidad;
    }
    return ENTIDADES[cuerpo] ?? entidad;
  });
}

/** The text of every <t> in a fragment, phonetic runs (<rPh>) left out. */
function textos(fragmento: string): string {
  const sinFonetica = fragmento.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return [...sinFonetica.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodificar(m[1])).join("");
}

function atributo(atributos: string, nombre: string): string | undefined {
  return new RegExp(`(?:^|\\s)${nombre}="([^"]*)"`).exec(atributos)?.[1];
}

function parte(archivos: Map<string, Buffer>, nombre: string): string {
  const datos = archivos.get(nombre);
  if (!datos) throw new Error(`Al .xlsx le falta ${nombre}.`);
  return datos.toString("utf8");
}

/** The first worksheet's non-empty cells as text: "B11" → "1. …". */
export function leerPrimeraHoja(datos: Buffer): Map<string, string> {
  const archivos = leerZip(datos);
  const compartidas = archivos.has("xl/sharedStrings.xml")
    ? [...parte(archivos, "xl/sharedStrings.xml").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1]))
    : [];

  const hoja = /<sheet\b([^>]*)\/?>/.exec(parte(archivos, "xl/workbook.xml"));
  const idRelacion = hoja ? atributo(hoja[1], "r:id") : undefined;
  if (!idRelacion) throw new Error("El .xlsx no tiene hojas.");
  const relaciones = parte(archivos, "xl/_rels/workbook.xml.rels");
  const relacion = [...relaciones.matchAll(/<Relationship\b([^>]*)\/?>/g)].find((m) => atributo(m[1], "Id") === idRelacion);
  const destino = relacion ? atributo(relacion[1], "Target") : undefined;
  if (!destino) throw new Error("No se encontró la primera hoja del .xlsx.");
  const ruta = destino.startsWith("/") ? destino.slice(1) : `xl/${destino}`;

  const celdas = new Map<string, string>();
  for (const m of parte(archivos, ruta).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const referencia = atributo(m[1], "r");
    const contenido = m[2] ?? "";
    if (!referencia || !contenido) continue;
    const tipo = atributo(m[1], "t");
    const valor = /<v>([\s\S]*?)<\/v>/.exec(contenido)?.[1];
    let texto: string;
    if (tipo === "inlineStr") texto = textos(contenido);
    else if (valor === undefined) continue;
    else if (tipo === "s") texto = compartidas[Number(valor)] ?? "";
    else texto = decodificar(valor);
    if (texto.trim() !== "") celdas.set(referencia, texto);
  }
  return celdas;
}
