import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  competenciasDeJornada,
  DEFINICIONES_COMPETENCIA,
  obtenerCompetencia,
  obtenerCompetenciaHabilitada,
  obtenerDefinicionCompetencia,
  type Rubrica,
} from "@/config/competencias";
import {
  competenciaConEquipo,
  competenciaDisponible,
  CURSOS,
  EQUIPOS,
  equipoDeCompetencia,
  obtenerEvaluador,
} from "@/config/equipos";
import { esJornada, IDS_JORNADA, JORNADAS, type JornadaId } from "@/config/jornadas";
import { NIVELES } from "@/config/niveles";
import {
  CANTIDAD_PARTICIPANTES_PREDETERMINADA,
  crearParticipante,
  esCarnetValido,
  formatearCarnet,
  normalizarCarnet,
  esIdParticipante,
  esNombreValido,
  generarParticipantes,
  leerCantidadParticipantes,
} from "@/config/participantes";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const prd = readFileSync(join(process.cwd(), "PRD.md"), "utf8").replaceAll("\r\n", "\n");

function seccion(desde: string, hasta: string): string {
  const inicio = prd.indexOf(desde);
  const fin = prd.indexOf(hasta, inicio);
  if (inicio < 0 || fin < 0) throw new Error(`Section "${desde}" not found in PRD.md`);
  return prd.slice(inicio, fin);
}

