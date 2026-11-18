import { buscarIntegrante } from "@/config/equipos";
import { esquemaCorreo } from "./validacion";

// Validation for `npm run cuentas:importar` (PRD §5.12): the gitignored CSV
// `integranteId,correo`, one row per evaluator. Pure, so it is unit-tested
// without a database. Messages name the line and the reason, never the
// email itself: the script prints them to a terminal that may be shared.

export type FilaImportacion = { linea: number; integranteId: string; correo: string };

export type ResultadoImportacion =
  | { ok: true; filas: FilaImportacion[]; sinCorreo: string[] }
  | { ok: false; errores: string[] };

const ENCABEZADO = ["integranteid", "correo"];

export function validarCsvCuentas(texto: string): ResultadoImportacion {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const errores: string[] = [];
  const filas: FilaImportacion[] = [];
  const sinCorreo: string[] = [];
  const ids = new Set<string>();
  const correos = new Map<string, number>();

  const encabezado = (lineas[0] ?? "").split(",").map((c) => c.trim().toLowerCase());
  if (encabezado.length !== 2 || encabezado.some((c, i) => c !== ENCABEZADO[i])) {
    return { ok: false, errores: ["Línea 1: el encabezado debe ser «integranteId,correo»."] };
  }

  lineas.slice(1).forEach((linea, i) => {
    const numero = i + 2;
    if (linea.trim() === "") return;
    const columnas = linea.split(",");
    if (columnas.length !== 2) {
      errores.push(`Línea ${numero}: debe tener exactamente dos columnas.`);
      return;
    }
    const integranteId = columnas[0].trim();
    const crudo = columnas[1].trim();

    if (!buscarIntegrante(integranteId)) {
      errores.push(`Línea ${numero}: «${integranteId}» no es un integrante de la configuración.`);
      return;
    }
    if (ids.has(integranteId)) {
      errores.push(`Línea ${numero}: «${integranteId}» está repetido.`);
      return;
    }
    ids.add(integranteId);

    if (crudo === "") {
      sinCorreo.push(integranteId);
      return;
    }
    const correo = esquemaCorreo.safeParse(crudo);
    if (!correo.success) {
      errores.push(`Línea ${numero}: el correo de «${integranteId}» no es válido.`);
      return;
    }
    const previa = correos.get(correo.data);
    if (previa !== undefined) {
      errores.push(`Línea ${numero}: el correo de «${integranteId}» repite el de la línea ${previa}.`);
      return;
    }
    correos.set(correo.data, numero);
    filas.push({ linea: numero, integranteId, correo: correo.data });
  });

  return errores.length > 0 ? { ok: false, errores } : { ok: true, filas, sinCorreo };
}
