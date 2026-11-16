// Sends one verification-code email with a fake code through Resend, to check
// real delivery (inbox vs. spam) at an @est.utn.ac.cr address and at Gmail
// before students depend on it (PRD §13 Email).
//
//   npm run correo:prueba -- --para <correo>
//
// Uses RESEND_API_KEY and CORREO_REMITENTE from .env.local / .env and always
// sends through Resend, whatever CORREO_MODO says. Run through
// `tsx --conditions=react-server` so the `server-only` guard resolves.

for (const archivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(archivo);
  } catch {
    // File not present: fine.
  }
}

const CODIGO_DE_PRUEBA = "123456";

const AYUDA: Record<string, string> = {
  rechazado:
    "Resend lo rechazó: revise que el dominio de CORREO_REMITENTE esté verificado en Resend, que la clave sea válida y que la dirección exista.",
  limite: "Resend aplicó su límite de envío. Intente de nuevo en unos minutos.",
  red: "No hubo respuesta de Resend en 10 s (red o tiempo de espera).",
  desconocido: "Falta RESEND_API_KEY o CORREO_REMITENTE, o Resend respondió algo inesperado.",
};

async function main() {
  const indice = process.argv.indexOf("--para");
  const para = indice >= 0 ? process.argv[indice + 1]?.trim() : undefined;
  if (!para || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) {
    console.error("Uso: npm run correo:prueba -- --para <correo>");
    process.exit(2);
  }

  process.env.CORREO_MODO = "resend";
  const { enviarCorreo, ErrorCorreo } = await import("../src/lib/correo");
  const { codigoVerificacion, PLANTILLA_CODIGO } = await import("../src/lib/correos/codigoVerificacion");

  const plantilla = codigoVerificacion({ codigo: CODIGO_DE_PRUEBA, minutos: 10 });
  const remitente = process.env.CORREO_REMITENTE ?? "(sin CORREO_REMITENTE)";
  console.log(`Enviando un correo de prueba desde ${remitente}…`);
  try {
    const { id } = await enviarCorreo({
      plantilla: PLANTILLA_CODIGO,
      para,
      asunto: `${plantilla.asunto} (prueba)`,
      html: plantilla.html,
      texto: plantilla.texto,
    });
    console.log(`Enviado. Id de Resend: ${id}. Revise la bandeja de entrada y la carpeta de correo no deseado.`);
  } catch (error) {
    if (error instanceof ErrorCorreo) {
      console.error(`${error.message} ${AYUDA[error.tipo] ?? ""}`);
      process.exit(1);
    }
    throw error;
  }
}

void main();

// A module, not a script: keeps `main` out of the global scope shared with seed.ts.
export {};
