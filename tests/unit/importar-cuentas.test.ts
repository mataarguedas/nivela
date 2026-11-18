import { describe, expect, it } from "vitest";
import { equipoDeCompetencia } from "@/config/equipos";
import { validarCsvCuentas } from "@/lib/importarCuentas";

// Validation of the evaluator email CSV (`npm run cuentas:importar`,
// PRD §5.12). Fake addresses only; messages never repeat an email.

const [A, B] = equipoDeCompetencia("noche", "adaptabilidad")!.integrantes.map((i) => i.id);
const C = equipoDeCompetencia("manana", "adaptabilidad")!.integrantes[0].id;

describe("validarCsvCuentas", () => {
  it("acepta el CSV, recorta y pasa a minúsculas, y separa las filas sin correo", () => {
    const resultado = validarCsvCuentas(`﻿integranteId,correo\r\n${A}, Ana.Perez@Ejemplo.TEST \n${B},\n\n${C},c@ejemplo.test\n`);
    expect(resultado).toEqual({
      ok: true,
      filas: [
        { linea: 2, integranteId: A, correo: "ana.perez@ejemplo.test" },
        { linea: 5, integranteId: C, correo: "c@ejemplo.test" },
      ],
      sinCorreo: [B],
    });
  });

  it("exige el encabezado", () => {
    expect(validarCsvCuentas(`id,email\n${A},a@ejemplo.test`)).toEqual({
      ok: false,
      errores: ["Línea 1: el encabezado debe ser «integranteId,correo»."],
    });
  });

  it("rechaza integrantes desconocidos o repetidos, correos inválidos o repetidos, sin mostrar el correo", () => {
    const resultado = validarCsvCuentas(
      [
        "integranteId,correo",
        "nadie,x@ejemplo.test",
        `${A},a@ejemplo.test`,
        `${A},otra@ejemplo.test`,
        `${B},b@gmal`,
        `${C},A@ejemplo.test`,
        `${C}`,
      ].join("\n"),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores).toEqual([
      "Línea 2: «nadie» no es un integrante de la configuración.",
      `Línea 4: «${A}» está repetido.`,
      `Línea 5: el correo de «${B}» no es válido.`,
      `Línea 6: el correo de «${C}» repite el de la línea 3.`,
      "Línea 7: debe tener exactamente dos columnas.",
    ]);
    expect(resultado.errores.join(" ")).not.toMatch(/@/);
  });
});
