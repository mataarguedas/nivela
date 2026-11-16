import { describe, expect, it } from "vitest";
import { codigoVerificacion } from "@/lib/correos/codigoVerificacion";
import { escaparHtml } from "@/lib/correos/plantilla";

// Email templates (PRD §13 Email, Appendix C "Correo de código").

describe("codigoVerificacion", () => {
  const correo = codigoVerificacion({ codigo: "482913", minutos: 10 });

  it("versión de texto (instantánea)", () => {
    expect(correo.texto).toMatchInlineSnapshot(`
      "Su código de verificación

      Su código de Nivela es 482913. Vence en 10 minutos. Si usted no lo solicitó, ignore este mensaje.

      Nivela · Evaluación de competencias entre pares
      "
    `);
  });

  it("el asunto no lleva el código", () => {
    expect(correo.asunto).toBe("Código de verificación de Nivela");
    expect(correo.asunto).not.toContain("482913");
  });

  it("HTML apto para correo: tabla, estilos en línea, sin <style>, imágenes ni scripts, solo modo claro", () => {
    expect(correo.html).toMatch(/^<!doctype html>/);
    expect(correo.html).toContain('<html lang="es-CR">');
    expect(correo.html).toContain('role="presentation"');
    expect(correo.html).toContain('<meta name="color-scheme" content="light">');
    expect(correo.html).not.toMatch(/<style|<img|<script|<link/i);
    expect(correo.html).toContain("482913");
    expect(correo.html).toContain("Si usted no lo solicitó, ignore este mensaje.");
  });

  it("como mucho un botón primario #0071e3 (este correo no tiene ninguno) y sin sombras", () => {
    expect((correo.html.match(/#0071e3/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect(correo.html).not.toMatch(/box-shadow/i);
  });

  it("singular para un minuto", () => {
    expect(codigoVerificacion({ codigo: "000001", minutos: 1 }).texto).toContain("Vence en 1 minuto.");
  });

  it("rechaza códigos que no son de 6 dígitos", () => {
    expect(() => codigoVerificacion({ codigo: "12345", minutos: 10 })).toThrow();
    expect(() => codigoVerificacion({ codigo: "<b>12</b>", minutos: 10 })).toThrow();
  });
});

describe("escaparHtml", () => {
  it("escapa los caracteres especiales de HTML", () => {
    expect(escaparHtml(`<a href="x">Tom & 'Ana'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Ana&#39;&lt;/a&gt;");
  });
});
