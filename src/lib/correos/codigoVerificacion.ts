import { COLORES_CORREO, documentoCorreo, escaparHtml, parrafo, PIE_TEXTO, type PlantillaCorreo } from "./plantilla";

// Verification code email (PRD §5.12, Appendix C "Correo de código"): sent on
// first activation and for "¿Olvidó su contraseña?". The code is not in the
// subject, so it doesn't show in lock-screen previews of the subject line.

export const PLANTILLA_CODIGO = "codigoVerificacion";

export const TEXTOS_CODIGO = {
  asunto: "Código de verificación de Nivela",
  titulo: "Su código de verificación",
  mensaje: (codigo: string, minutos: number) =>
    `Su código de Nivela es ${codigo}. Vence en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}. Si usted no lo solicitó, ignore este mensaje.`,
} as const;

export function codigoVerificacion({ codigo, minutos }: { codigo: string; minutos: number }): PlantillaCorreo {
  if (!/^\d{6}$/.test(codigo)) throw new Error("The verification code must be 6 digits.");
  const mensaje = TEXTOS_CODIGO.mensaje(codigo, minutos);
  const c = COLORES_CORREO;

  // Digits spaced for reading; the copyable text stays in the sentence below.
  const destacado = `<p style="margin:0 0 24px 0;padding:16px 0;text-align:center;font-size:36px;line-height:1;font-weight:600;letter-spacing:8px;color:${c.tinta};background:${c.lienzo};border-radius:12px;">${escaparHtml(codigo)}</p>`;

  return {
    asunto: TEXTOS_CODIGO.asunto,
    html: documentoCorreo({
      titulo: TEXTOS_CODIGO.titulo,
      contenido: destacado + parrafo(escaparHtml(mensaje), "margin-bottom:0;"),
    }),
    texto: `${TEXTOS_CODIGO.titulo}\n\n${mensaje}\n\n${PIE_TEXTO}\n`,
  };
}
