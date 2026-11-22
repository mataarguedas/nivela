import { describe, expect, it } from "vitest";
import { leerMatricula, mismoNombre, planificarMatricula, type FilaConCorreo } from "@/lib/matricula";

// Fake names, carnets and emails only (CLAUDE.md rule 5).

const LISTA = `                                    Listado de Alumnos Matriculados

                                      III Cuatrimestre (2026)

Materia: COFI-999 - CURSO DE PRUEBA Grupo: 1

         Profesor: DOCENTE DE PRUEBA  V 800 1159

# Carné  Nombre del Estudiante                     Correo                        Firma

100000001 MORA SOLIS ANA LUCIA                     anmora@ejemplo.test

100000002 CHAVES PEREZ BRUNO                       brchaves@ejemplo.test

155800000003 NUÑEZ ROJAS MARIA DE LOS ANGE          manunez@ejemplo.test

100000004 VARGAS SOTO CARLA                        cavargas@ejemplo.
`;

function fila(numero: number, nombre: string | null, extra: Partial<FilaConCorreo> = {}): FilaConCorreo {
  return { numero, nombre, carnet: null, grupo: null, activo: true, tieneCorreo: false, correo: null, ...extra };
}

const GUARDADAS = [
  fila(1, "Bruno Chaves Pérez"),
  fila(2, "Ana Lucía Mora Solís"),
  fila(3, "María de los Ángeles Núñez Rojas"),
  fila(4, "Carla Vargas Soto", { correo: "carla@ejemplo.test", tieneCorreo: true }),
];

describe("leerMatricula", () => {
  it("lee carné, nombre y correo de cada fila e ignora encabezados", () => {
    const { estudiantes, errores } = leerMatricula(LISTA, "lista.pdf");
    expect(errores).toEqual([]);
    expect(estudiantes.map((e) => [e.carnet, e.nombreLista, e.correo, e.posicion])).toEqual([
      ["100000001", "MORA SOLIS ANA LUCIA", "anmora@ejemplo.test", "lista.pdf, línea 1"],
      ["100000002", "CHAVES PEREZ BRUNO", "brchaves@ejemplo.test", "lista.pdf, línea 2"],
      ["155800000003", "NUÑEZ ROJAS MARIA DE LOS ANGE", "manunez@ejemplo.test", "lista.pdf, línea 3"],
      ["100000004", "VARGAS SOTO CARLA", null, "lista.pdf, línea 4"],
    ]);
  });

  it("avisa por posición, sin el nombre, de un correo cortado o ausente", () => {
    const { avisos } = leerMatricula(`${LISTA}\n100000005 ROJAS ROJAS DIANA\n`, "lista.pdf");
    expect(avisos).toEqual([
      "lista.pdf, línea 4: el correo está incompleto o no es válido; no se importa.",
      "lista.pdf, línea 5: no tiene correo.",
    ]);
    expect(avisos.join(" ")).not.toMatch(/VARGAS|ROJAS/);
  });

  it("un texto sin filas es un error", () => {
    expect(leerMatricula("Listado de Alumnos Matriculados\n", "vacia.pdf").errores).toHaveLength(1);
  });
});

describe("mismoNombre", () => {
  it("ignora orden, tildes y mayúsculas, y acepta el nombre cortado al final", () => {
    expect(mismoNombre("MORA SOLIS ANA LUCIA", "Ana Lucía Mora Solís")).toBe(true);
    expect(mismoNombre("NUÑEZ ROJAS MARIA DE LOS ANGE", "María de los Ángeles Núñez Rojas")).toBe(true);
    expect(mismoNombre("MORA SOLIS ANA", "Ana Lucía Mora Solís")).toBe(true);
  });

  it("no confunde personas distintas", () => {
    expect(mismoNombre("MORA SOLIS ANA LUCIA", "Ana Lucía Mora Rojas")).toBe(false);
    expect(mismoNombre("MORA SOLIS ANA LUCIA", "Ana Mora Solís")).toBe(false);
    expect(mismoNombre("MORA ANA", "Ana Lucía Mora Solís")).toBe(false);
  });
});

describe("planificarMatricula", () => {
  const { estudiantes } = leerMatricula(LISTA, "lista.pdf");

  it("asigna carné y correo por nombre, sin cambiar el orden; un correo cortado deja el guardado", () => {
    const plan = planificarMatricula(estudiantes, GUARDADAS);
    expect(plan).toEqual({
      modo: "asignar",
      cambios: [
        { numero: 1, carnet: "100000002", correo: "brchaves@ejemplo.test" },
        { numero: 2, carnet: "100000001", correo: "anmora@ejemplo.test" },
        { numero: 3, carnet: "155800000003", correo: "manunez@ejemplo.test" },
        { numero: 4, carnet: "100000004", correo: null },
      ],
      carnetsNuevos: 4,
      carnetsCambiados: 0,
      correosNuevos: 3,
      sinCoincidencia: 0,
    });
  });

  it("cuenta los participantes activos que ninguna fila nombra", () => {
    const plan = planificarMatricula(estudiantes, [...GUARDADAS, fila(5, "Diana Rojas Rojas"), fila(6, "Oculta", { activo: false })]);
    expect(plan).toMatchObject({ modo: "asignar", sinCoincidencia: 1 });
  });

  it("cuenta como cambio un carné distinto, pero no la misma cédula escrita con guiones", () => {
    const filas = GUARDADAS.map((f) =>
      f.numero === 1 ? { ...f, carnet: "1-0000-0002" } : f.numero === 2 ? { ...f, carnet: "999999999" } : f,
    );
    expect(planificarMatricula(estudiantes, filas)).toMatchObject({ carnetsNuevos: 2, carnetsCambiados: 1 });
  });

  it("se detiene, por posición y sin nombres, si una fila no coincide o coincide con varios", () => {
    const sinBruno = planificarMatricula(estudiantes, GUARDADAS.filter((f) => f.numero !== 1));
    expect(sinBruno).toEqual({
      modo: "error",
      errores: ["lista.pdf, línea 2: no coincide con ningún nombre de la lista guardada."],
    });
    const repetida = planificarMatricula(estudiantes, [...GUARDADAS, fila(5, "Bruno Chaves Pérez")]);
    expect(repetida).toMatchObject({ modo: "error", errores: ["lista.pdf, línea 2: coincide con varios participantes de la lista guardada."] });
  });

  it("se detiene si el carné ya es de otro participante o se repite en las listas", () => {
    const ocupado = planificarMatricula(estudiantes, [...GUARDADAS, fila(9, "Otra Persona", { activo: false, carnet: "100000001" })]);
    expect(ocupado).toEqual({ modo: "error", errores: ["lista.pdf, línea 1: el carné ya lo tiene el participante 09."] });
    const doble = planificarMatricula([...estudiantes, { ...estudiantes[0], posicion: "otra.pdf, línea 1" }], GUARDADAS);
    expect(doble).toEqual({ modo: "error", errores: ["otra.pdf, línea 1: el carné ya está en lista.pdf, línea 1."] });
  });

  it("exige que la lista guardada ya tenga nombres", () => {
    expect(planificarMatricula(estudiantes, [fila(1, null)]).modo).toBe("error");
  });
});
