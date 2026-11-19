import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ordenarPorGrupo } from "@/config/participantes";
import {
  claveNombre,
  leerDistribucion,
  nombrePrimero,
  planificarImportacion,
  type Estudiante,
  type FilaGuardada,
} from "@/lib/distribucion";
import { leerPrimeraHoja } from "../../scripts/xlsx";

// The COFI distribution sheets → groups (PRD §5.4, §5.10, v1.8), with fake
// names only: the real sheets are PII and never enter the repo.

/** A minimal .xlsx (zip of the 4 XML parts) with these cells, like the docentes' sheets. */
function crearXlsx(celdas: Record<string, string>): Buffer {
  const textos = Object.values(celdas);
  const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const filas = new Map<number, string[]>();
  Object.keys(celdas).forEach((ref, i) => {
    const fila = Number(/\d+$/.exec(ref)![0]);
    filas.set(fila, [...(filas.get(fila) ?? []), `<c r="${ref}" t="s"><v>${i}</v></c>`]);
  });
  const partes: Record<string, string> = {
    "xl/workbook.xml":
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/sharedStrings.xml": `<sst>${textos.map((t) => `<si><t xml:space="preserve">${escapar(t)}</t></si>`).join("")}</sst>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${[...filas]
      .map(([n, c]) => `<row r="${n}">${c.join("")}</row>`)
      .join("")}<row r="99"><c r="A99" s="1"/></row></sheetData></worksheet>`,
  };
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const [nombre, contenido] of Object.entries(partes)) {
    const bytesNombre = Buffer.from(nombre);
    const datos = deflateRawSync(Buffer.from(contenido));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt16LE(bytesNombre.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt16LE(bytesNombre.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    locales.push(local, bytesNombre, datos);
    centrales.push(central, bytesNombre);
    desplazamiento += 30 + bytesNombre.length + datos.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(partes).length, 8);
  fin.writeUInt16LE(Object.keys(partes).length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

// Same layout as the real sheets: title rows, "Grupo N" headings on row 9,
// students from row 11 (one blank row between), a stated total, then the
// schedule below.
const HOJA = {
  B4: "Laboratorio de Assessment Center Grupo Lunes noche",
  B5: "Distribución de estudiantes COFI GL(n)",
  B9: "Grupo 1",
  E9: "Grupo 2",
  I9: "Grupo 3",
  B11: "1. Mora Solís Ana Lucía",
  E11: "1. Pérez Rojas Bruno",
  I11: "1. Vargas de la Cruz Carla María",
  B12: "2. Quesada Ulate María de los Ángeles",
  E12: "2. Jiménez Ulloa Dana Sofía. ",
  B13: "3. Brenes   Castro Elena",
  P17: "*total estudiantes: 6",
  B19: "DISTRIBUCIÓN DE ASSESSMENT CENTER",
  B21: "Bienvenida: 6:00 a 6:15 p.m",
  B26: "Prueba de simulación equipo 1. Adaptabilidad",
  C26: "Equipo 1 COFI",
};

function estudiante(grupo: number, nombreHoja: string, linea = 1): Estudiante {
  return { grupo, nombreHoja, nombre: nombrePrimero(nombreHoja), posicion: `Grupo ${grupo}, línea ${linea}` };
}

function fila(numero: number, nombre: string | null, extra: Partial<FilaGuardada> = {}): FilaGuardada {
  return { numero, nombre, carnet: null, tieneCorreo: false, grupo: null, activo: true, ...extra };
}

describe("leerPrimeraHoja (xlsx)", () => {
  it("lee las celdas de texto de la primera hoja, con tildes y entidades", () => {
    const celdas = leerPrimeraHoja(crearXlsx({ B2: "Grupo 1", B3: "1. Ñúñez & Solís Ana" }));
    expect(celdas.get("B2")).toBe("Grupo 1");
    expect(celdas.get("B3")).toBe("1. Ñúñez & Solís Ana");
    expect(celdas.has("A99")).toBe(false);
  });

  it("rechaza un archivo que no es un zip", () => {
    expect(() => leerPrimeraHoja(Buffer.from("no es un xlsx, solo texto de relleno suficiente"))).toThrow(/no es un .xlsx/);
  });
});

describe("leerDistribucion", () => {
  it("lee cada grupo con sus estudiantes en orden, y la jornada del título", () => {
    const d = leerDistribucion(leerPrimeraHoja(crearXlsx(HOJA)));
    expect(d.errores).toEqual([]);
    expect(d.pistaJornada).toBe("noche");
    expect(d.totalDeclarado).toBe(6);
    expect(d.estudiantes.map((e) => [e.grupo, e.nombre, e.posicion])).toEqual([
      [1, "Ana Lucía Mora Solís", "Grupo 1, línea 1"],
      [1, "María de los Ángeles Quesada Ulate", "Grupo 1, línea 2"],
      [1, "Elena Brenes Castro", "Grupo 1, línea 3"],
      [2, "Bruno Pérez Rojas", "Grupo 2, línea 1"],
      [2, "Dana Sofía Jiménez Ulloa", "Grupo 2, línea 2"],
      [3, "Carla María Vargas de la Cruz", "Grupo 3, línea 1"],
    ]);
  });

  it("reconoce la hoja de día como mañana", () => {
    const d = leerDistribucion(new Map([["B4", "Grupo Viernes día"], ["B9", "Grupo 1"], ["B10", "1. Mora Solís Ana"]]));
    expect(d.pistaJornada).toBe("manana");
  });

  it("informa por posición (sin nombres) un total distinto, un grupo vacío o una persona repetida", () => {
    const d = leerDistribucion(
      new Map([
        ["B9", "Grupo 1"],
        ["B11", "1. Mora Solís Ana"],
        ["E9", "Grupo 2"],
        ["E11", "1. SOLIS MORA ana"],
        ["I9", "Grupo 3"],
        ["P17", "*total estudiantes: 5"],
      ]),
    );
    expect(d.errores).toEqual([
      "«Grupo 3» no tiene estudiantes debajo.",
      "Grupo 2, línea 1: la misma persona ya está en Grupo 1, línea 1.",
      "La hoja dice 5 estudiantes, pero se leyeron 2.",
    ]);
    expect(d.errores.join(" ")).not.toMatch(/Mora|Solís/i);
  });

  it("sin encabezados «Grupo N» es un error", () => {
    expect(leerDistribucion(new Map([["B2", "Lista"]])).errores).toEqual(["La hoja no tiene encabezados «Grupo N»."]);
  });
});

describe("nombrePrimero y claveNombre", () => {
  it.each([
    ["Mora Solís Ana Lucía", "Ana Lucía Mora Solís"],
    ["Mora Solís Ana", "Ana Mora Solís"],
    ["Vargas de la Cruz Carla", "Carla Vargas de la Cruz"],
    ["Mora Ana", "Mora Ana"],
  ])("«%s» → «%s»", (hoja, esperado) => {
    expect(nombrePrimero(hoja)).toBe(esperado);
  });

  it("la clave ignora orden, tildes, mayúsculas y puntuación", () => {
    expect(claveNombre("Ana Lucía Mora Solís")).toBe(claveNombre("MORA SOLIS, ana lucia."));
    expect(claveNombre("Ana Mora")).not.toBe(claveNombre("Ana Mora Solís"));
  });
});

describe("planificarImportacion", () => {
  const hoja = [estudiante(1, "Mora Solís Ana"), estudiante(2, "Pérez Rojas Bruno"), estudiante(2, "Brenes Castro Elena", 2)];

  it("sin nombres guardados, la hoja es la lista en orden de grupo", () => {
    expect(planificarImportacion(hoja, [])).toEqual({
      modo: "crear",
      nombres: ["Ana Mora Solís", "Bruno Pérez Rojas", "Elena Brenes Castro"],
      grupos: [1, 2, 2],
    });
    expect(planificarImportacion(hoja, [fila(1, null), fila(2, null)]).modo).toBe("crear");
  });

  it("no crea la lista encima de carnés o correos guardados sin nombre", () => {
    expect(planificarImportacion(hoja, [fila(1, null, { carnet: "100000001" })]).modo).toBe("error");
    expect(planificarImportacion(hoja, [fila(1, null, { tieneCorreo: true })]).modo).toBe("error");
  });

  it("con nombres guardados, asigna el grupo por nombre y deja «Sin grupo» a quien no está en la hoja", () => {
    const filas = [
      fila(1, "Elena Brenes Castro"),
      fila(2, "Ana Mora Solís", { grupo: 1 }),
      fila(3, "Bruno Pérez Rojas"),
      fila(4, "Diego Ulate Mora", { grupo: 3 }),
      fila(5, "Oculto Uno", { activo: false }),
    ];
    expect(planificarImportacion(hoja, filas)).toEqual({
      modo: "asignar",
      grupos: [
        { numero: 1, grupo: 2 },
        { numero: 2, grupo: 1 },
        { numero: 3, grupo: 2 },
        { numero: 4, grupo: null },
      ],
      sinGrupo: 1,
      cambios: 3,
    });
  });

  it("una fila de la hoja que no coincide, o coincide con dos, detiene la importación (por posición)", () => {
    const plan = planificarImportacion(hoja, [fila(1, "Ana Mora Solís"), fila(2, "Ana Mora Solís"), fila(3, "Bruno Pérez")]);
    expect(plan).toEqual({
      modo: "error",
      errores: [
        "Grupo 1, línea 1: coincide con varios participantes de la lista guardada.",
        "Grupo 2, línea 1: no coincide con ningún nombre de la lista guardada.",
        "Grupo 2, línea 2: no coincide con ningún nombre de la lista guardada.",
      ],
    });
  });
});

describe("ordenarPorGrupo", () => {
  it("ordena por grupo y número, con «Sin grupo» al final, sin mutar", () => {
    const lista = [
      { numero: 1, grupo: 2 },
      { numero: 2, grupo: null },
      { numero: 3, grupo: 1 },
      { numero: 4, grupo: 2 },
      { numero: 5, grupo: 1 },
    ];
    expect(ordenarPorGrupo(lista).map((p) => p.numero)).toEqual([3, 5, 1, 4, 2]);
    expect(lista.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5]);
  });
});
