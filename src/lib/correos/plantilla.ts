import { TEXTOS } from "@/config/textos";

// Shared shell for every Nivela email (PRD §13 Email). Email clients ignore
// <style> blocks and modern CSS, so: table layout, inline styles only, the
// system font stack, DESIGN.md colors, no images (nothing to block, no Apple
// marks), light mode only. Each template also returns a plain-text version.

export type PlantillaCorreo = { asunto: string; html: string; texto: string };

export const COLORES_CORREO = {
  lienzo: "#f5f5f7",
  superficie: "#ffffff",
  tinta: "#1d1d1f",
  tinta2: "#707070",
  linea: "#d6d6d6",
  primario: "#0071e3",
} as const;

const FUENTE = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

/** Escapes text for HTML element content and attribute values. */
export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** A paragraph of body text; `html` is trusted markup built by the caller. */
export function parrafo(html: string, estilo = ""): string {
  return `<p style="margin:0 0 16px 0;font-size:17px;line-height:1.47;color:${COLORES_CORREO.tinta};${estilo}">${html}</p>`;
}

/**
 * The full document: canvas, a white card with `contenido` (trusted HTML), and
 * a footer with the app name. `titulo` is plain text (escaped here).
 */
export function documentoCorreo({ titulo, contenido }: { titulo: string; contenido: string }): string {
  const c = COLORES_CORREO;
  return `<!doctype html>
<html lang="es-CR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escaparHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${c.lienzo};font-family:${FUENTE};color:${c.tinta};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${c.lienzo};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px 4px;font-size:17px;font-weight:600;color:${c.tinta};">${escaparHtml(TEXTOS.app.nombre)}</td></tr>
<tr><td style="background:${c.superficie};border-radius:12px;padding:32px 24px;">
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.2;font-weight:600;color:${c.tinta};">${escaparHtml(titulo)}</h1>
${contenido}
</td></tr>
<tr><td style="padding:16px 4px 0 4px;font-size:12px;line-height:1.33;color:${c.tinta2};">${escaparHtml(TEXTOS.app.nombre)} · ${escaparHtml(TEXTOS.app.lema)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Footer line of every plain-text version. */
export const PIE_TEXTO = `${TEXTOS.app.nombre} · ${TEXTOS.app.lema}`;
