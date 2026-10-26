import "server-only";

// Error log line for route handlers and report pages: only the route, method,
// status, latency and the driver's error code. Never the request body or the
// error message: Drizzle's "Failed query" message embeds the query
// parameters, i.e. observation text.

function codigoDe(valor: unknown): string | undefined {
  return typeof valor === "object" && valor !== null && "code" in valor ? String(valor.code) : undefined;
}

export function registrarError(ruta: string, metodo: string, inicio: number, error: unknown) {
  const causa = error instanceof Error ? error.cause : undefined;
  console.error(
    JSON.stringify({
      ruta,
      metodo,
      status: 500,
      ms: Date.now() - inicio,
      codigo: codigoDe(error) ?? codigoDe(causa) ?? (error instanceof Error ? error.name : "desconocido"),
    }),
  );
}
