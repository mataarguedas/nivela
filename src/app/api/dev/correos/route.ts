import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { ultimoCorreoPara } from "@/lib/correo";

// Dev only (PRD §10): the newest "consola" email sent to `para`, so e2e tests
// can read verification codes without a real inbox. 404 in production, where
// emails go through Resend and nothing is kept. proxy.ts lets it through
// without a session outside production: the code is read before signing in.

const SIN_CACHE = { "Cache-Control": "no-store" };
const consulta = z.object({ para: z.string().trim().toLowerCase().pipe(z.email()) });

export async function GET(request: Request) {
  // Always per request: the outbox changes between calls (Cache Components
  // would otherwise prerender this handler).
  await connection();
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No encontrado." }, { status: 404, headers: SIN_CACHE });
  }

  const resultado = consulta.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!resultado.success) {
    return NextResponse.json({ error: "Indique un correo válido en ?para=." }, { status: 400, headers: SIN_CACHE });
  }

  const mensaje = ultimoCorreoPara(resultado.data.para);
  if (!mensaje) {
    return NextResponse.json({ error: "No hay correos para esa dirección." }, { status: 404, headers: SIN_CACHE });
  }
  const { id, plantilla, para, asunto, texto, html, enviadoEn } = mensaje;
  return NextResponse.json({ id, plantilla, para, asunto, texto, html, enviadoEn }, { headers: SIN_CACHE });
}
