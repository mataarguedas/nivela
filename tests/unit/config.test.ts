import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPETENCIAS, obtenerCompetencia, obtenerCompetenciaHabilitada } from "@/config/competencias";
import { CURSOS, EQUIPOS, equipoDeCompetencia, obtenerEvaluador } from "@/config/equipos";
import { NIVELES } from "@/config/niveles";
import {
  CANTIDAD_PARTICIPANTES_PREDETERMINADA,
  crearParticipante,
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

const indicadores = COMPETENCIAS.flatMap((c) => c.indicadores);
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
    ["competencias", COMPETENCIAS.map((c) => c.id)],
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
    for (const c of COMPETENCIAS) expect(reservados).not.toContain(c.id);
  });

  it("son las 5 del PRD y solo Adaptabilidad está habilitada", () => {
    expect(COMPETENCIAS).toHaveLength(5);
    expect(COMPETENCIAS.filter((c) => c.habilitada).map((c) => c.id)).toEqual(["adaptabilidad"]);
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
    for (const c of COMPETENCIAS) {
      expect(c.indicadores.map((i) => i.numero)).toEqual(c.indicadores.map((_, i) => i + 1));
    }
  });

  it.each(COMPETENCIAS.filter((c) => c.habilitada).map((c) => [c.id, c] as const))(
    "%s (habilitada) tiene equipo, definición, fuente e indicadores",
    (id, c) => {
      expect(equipoDeCompetencia(id)?.integrantes.length).toBeGreaterThan(0);
      expect(c.definicion.trim()).not.toBe("");
      expect(c.fuente.trim()).not.toBe("");
      expect(c.indicadores.length).toBeGreaterThanOrEqual(1);
    },
  );

  it("las deshabilitadas no tienen indicadores todavía", () => {
    for (const c of COMPETENCIAS.filter((c) => !c.habilitada)) expect(c.indicadores).toEqual([]);
  });

  it("obtenerCompetenciaHabilitada ignora las deshabilitadas", () => {
    expect(obtenerCompetenciaHabilitada("adaptabilidad")?.id).toBe("adaptabilidad");
    expect(obtenerCompetencia("orientacion-detalle")?.id).toBe("orientacion-detalle");
    expect(obtenerCompetenciaHabilitada("orientacion-detalle")).toBeUndefined();
    expect(obtenerCompetenciaHabilitada("no-existe")).toBeUndefined();
  });
});

describe("Adaptabilidad coincide con PRD Apéndice A", () => {
  const apendice = seccion("## Appendix A", "## Appendix B");
  const adaptabilidad = obtenerCompetencia("adaptabilidad")!;

  it("definición y fuente", () => {
    expect(adaptabilidad.definicion).toBe(apendice.match(/\*\*Definición:\*\* (.+)/)?.[1].trim());
    expect(adaptabilidad.fuente).toBe(apendice.match(/\*\*Fuente:\*\* (.+)/)?.[1].trim());
  });

  it("4 indicadores × 4 niveles, texto exacto", () => {
    const bloques = [...apendice.matchAll(/\*\*Indicador (\d)\. (.+?)\*\*\n((?:- .+\n?){4})/g)];
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
    expect(
      adaptabilidad.indicadores.map(({ numero, titulo, niveles }) => ({ numero, titulo, niveles })),
    ).toEqual(esperado);
  });
});

describe("equipos coinciden con PRD Apéndice B", () => {
  const filas = seccion("## Appendix B", "## Appendix C")
    .split("\n")
    .filter((linea) => /^\| \**\d/.test(linea))
    .map((linea) =>
      linea
        .split("|")
        .slice(1, -1)
        .map((celda) => celda.replaceAll("**", "").trim()),
    );

  it("hay 5 equipos, uno por competencia", () => {
    expect(filas).toHaveLength(5);
    expect(EQUIPOS).toHaveLength(5);
    expect(duplicados(EQUIPOS.map((e) => e.competenciaId))).toEqual([]);
    for (const e of EQUIPOS) expect(obtenerCompetencia(e.competenciaId)).toBeDefined();
  });

  it.each(filas.map((f) => [f[0], f] as const))("equipo %s", (numero, [, nombre, habilitada, psico, semi]) => {
    const equipo = EQUIPOS.find((e) => e.numero === Number(numero))!;
    const competencia = obtenerCompetencia(equipo.competenciaId)!;
    const nombresDe = (curso: string) =>
      equipo.integrantes.filter((i) => i.curso === curso).map((i) => i.nombre);

    expect(competencia.nombre).toBe(nombre);
    expect(competencia.habilitada).toBe(habilitada === "Sí");
    expect(nombresDe(CURSOS[0])).toEqual(psico.split(", "));
    expect(nombresDe(CURSOS[1])).toEqual(semi.split(", "));
  });

  it("Adaptabilidad tiene 8 evaluadores y obtenerEvaluador respeta el equipo", () => {
    expect(equipoDeCompetencia("adaptabilidad")?.integrantes).toHaveLength(8);
    expect(obtenerEvaluador("adaptabilidad", "jimena-salgado")?.nombre).toBe("Jimena Salgado");
    expect(obtenerEvaluador("adaptabilidad", "felipe-lopez")).toBeUndefined();
  });
});

describe("participantes", () => {
  it("la lista de respaldo por defecto es P01…P20, sin nombres", () => {
    expect(leerCantidadParticipantes(undefined)).toBe(CANTIDAD_PARTICIPANTES_PREDETERMINADA);
    expect(leerCantidadParticipantes("")).toBe(20);
    const respaldo = generarParticipantes(CANTIDAD_PARTICIPANTES_PREDETERMINADA);
    expect(respaldo).toHaveLength(20);
    expect(respaldo[0]).toEqual({ id: "P01", numero: 1, nombre: null, etiqueta: "Participante 01" });
    expect(respaldo[19]).toEqual({ id: "P20", numero: 20, nombre: null, etiqueta: "Participante 20" });
  });

  it("con nombre, la etiqueta es el nombre (recortado); vacío vuelve a «Participante NN»", () => {
    expect(crearParticipante(7, "  Ana Pérez ")).toEqual({ id: "P07", numero: 7, nombre: "Ana Pérez", etiqueta: "Ana Pérez" });
    expect(crearParticipante(7, "   ")).toEqual({ id: "P07", numero: 7, nombre: null, etiqueta: "Participante 07" });
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
