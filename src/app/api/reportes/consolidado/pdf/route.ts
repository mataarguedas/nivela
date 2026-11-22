import { NextResponse } from "next/server";
import { z } from "zod";
import { esIdParticipante } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import { TEXTOS_ENVIO } from "@/config/textosReportes";
import { cargarContextoEnvio, pdfParaParticipante } from "@/lib/envioResultados";
import { registrarError } from "@/lib/registro";
import { getSesion } from "@/lib/sesion";

// GET /api/reportes/consolidado/pdf?participante=P01 (PRD §10, §5.14 v1.16):
// the participant's general report as a PDF, exactly the file their results
// email attaches, so the docente can check it before sending or print it for
// someone without an email. Docente only (re-verified here, not only in
// proxy.ts), the session's jornada only: everything is recomputed on the
// server. The file is named by the report label (carnet or "Participante
// NN"), never by name, and is never cached. Nothing about it is logged.

// Runs on Node.js, the default (see api/acceso/route.ts on `runtime`).

const RUTA = "/api/reportes/consolidado/pdf";
const SIN_CACHE = { "Cache-Control": "no-store" };
const consulta = z.object({ participante: z.string().trim().refine(esIdParticipante) });

function responderError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: SIN_CACHE });
}

/** "1-0000-0001" or "participante-07": safe in a Content-Disposition filename. */
function parteArchivo(etiqueta: string): string {
  return (
    etiqueta
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "participante"
  );
}

export async function GET(request: Request) {
  const sesion = await getSesion();
  if (!sesion) return responderError(TEXTOS.sesion.requerida, 401);
  if (sesion.rol !== "docente") return responderError(TEXTOS.sesion.soloDocente, 403);

  const parametros = consulta.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parametros.success) return responderError(TEXTOS_ENVIO.pdfParticipante, 400);
  const { participante } = parametros.data;

  const inicio = Date.now();
  try {
    const contexto = await cargarContextoEnvio(sesion.jornada);
    const fila = contexto.consolidado.participantes.find((p) => p.id === participante);
    const pdf = fila ? await pdfParaParticipante(contexto, participante) : null;
    if (!fila || !pdf) return responderError(TEXTOS_ENVIO.sinEvaluaciones, 404);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        ...SIN_CACHE,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nivela-reporte-general-${parteArchivo(fila.etiqueta)}.pdf"`,
      },
    });
  } catch (error) {
    registrarError(RUTA, "GET", inicio, error);
    return responderError(TEXTOS_ENVIO.pdfError, 500);
  }
}