function duplicados(ids: readonly string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

// Distinct rubric objects: a jornada may share another's rubric object, and
// then its indicators are the same ones (none do since v1.7).
const rubricas = [...new Set(DEFINICIONES_COMPETENCIA.flatMap((d) => Object.values(d.rubricas)))] as Rubrica[];
const indicadores = rubricas.flatMap((r) => r.indicadores);
const integrantes = EQUIPOS.flatMap((e) => e.integrantes);

describe("niveles", () => {
  it("son Básico..Experto con valores 1–4 en orden", () => {
    expect(NIVELES.map((n) => [n.valor, n.clave, n.etiqueta])).toEqual([
      [1, "basico", "Básico"],
      [2, "intermedio", "Intermedio"],
      [3, "avanzado", "Avanzado"],
      [4, "experto", "Experto"],
    ]);
  });
});

describe("ids únicos y con formato estable", () => {
  it.each([
    ["competencias", DEFINICIONES_COMPETENCIA.map((c) => c.id)],
    ["indicadores", indicadores.map((i) => i.id)],
    ["equipos", EQUIPOS.map((e) => e.id)],
    ["integrantes", integrantes.map((i) => i.id)],
  ])("%s", (_, ids) => {
    expect(duplicados(ids)).toEqual([]);
    for (const id of ids) expect(id).toMatch(SLUG);
  });

  it("participantes", () => {
    expect(duplicados(generarParticipantes(99).map((p) => p.id))).toEqual([]);
  });
});

describe("competencias", () => {
  it("sus ids no chocan con rutas fijas ni con las claves de borrador", () => {
    // /[competencia] sits at the root next to these folders, and
    // "nivela:v1:evaluador:<id>" would collide with a competencia called "evaluador".
    const reservados = ["acceso", "api", "dev", "reportes", "evaluador"];
    for (const c of DEFINICIONES_COMPETENCIA) expect(reservados).not.toContain(c.id);
  });

  it("son las 5 del PRD y todas tienen rúbrica en ambas jornadas (v1.7)", () => {
    expect(DEFINICIONES_COMPETENCIA).toHaveLength(5);
    const habilitadas = (jornada: JornadaId) => competenciasDeJornada(jornada).filter((c) => c.habilitada).map((c) => c.id);
    expect(habilitadas("manana")).toEqual(DEFINICIONES_COMPETENCIA.map((c) => c.id));
    expect(habilitadas("noche")).toEqual(DEFINICIONES_COMPETENCIA.map((c) => c.id));
  });

  it("cada jornada califica con su propia plantilla: las rúbricas de noche usan ids «…-noche-N»", () => {
    for (const d of DEFINICIONES_COMPETENCIA) {
      const { manana, noche } = d.rubricas;
      expect(noche).toBeDefined();
      expect(noche).not.toBe(manana);
      expect(noche!.indicadores.map((i) => i.id)).toEqual(noche!.indicadores.map((i) => `${d.id}-noche-${i.numero}`));
    }
    // Night evaluations sent before v1.7 used the morning Adaptabilidad ids; they keep their text.
    expect(obtenerCompetenciaHabilitada("manana", "adaptabilidad")?.indicadores[0].id).toBe("adaptabilidad-1");
  });

  it("los ids de indicador llevan el id de su competencia y nunca se repiten entre rúbricas", () => {
    for (const d of DEFINICIONES_COMPETENCIA) {
      for (const rubrica of Object.values(d.rubricas)) {
        for (const i of rubrica.indicadores) expect(i.id.startsWith(`${d.id}-`)).toBe(true);
      }
    }
    // Ids are stored in the DB: a new rubric needs new ids (competencias/index.ts).
    expect(duplicados(indicadores.map((i) => i.id))).toEqual([]);
  });

  it.each(indicadores.map((i) => [i.id, i] as const))(
    "%s tiene exactamente 4 niveles no vacíos",
    (_, indicador) => {
      expect(Object.keys(indicador.niveles).sort()).toEqual(["1", "2", "3", "4"]);
      for (const texto of Object.values(indicador.niveles)) expect(texto.trim()).not.toBe("");
      expect(indicador.titulo.trim()).not.toBe("");
    },
  );

  it("numeran sus indicadores 1..n", () => {
    for (const r of rubricas) {
      expect(r.indicadores.map((i) => i.numero)).toEqual(r.indicadores.map((_, i) => i + 1));
    }
  });

  const conRubrica = IDS_JORNADA.flatMap((j) =>
    competenciasDeJornada(j)
      .filter((c) => c.habilitada)
      .map((c) => [`${c.id} (${j})`, j, c] as const),
  );

  it.each(conRubrica)("%s con rúbrica tiene equipo en esa jornada, definición, fuente e indicadores", (_, jornada, c) => {
    expect(equipoDeCompetencia(jornada, c.id)?.integrantes.length ?? 0).toBeGreaterThan(0);
    expect(competenciaDisponible(jornada, c.id)).toBe(true);
    expect(competenciaConEquipo(c.id)).toBe(true);
    expect(c.definicion.trim()).not.toBe("");
    expect(c.fuente.trim()).not.toBe("");
    expect(c.indicadores.length).toBeGreaterThanOrEqual(1);
  });

  it("sin rúbrica en una jornada: deshabilitada y vacía allí", () => {
    for (const jornada of IDS_JORNADA) {
      for (const c of competenciasDeJornada(jornada).filter((c) => !c.habilitada)) {
        expect([c.definicion, c.fuente, c.indicadores]).toEqual(["", "", []]);
        expect(competenciaDisponible(jornada, c.id)).toBe(false);
      }
    }
  });

  it("obtenerCompetenciaHabilitada usa la rúbrica de la jornada e ignora las que no la tienen", () => {
    expect(obtenerCompetenciaHabilitada("manana", "adaptabilidad")?.id).toBe("adaptabilidad");
    expect(obtenerCompetenciaHabilitada("noche", "adaptabilidad")?.id).toBe("adaptabilidad");
    expect(obtenerCompetenciaHabilitada("manana", "orientacion-detalle")?.indicadores).toHaveLength(4);
    expect(obtenerCompetenciaHabilitada("noche", "orientacion-detalle")?.indicadores[0].titulo).toBe(
      "Asegura que la información esté completa y precisa.",
    );
    expect(obtenerCompetenciaHabilitada("manana", "no-existe")).toBeUndefined();
    expect(obtenerDefinicionCompetencia("orientacion-detalle")?.nombre).toBe("Orientación al detalle");
  });
});

/** "Mañana, Noche" → ["manana", "noche"]. */
function jornadasDe(texto: string): JornadaId[] {
  return texto.split(", ").map((nombre) => {
    const jornada = JORNADAS.find((j) => j.nombre === nombre.trim());
    if (!jornada) throw new Error(`Unknown jornada "${nombre}" in PRD Appendix A`);
    return jornada.id;
  });
}

// One "### A.n {competencia} · {jornadas}" section per rubric.
const seccionesRubrica = seccion("## Appendix A", "## Appendix B")
  .split(/^(?=### A\.\d+ )/m)
  .slice(1)
  .map((bloque) => {
    const [, nombre, jornadas] = bloque.match(/^### A\.\d+ (.+) · (.+)\n/)!;
    return { nombre, jornadas: jornadasDe(jornadas), cuerpo: bloque };
  });

describe("las rúbricas coinciden con PRD Apéndice A", () => {
  it("hay una sección por rúbrica y cubren exactamente las competencias habilitadas de cada jornada", () => {
    expect(seccionesRubrica.length).toBeGreaterThanOrEqual(5);
    for (const jornada of IDS_JORNADA) {
      const enApendice = seccionesRubrica.filter((s) => s.jornadas.includes(jornada)).map((s) => s.nombre);
      const habilitadas = competenciasDeJornada(jornada).filter((c) => c.habilitada).map((c) => c.nombre);
      expect(enApendice.sort()).toEqual(habilitadas.sort());
    }
  });

  describe.each(seccionesRubrica.map((s) => [`${s.nombre} · ${s.jornadas.join(", ")}`, s] as const))(
    "%s",
    (_, { nombre, jornadas, cuerpo }) => {
      const id = DEFINICIONES_COMPETENCIA.find((d) => d.nombre === nombre)?.id ?? "";

      it.each(jornadas)("definición y fuente (%s)", (jornada) => {
        const competencia = obtenerCompetenciaHabilitada(jornada, id)!;
        const texto = cuerpo.match(/\*\*Definición:\*\* ([\s\S]+?)\n\*\*Fuente:\*\*/)?.[1] ?? "";
        // Paragraphs are blank-line separated in the PRD and "\n"-separated in config.
        const parrafos = texto
          .trim()
          .split(/\n\s*\n/)
          .map((p) => p.trim());
        expect(competencia.definicion).toBe(parrafos.join("\n"));
        expect(competencia.fuente).toBe(cuerpo.match(/\*\*Fuente:\*\* (.+)/)?.[1].trim());
      });

      it.each(jornadas)("4 indicadores × 4 niveles, texto exacto (%s)", (jornada) => {
        const competencia = obtenerCompetenciaHabilitada(jornada, id)!;
        const bloques = [...cuerpo.matchAll(/\*\*Indicador (\d)\. (.+?)\*\*\n((?:- .+\n?){4})/g)];
        const esperado = bloques.map(([, numero, titulo, lineas]) => ({
          numero: Number(numero),
          titulo,
          niveles: Object.fromEntries(
            lineas
              .trim()
              .split("\n")
              .map((linea, i) => {
                const [, etiqueta, texto] = linea.match(/^- (\S+): (.+)$/)!;
                expect(etiqueta).toBe(NIVELES[i].etiqueta);
                return [String(i + 1), texto.trim()];
              }),
          ),
        }));

        expect(esperado).toHaveLength(4);
        expect(competencia.indicadores.map(({ numero, titulo, niveles }) => ({ numero, titulo, niveles }))).toEqual(
          esperado,
        );
      });
    },
  );
});

describe("jornadas", () => {
  it("son mañana y noche, con ids estables", () => {
    expect(JORNADAS.map((j) => [j.id, j.nombre])).toEqual([
      ["manana", "Mañana"],
      ["noche", "Noche"],
    ]);
    expect(esJornada("noche")).toBe(true);
    expect(esJornada("tarde")).toBe(false);
  });

  it("las restricciones de la base de datos aceptan exactamente estos ids", () => {
    const esquema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
    const lista = IDS_JORNADA.map((j) => `'${j}'`).join(", ");
    // One check per table with a jornada column (evaluaciones, participantes, asistencia…).
    const restricciones = esquema.match(/jornada\} in \(([^)]+)\)/g) ?? [];
    expect(restricciones.length).toBe((esquema.match(/jornada: text\("jornada"/g) ?? []).length);
    for (const restriccion of restricciones) expect(restriccion).toBe(`jornada} in (${lista})`);
  });
});

/** "| 4 | Adaptabilidad | Sí | a, b | c, d |" rows of one jornada's Appendix B table. */
function filasApendiceB(desde: string, hasta: string) {
  return seccion(desde, hasta)
    .split("\n")
    .filter((linea) => /^\| \**\d/.test(linea))
    .map((linea) =>
      linea
        .split("|")
        .slice(1, -1)
        .map((celda) => celda.replaceAll("**", "").trim()),
    );
}

// A night cell reads "Pendiente" until the roster arrives: no integrantes yet.
const nombresCelda = (celda: string) => (celda === "Pendiente" ? [] : celda.split(", "));

describe.each([
  ["manana", "### Mañana", "### Noche"],
  ["noche", "### Noche", "## Appendix C"],
] as [JornadaId, string, string][])("equipos de la jornada %s coinciden con PRD Apéndice B", (jornada, desde, hasta) => {
  const filas = filasApendiceB(desde, hasta);
  const equipos = EQUIPOS.filter((e) => e.jornada === jornada);

  it("hay 5 equipos, uno por competencia", () => {
    expect(filas).toHaveLength(5);
    expect(equipos).toHaveLength(5);
    expect(duplicados(equipos.map((e) => e.competenciaId))).toEqual([]);
    for (const e of equipos) expect(obtenerCompetencia(jornada, e.competenciaId)).toBeDefined();
  });

  it.each(filas.map((f) => [f[0], f] as const))("equipo %s", (numero, [, nombre, habilitada, psico, semi]) => {
    const equipo = equipos.find((e) => e.numero === Number(numero))!;
    const competencia = obtenerCompetencia(jornada, equipo.competenciaId)!;
    const nombresDe = (curso: string) =>
      equipo.integrantes.filter((i) => i.curso === curso).map((i) => i.nombre);

    expect(competencia.nombre).toBe(nombre);
    expect(competencia.habilitada).toBe(habilitada === "Sí");
    expect(nombresDe(CURSOS[0])).toEqual(nombresCelda(psico));
    expect(nombresDe(CURSOS[1])).toEqual(nombresCelda(semi));
  });
});

describe("equipos por jornada", () => {
  it("cada equipo tiene una jornada válida", () => {
    for (const e of EQUIPOS) expect(esJornada(e.jornada)).toBe(true);
  });

  it("los ids de integrantes son únicos entre jornadas (las claves de borrador no chocan)", () => {
    expect(duplicados(integrantes.map((i) => i.id))).toEqual([]);
  });

  it("Adaptabilidad de mañana tiene 7 evaluadores y obtenerEvaluador respeta equipo y jornada", () => {
    expect(equipoDeCompetencia("manana", "adaptabilidad")?.integrantes).toHaveLength(7);
    expect(obtenerEvaluador("manana", "adaptabilidad", "jimena-salgado")?.nombre).toBe("Jimena Salgado");
    expect(obtenerEvaluador("manana", "adaptabilidad", "felipe-lopez")).toBeUndefined();
    expect(obtenerEvaluador("noche", "adaptabilidad", "jimena-salgado")).toBeUndefined();
  });

  it("la numeración de equipos depende de la jornada (Adaptabilidad: Equipo 4 de mañana, Equipo 1 de noche)", () => {
    const numeracion = (jornada: JornadaId) =>
      EQUIPOS.filter((e) => e.jornada === jornada)
        .sort((a, b) => a.numero - b.numero)
        .map((e) => [e.numero, e.competenciaId]);
    expect(numeracion("manana")).toEqual([
      [1, "pensamiento-critico"],
      [2, "autorregulacion-emocional"],
      [3, "orientacion-detalle"],
      [4, "adaptabilidad"],
      [5, "orientacion-resultados"],
    ]);
    expect(numeracion("noche")).toEqual([
      [1, "adaptabilidad"],
      [2, "autorregulacion-emocional"],
      [3, "pensamiento-critico"],
      [4, "orientacion-detalle"],
      [5, "orientacion-resultados"],
    ]);

    const manana = equipoDeCompetencia("manana", "adaptabilidad")!;
    const noche = equipoDeCompetencia("noche", "adaptabilidad")!;
    expect([manana.numero, manana.integrantes.length]).toEqual([4, 7]);
    expect([noche.numero, noche.integrantes.length]).toEqual([1, 7]);
    // Joined night Adaptabilidad in v1.17 (PRD Appendix B).
    expect(obtenerEvaluador("noche", "adaptabilidad", "brenda-alfaro-torres")?.curso).toBe(CURSOS[1]);
    expect(obtenerEvaluador("manana", "adaptabilidad", "brenda-alfaro-torres")).toBeUndefined();
    // Removed from the roster in v1.15 (PRD Appendix B).
    for (const retirado of ["sebastian-chaves", "emmanuel-reyes"]) {
      expect(EQUIPOS.some((e) => e.integrantes.some((i) => i.id === retirado))).toBe(false);
    }
    expect(obtenerEvaluador("noche", "adaptabilidad", "gabriela-salgado")?.nombre).toBe("Gabriela Salgado");
    expect(obtenerEvaluador("manana", "adaptabilidad", "gabriela-salgado")).toBeUndefined();
  });

  it("los números de equipo no se repiten dentro de una jornada", () => {
    for (const jornada of IDS_JORNADA) {
      expect(duplicados(EQUIPOS.filter((e) => e.jornada === jornada).map((e) => String(e.numero)))).toEqual([]);
    }
  });

  it("un equipo sin integrantes no habilita la competencia en esa jornada", () => {
    for (const jornada of IDS_JORNADA) {
      const conIntegrantes = EQUIPOS.some(
        (e) => e.jornada === jornada && e.competenciaId === "adaptabilidad" && e.integrantes.length > 0,
      );
      expect(competenciaDisponible(jornada, "adaptabilidad")).toBe(conIntegrantes);
      expect(equipoDeCompetencia(jornada, "adaptabilidad") !== undefined).toBe(conIntegrantes);
    }
  });
});

describe("participantes", () => {
  it("la lista de respaldo por defecto es P01…P20, sin nombres", () => {
    expect(leerCantidadParticipantes(undefined)).toBe(CANTIDAD_PARTICIPANTES_PREDETERMINADA);
    expect(leerCantidadParticipantes("")).toBe(20);
    const respaldo = generarParticipantes(CANTIDAD_PARTICIPANTES_PREDETERMINADA);
    expect(respaldo).toHaveLength(20);
    const sinDatos = { nombre: null, carnet: null, grupo: null };
    expect(respaldo[0]).toEqual({ id: "P01", numero: 1, ...sinDatos, etiqueta: "Participante 01", etiquetaReporte: "Participante 01" });
    expect(respaldo[19]).toEqual({ id: "P20", numero: 20, ...sinDatos, etiqueta: "Participante 20", etiquetaReporte: "Participante 20" });
  });

  it("con nombre, la etiqueta es el nombre (recortado); vacío vuelve a «Participante NN»", () => {
    expect(crearParticipante(7, "  Ana Pérez ")).toEqual({
      id: "P07",
      numero: 7,
      nombre: "Ana Pérez",
      carnet: null,
      grupo: null,
      etiqueta: "Ana Pérez",
      etiquetaReporte: "Participante 07",
    });
    expect(crearParticipante(7, "   ")).toMatchObject({ nombre: null, etiqueta: "Participante 07" });
  });

  it("el grupo (v1.8) se guarda si está en 1…20; si no, queda sin grupo", () => {
    expect(crearParticipante(7, "Ana", null, 3).grupo).toBe(3);
    expect(crearParticipante(7, "Ana", null, 21).grupo).toBeNull();
    expect(crearParticipante(7, "Ana", null, 0).grupo).toBeNull();
    expect(crearParticipante(7, "Ana").grupo).toBeNull();
  });

  it("la etiqueta de los reportes es el carné (recortado), nunca el nombre", () => {
    expect(crearParticipante(7, "Ana Pérez", " 100000001 ")).toMatchObject({
      nombre: "Ana Pérez",
      carnet: "100000001",
      etiqueta: "Ana Pérez",
      etiquetaReporte: "1-0000-0001",
    });
    expect(crearParticipante(7, "Ana Pérez", "  ")).toMatchObject({ carnet: null, etiquetaReporte: "Participante 07" });
  });

  it("una cédula de 9 dígitos se muestra «0-0000-0000»; otros carnés, tal cual (v1.9)", () => {
    expect(formatearCarnet("100000001")).toBe("1-0000-0001");
    expect(formatearCarnet("512345678")).toBe("5-1234-5678");
    expect(formatearCarnet("5-1234-5678")).toBe("5-1234-5678");
    expect(formatearCarnet(" 5 1234 5678 ")).toBe("5-1234-5678");
    for (const otro of ["155800000001", "A-12345", "DIMEX1234567", "12345678", "1234567890"]) {
      expect(formatearCarnet(otro)).toBe(otro);
    }
    expect(crearParticipante(1, null, "155800000001").etiquetaReporte).toBe("155800000001");
  });

  it("una cédula con guiones o espacios se guarda como sus 9 dígitos (v1.9)", () => {
    expect(normalizarCarnet("1-0000-0001")).toBe("100000001");
    expect(normalizarCarnet(" 100000001 ")).toBe("100000001");
    expect(normalizarCarnet("A-12345")).toBe("A-12345");
    expect(normalizarCarnet("1-2345")).toBe("1-2345");
  });

  it("carnés: números, letras y guiones, hasta 20 caracteres; vacío es válido (sin carné)", () => {
    for (const carnet of ["", "100000001", "100000004", "A-12345", "DIMEX1234567"]) expect(esCarnetValido(carnet)).toBe(true);
    for (const carnet of ["50 47", "ana@x", "1".repeat(21), "100000001;", "<b>"]) expect(esCarnetValido(carnet)).toBe(false);
  });

  it("reconoce ids P01…P99 y nada más", () => {
    for (const id of ["P01", "P20", "P99"]) expect(esIdParticipante(id)).toBe(true);
    for (const id of ["P00", "P1", "P100", "p01", "X01", "P0a", ""]) expect(esIdParticipante(id)).toBe(false);
  });

  it("solo nombres: sin correos, teléfonos ni caracteres de control", () => {
    expect(esNombreValido("María Guadalupe Núñez Arguedas")).toBe(true);
    expect(esNombreValido("")).toBe(true); // no name
    expect(esNombreValido("Grupo 2 · Ana")).toBe(true); // a few digits are fine
    expect(esNombreValido("ana@correo.com")).toBe(false);
    expect(esNombreValido("+506 8888 1234")).toBe(false);
    expect(esNombreValido("Ana\tPérez")).toBe(false);
    expect(esNombreValido("a".repeat(81))).toBe(false);
  });

  it("respeta CANTIDAD_PARTICIPANTES válida", () => {
    expect(leerCantidadParticipantes("12")).toBe(12);
    expect(generarParticipantes(12).map((p) => p.id).at(-1)).toBe("P12");
  });

  it.each(["0", "-3", "4.5", "abc", "100"])("rechaza %j", (valor) => {
    expect(() => leerCantidadParticipantes(valor)).toThrow(/CANTIDAD_PARTICIPANTES/);
  });
});
